import { DEFAULT_CATEGORY } from "../constants";
import { pad } from "./date";
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

/** 在文本中查找内联截止时间，支持：
 *  - @2026-08-21 [HH:mm[:ss]]
 *  - 2026-08-21 / 2026/8/21 [ HH:mm ]
 *  - 仅时间 HH:mm（缺日期时按今天处理）
 * 日期与时间可分别出现在同一行的不同位置（如「会议 2026-08-24 14:30」或「14:30 会议 @2026-08-24」），
 * 会合并为同一截止时间。
 * 返回 ISO 字符串（可能含 T 时分）、是否含有日期，以及命中的原文（用于剔除标题）。
 */
function extractInlineDueDate(
  text: string,
): {
  dueDate: string | null;
  hasDate: boolean;
  matched: string | null;
  timeMatched: string | null;
} {
  let datePart: string | null = null;
  let timePart: string | null = null;
  let dateMatched = "";
  let timeMatched = "";

  const dt = text.match(
    /@?(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (dt) {
    const mo = Number(dt[2]);
    const d = Number(dt[3]);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      datePart = `${dt[1]}-${pad(mo)}-${pad(d)}`;
      dateMatched = dt[0];
      if (dt[4] !== undefined) {
        timePart = `${pad(Number(dt[4]))}:${pad(Number(dt[5]))}`;
      }
    }
  }

  if (!timePart) {
    const tm = text.match(/\b(\d{1,2}):(\d{2})\b/);
    if (tm) {
      timePart = `${pad(Number(tm[1]))}:${tm[2]}`;
      timeMatched = tm[0];
    }
  }

  if (!datePart && !timePart) {
    return { dueDate: null, hasDate: false, matched: null, timeMatched: null };
  }

  const now = new Date();
  if (!datePart) {
    datePart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate(),
    )}`;
  }
  return {
    dueDate: timePart ? `${datePart}T${timePart}` : datePart,
    hasDate: true,
    matched: dateMatched || timeMatched || null,
    timeMatched: timeMatched || null,
  };
}

/** 从表格数据行各单元格提取截止时间：优先含年份日期，其次月-日，再次单独时分（按今天）。
 * 日期可位于任意单元格，时间也可出现在任意单元格（含「14:00-15:00」「时间 14:00」等形式），
 * 二者会合并为同一截止时间。
 */
function tableRowDueDate(
  cells: string[],
): { dueDate: string | null; hasDate: boolean } {
  let datePart: string | null = null; // yyyy-mm-dd
  let timePart: string | null = null; // HH:mm
  for (const cell of cells) {
    if (!datePart) {
      const ymd = cell.match(
        /(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/,
      );
      if (ymd) {
        const mo = Number(ymd[2]);
        const d = Number(ymd[3]);
        if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
          datePart = `${ymd[1]}-${pad(mo)}-${pad(d)}`;
          if (ymd[4] !== undefined) {
            timePart = `${pad(Number(ymd[4]))}:${pad(Number(ymd[5]))}`;
          }
        }
      }
      if (!datePart) {
        const md = cell.match(/\b(\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
        if (md) {
          const mo = Number(md[1]);
          const d = Number(md[2]);
          if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
            const y = new Date().getFullYear();
            datePart = `${y}-${pad(mo)}-${pad(d)}`;
            if (md[3] !== undefined) {
              timePart = `${pad(Number(md[3]))}:${pad(Number(md[4]))}`;
            }
          }
        }
      }
    }
    if (!timePart) {
      const tm = cell.match(/\b(\d{1,2}):(\d{2})\b/);
      if (tm) timePart = `${pad(Number(tm[1]))}:${tm[2]}`;
    }
  }
  if (datePart || timePart) {
    const date =
      datePart ??
      (() => {
        const now = new Date();
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
          now.getDate(),
        )}`;
      })();
    return {
      dueDate: timePart ? `${date}T${timePart}` : date,
      hasDate: true,
    };
  }
  return { dueDate: null, hasDate: false };
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

  const due = extractInlineDueDate(title);
  if (due.dueDate) {
    dueDate = due.dueDate;
    hasDate = due.hasDate;
    let cleaned = title;
    if (due.matched) cleaned = cleaned.replace(due.matched, " ");
    if (due.timeMatched && due.timeMatched !== due.matched) {
      cleaned = cleaned.replace(due.timeMatched, " ");
    }
    cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
    if (cleaned) title = cleaned;
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
    const due = tableRowDueDate(cells);
    const group = getGroup(groups, category);
    group.drafts.push({
      title,
      description: context,
      priority: "medium",
      dueDate: due.dueDate,
      category,
      type: "list",
    });
    if (due.hasDate || cells.some(looksScheduled)) group.hasDate = true;
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
