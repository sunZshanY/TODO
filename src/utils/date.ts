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

/** 将 ISO 日期字符串格式化为 yyyy-MM-dd */
export function formatDueDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 判断任务是否已逾期（未完成且截止日期早于今天） */
export function isOverdue(dueDate: string | null, completed: boolean): boolean {
  if (completed || !dueDate) return false;
  const due = new Date(dueDate).getTime();
  if (Number.isNaN(due)) return false;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return due < todayStart.getTime();
}
