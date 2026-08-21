import { DEFAULT_CATEGORY } from "../constants";
import type { ImportDraft, Priority, TaskType } from "../types";

const TYPE_KEYWORDS = /日程|安排|时间表|排期|计划|calendar/i;

const PRIORITY_MAP: Record<string, Priority> = {
  高: "high",
  中: "medium",
  低: "low",
};

interface ParsedTask {
  draft: ImportDraft;
  hasDate: boolean;
}

/** 解析单行任务内容：标题 + 内联标记 [优先级] @日期 /说明/ */
function parseTaskLine(text: string): ParsedTask | null {
  let title = text.trim();
  if (!title) return null;

  let description = "";
  let priority: Priority = "medium";
  let dueDate: string | null = null;
  let hasDate = false;

  const priorityMatch = title.match(/\[(高|中|低)\]/);
  if (priorityMatch) {
    priority = PRIORITY_MAP[priorityMatch[1]] ?? "medium";
    title = title.replace(/\[(高|中|低)\]/g, "").trim();
  }

  const dateMatch = title.match(/@(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (dateMatch) {
    const y = dateMatch[1];
    const m = dateMatch[2].padStart(2, "0");
    const d = dateMatch[3].padStart(2, "0");
    if (
      Number(m) >= 1 &&
      Number(m) <= 12 &&
      Number(d) >= 1 &&
      Number(d) <= 31
    ) {
      dueDate = `${y}-${m}-${d}`;
      hasDate = true;
    }
    title = title.replace(/@(\d{4})-(\d{1,2})-(\d{1,2})/g, "").trim();
  }

  const descMatch = title.match(/\/([^/]+)\//);
  if (descMatch) {
    description = descMatch[1].trim();
    title = title.replace(/\/([^/]+)\//g, "").trim();
  }

  if (!title) return null;

  return {
    draft: {
      title,
      description,
      priority,
      dueDate,
      category: DEFAULT_CATEGORY,
      type: "list",
    },
    hasDate,
  };
}

interface CategoryGroup {
  drafts: ImportDraft[];
  hasDate: boolean;
  heading: string;
}

/**
 * 解析 Markdown 为任务草稿。
 * - `## 标题` → 类别（分组）
 * - `- [ ] 内容` → 未完成任务，`- [x] 内容` → 已完成
 * - 内联标记：[高][中][低] 优先级、@2026-08-21 日期、/说明/ 描述
 * - 任务下缩进的子列表项会追加为描述
 * - 类型自动判定：标题含日程/安排等关键词或组内存在截止日期 → 日程表，否则清单
 */
export function parseMdTasks(text: string): ImportDraft[] {
  const lines = text.split(/\r?\n/);
  const groups: Record<string, CategoryGroup> = {};
  let category = DEFAULT_CATEGORY;
  let current: ImportDraft | null = null;

  const getGroup = (name: string): CategoryGroup => {
    if (!groups[name]) {
      groups[name] = { drafts: [], hasDate: false, heading: name };
    }
    return groups[name];
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, "  ");

    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      category = heading[1].trim();
      current = null;
      continue;
    }

    const checkbox = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (checkbox) {
      const parsed = parseTaskLine(checkbox[2]);
      if (parsed) {
        parsed.draft.completed = /[xX]/.test(checkbox[1]);
        parsed.draft.category = category;
        const group = getGroup(category);
        group.drafts.push(parsed.draft);
        if (parsed.hasDate) group.hasDate = true;
        current = parsed.draft;
      }
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (current && bullet) {
      const sub = bullet[1].trim();
      if (sub) {
        current.description = current.description
          ? `${current.description}；${sub}`
          : sub;
      }
    }
  }

  const result: ImportDraft[] = [];
  for (const name of Object.keys(groups)) {
    const group = groups[name];
    const type: TaskType =
      TYPE_KEYWORDS.test(group.heading) || group.hasDate ? "schedule" : "list";
    for (const draft of group.drafts) {
      draft.type = type;
      result.push(draft);
    }
  }
  return result;
}
