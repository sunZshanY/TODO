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

interface CategoryGroup {
  drafts: ImportDraft[];
  hasDate: boolean;
  heading: string;
}

/** 清理单元格：去除 markdown 符号、HTML、<br>，合并空白 */
function cleanMarkdown(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, "；")
    .replace(/<[^>]+>/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** 按 | 拆分表格行并清理单元格 */
function splitTableRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => cleanMarkdown(c));
}

/** 判断是否为表格分隔行（|---|） */
function isSeparatorRow(cells: string[]): boolean {
  return cells.every((c) => /^:?-{2,}:?$/.test(c) || c === "");
}

/** 判断单元格内容是否含时间/日期特征，用于类型判定 */
function looksScheduled(text: string): boolean {
  return (
    /\d{1,2}:\d{2}/.test(text) ||
    /\d{1,2}\/\d{1,2}/.test(text) ||
    /周[一二三四五六日天]/.test(text) ||
    (/\d{4}年|\d{4}-\d{2}/.test(text) && /\d/.test(text))
  );
}

/** 解析单行复选框任务内容：标题 + 内联标记 [优先级] @日期 /说明/ */
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

function getGroup(
  groups: Record<string, CategoryGroup>,
  name: string,
): CategoryGroup {
  if (!groups[name]) {
    groups[name] = { drafts: [], hasDate: false, heading: name };
  }
  return groups[name];
}

/** 把表格数据行转为任务：末列作标题，其余列合并为备注 */
function handleTableBlock(
  rows: string[][],
  category: string,
  groups: Record<string, CategoryGroup>,
): void {
  let dataStart = 0;
  if (rows.length >= 2 && isSeparatorRow(rows[1])) {
    dataStart = 2;
  } else if (rows.length >= 1) {
    dataStart = 1; // 无分隔行时跳过表头
  }
  for (let r = dataStart; r < rows.length; r++) {
    const cells = rows[r].filter((c) => c !== "");
    if (cells.length < 2) continue;

    // 跳过日历/日期清单行（首列为独立 MM-DD 日期，如 08-10）
    if (/^\d{2}-\d{2}$/.test(cells[0])) continue;

    const title = cells[cells.length - 1];
    if (!title) continue;
    // 跳过低信息标题（纯符号/占位）
    if (/^[❌✅☐□○●—\-·\s*]+$/.test(title)) continue;

    const context = cells.slice(0, -1).join(" · ");
    const group = getGroup(groups, category);
    group.drafts.push({
      title,
      description: context,
      priority: "medium",
      dueDate: null,
      category,
      type: "list",
    });
    if (cells.some(looksScheduled)) group.hasDate = true;
  }
}

/**
 * 解析 Markdown 为任务草稿。
 * - `# / ## / ### 标题` → 类别（分组）
 * - `- [ ] 内容` → 未完成任务，`- [x] 内容` → 已完成
 * - 表格块 → 每行取最后一列为标题、其余列为备注（自动跳过表头与分隔行）
 * - 任务下缩进的子列表项会追加为描述
 * - 代码块（``` 围栏）内容会被跳过，避免误提取
 * - 内联标记（复选框行）：[高][中][低] 优先级、@2026-08-21 日期、/说明/ 描述
 * - 类型自动判定：标题含日程/安排等关键词或组内存在日期/时间 → 日程表，否则清单
 */
export function parseMdTasks(text: string): ImportDraft[] {
  const lines = text.split(/\r?\n/);
  const groups: Record<string, CategoryGroup> = {};
  let category = DEFAULT_CATEGORY;
  let current: ImportDraft | null = null;
  let inFence = false;

  let i = 0;
  const n = lines.length;
  while (i < n) {
    const line = lines[i].replace(/\t/g, "  ");

    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      i++;
      continue;
    }
    if (inFence) {
      i++;
      continue;
    }

    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      category = heading[1].trim();
      current = null;
      i++;
      continue;
    }

    if (/^\s*\|/.test(line)) {
      const rows: string[][] = [];
      while (i < n && /^\s*\|/.test(lines[i])) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      handleTableBlock(rows, category, groups);
      current = null;
      continue;
    }

    const checkbox = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (checkbox) {
      const parsed = parseTaskLine(checkbox[2]);
      if (parsed) {
        parsed.draft.completed = /[xX]/.test(checkbox[1]);
        parsed.draft.category = category;
        const group = getGroup(groups, category);
        group.drafts.push(parsed.draft);
        if (parsed.hasDate) group.hasDate = true;
        current = parsed.draft;
      }
      i++;
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

    i++;
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
