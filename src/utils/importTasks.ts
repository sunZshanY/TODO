import { DEFAULT_CATEGORY } from "../constants";
import type { ImportDraft, Priority, Task, TaskType } from "../types";
import { pad } from "./date";

const PRIORITY_VALUES: ReadonlySet<string> = new Set(["high", "medium", "low"]);

function scanBalancedJson(text: string, start: number): string | null {
  const open = text[start];
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

export function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  if (cleaned) {
    try {
      return JSON.parse(cleaned);
    } catch {
      // 继续尝试从文本中提取
    }
  }
  const match = cleaned || text;
  const start = match.search(/[[{]/);
  if (start < 0) {
    throw new Error("未在 AI 返回中找到 JSON 数据");
  }
  const block = scanBalancedJson(match, start);
  if (!block) {
    throw new Error("AI 返回的 JSON 结构不完整");
  }
  return JSON.parse(block);
}

function normalizeDraft(raw: unknown): ImportDraft | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  if (!title) return null;

  const priority: Priority = PRIORITY_VALUES.has(String(o.priority))
    ? (o.priority as Priority)
    : "medium";

  const description =
    typeof o.description === "string" ? o.description.trim() : "";

  let dueDate: string | null =
    typeof o.dueDate === "string" && o.dueDate ? o.dueDate : null;
  if (dueDate) {
    const d = new Date(dueDate);
    if (Number.isNaN(d.getTime())) dueDate = null;
  }

  const category =
    typeof o.category === "string" && o.category.trim()
      ? o.category.trim()
      : DEFAULT_CATEGORY;

  const type: TaskType = o.type === "schedule" ? "schedule" : "list";

  const completed =
    typeof o.completed === "boolean" ? o.completed : undefined;

  return {
    title,
    description,
    priority,
    dueDate,
    category,
    type,
    completed,
  };
}

/** 从模型输出文本中解析出任务草稿（兼容 { tasks: [] } 与裸数组） */
export function extractDrafts(text: string): ImportDraft[] {
  let data: unknown;
  try {
    data = extractJson(text);
  } catch {
    return [];
  }
  const list = Array.isArray(data) ? data : (data as { tasks?: unknown })?.tasks;
  if (!Array.isArray(list)) return [];
  return list
    .map(normalizeDraft)
    .filter((d): d is ImportDraft => d !== null);
}

/** 按标题去除与已有任务重复的草稿 */
export function dedupeDrafts(
  drafts: ImportDraft[],
  existing: Task[],
): ImportDraft[] {
  const seen = new Set(existing.map((t) => t.title.trim().toLowerCase()));
  return drafts.filter((d) => {
    const key = d.title.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** 构造优化已解析任务列表的系统提示词（JSON 进 JSON 出） */
export function buildOptimizeSystem(existingTasks: Task[]): string {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate(),
  )}`;
  const titles = existingTasks.slice(0, 100).map((t) => `- ${t.title}`);
  return `你是待办计划优化助手。下面是一份已从 Markdown 解析出的待办任务列表（JSON 数组），请优化这份计划后返回优化结果。

输出要求：
1. 只输出一个 JSON 数组，不要输出任何解释、注释、前后缀文字，不要用 markdown 代码块包裹。
2. 数组每个元素与输入结构一致：
   {"title": "任务标题", "description": "补充说明，没有则留空字符串", "priority": "high|medium|low", "dueDate": "YYYY-MM-DD 或 null", "category": "类别/清单名", "type": "schedule 或 list", "completed": true 或 false}
3. 保持每条任务的 completed（完成状态）不变。
4. 优化标题：使其简短、明确、可独立执行；合并语义重复的任务；把过大或过杂的任务拆分为多个清晰子任务。
5. 完善优先级：重要且紧急为 high，一般规划为 medium，琐碎低优先为 low。
6. 若任务中出现相对时间（明天、后天、下周、月底等），请基于今天日期（${todayStr}）换算成具体 YYYY-MM-DD；没有明确时间的任务保持 dueDate 为 null，不要凭空编造截止日期。
7. 保留并优化 category 分组；type 按内容判定：含明确日期或日程安排为 schedule，否则为 list。
8. 避免生成与用户已有任务重复的任务，不要输出标题与下列已有任务相同或语义完全相同的任务：
${titles.length ? titles.join("\n") : "（当前没有已有任务）"}`;
}

/** 构造导入任务的系统提示词，注入今天日期与现有任务用于去重/换算相对时间 */
export function buildImportSystem(existingTasks: Task[]): string {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate(),
  )}`;
  const titles = existingTasks.slice(0, 100).map((t) => `- ${t.title}`);
  return `你是待办计划整理助手。用户会给你一段计划描述，请把它拆解成清晰、可执行、可独立完成的待办任务列表。

输出要求：
1. 只输出一个 JSON 数组，不要输出任何解释、注释、前后缀文字，不要用 markdown 代码块包裹。
2. 数组每个元素的字段与格式严格如下：
   {"title": "简短明确的任务标题", "description": "补充说明，没有则留空字符串", "priority": "high|medium|low", "dueDate": "YYYY-MM-DD 或 null", "category": "所属类别/清单名，无法判断则用 默认", "type": "schedule 或 list，含明确日期或日程安排则 schedule，否则 list"}
3. 若描述中出现"明天、后天、下周、月底"等相对时间，请基于今天日期（${todayStr}）换算成具体 YYYY-MM-DD；没有明确时间的任务 dueDate 写 null。
4. 合理分配优先级：重要且紧急为 high，一般规划为 medium，琐碎低优先为 low。
5. 合理分组：把同一主题/场景的任务归入同一 category，不明确则用 "默认"。
6. 避免生成与用户已有任务重复的任务，不要输出标题与下列已有任务相同或语义完全相同的任务：
${titles.length ? titles.join("\n") : "（当前没有已有任务）"}`;
}
