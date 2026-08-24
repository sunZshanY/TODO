export const WEEKDAYS = [
  "星期日",
  "星期一",
  "星期二",
  "星期三",
  "星期四",
  "星期五",
  "星期六",
];

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function greeting(hour: number): string {
  if (hour < 6) return "夜深了，注意休息";
  if (hour < 9) return "早上好";
  if (hour < 12) return "上午好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";
  if (hour < 22) return "晚上好";
  return "夜深了，注意休息";
}

export function formatClock(now: Date): { hh: string; mm: string; ss: string } {
  return {
    hh: pad(now.getHours()),
    mm: pad(now.getMinutes()),
    ss: pad(now.getSeconds()),
  };
}

export function formatDate(now: Date): string {
  return `${now.getFullYear()}年${pad(now.getMonth() + 1)}月${pad(now.getDate())}日`;
}

/** 将时间戳格式化为相对时间（xx 分钟前 / xx 小时前 / xx 天前 / 日期） */
export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 天前`;
  const dt = new Date(ts);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/** 将 ISO 日期字符串格式化为 yyyy-MM-dd，showTime 且含时间则为 yyyy-MM-dd HH:mm */
export function formatDueDate(iso: string | null, showTime = true): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return showTime && /T\d{2}:\d{2}/.test(iso)
    ? `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    : date;
}

/** 判断截止时间是否落在今天起的 limitDays 天窗口内（含今天），用于限制时分显示 */
export function dueWithinDays(iso: string | null, limitDays: number): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + limitDays);
  return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
}

/** 判断任务是否已逾期（未完成且已过截止时间） */
export function isOverdue(dueDate: string | null, completed: boolean): boolean {
  if (completed || !dueDate) return false;
  const due = new Date(dueDate).getTime();
  if (Number.isNaN(due)) return false;
  if (/T\d{2}:\d{2}/.test(dueDate)) return due < Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return due < todayStart.getTime();
}

/** 将 Date 转为本地 YYYY-MM-DD */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 今天的 YYYY-MM-DD */
export function todayKey(): string {
  return dateKey(new Date());
}

/** 从 ISO 截止时间中提取本地 YYYY-MM-DD（避免时区偏移，兼容 YYYY-MM-DD 与 YYYY-MM-DDTHH:mm） */
export function dueDateKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return dateKey(d);
}

/** 将截止时间向后推移 days 天，保留原有时分（若存在） */
export function addDaysToDue(dueDate: string, days: number): string {
  const d = new Date(dueDate);
  d.setDate(d.getDate() + days);
  const base = dateKey(d);
  return /T\d{2}:\d{2}/.test(dueDate)
    ? `${base}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    : base;
}

/** 计算重复任务的下一次截止时间：从当前截止时间起每次顺延 everyDays 天，
 *  直到落在今天之后（避免逾期多天后完成后仍回到过去）。 */
export function nextRepeatDue(dueDate: string, everyDays: number): string {
  let next = addDaysToDue(dueDate, everyDays);
  const today = todayKey();
  for (let i = 0; i < 4000; i++) {
    const key = dueDateKey(next);
    if (!key || key > today) break;
    next = addDaysToDue(next, everyDays);
  }
  return next;
}
