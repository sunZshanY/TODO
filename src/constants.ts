export const STORAGE_KEYS = {
  theme: "todo_fluent_theme",
  tasks: "todo_fluent_tasks",
  deleted: "todo_fluent_deleted",
  syncConfig: "todo_fluent_sync_config",
  aiConfig: "todo_fluent_ai_config",
  aiConversations: "todo_fluent_ai_conversations",
  weather: "todo_fluent_weather",
  taskComplete: "todo_fluent_task_complete",
  remindersNotified: "todo_fluent_reminders_notified",
} as const;

export const AI_MAX_CONVERSATIONS = 50;

export const WEATHER_CACHE_TTL = 30 * 60 * 1000; // 30 分钟

export const SYNC_GIST_FILENAME = "todo-fluent.json";

export const TOMBSTONE_TTL = 30 * 24 * 60 * 60 * 1000; // 删除记录保留 30 天

export const DEFAULT_CATEGORY = "默认";

export const TASK_TYPE_LABEL: Record<import("./types").TaskType, string> = {
  schedule: "日程表",
  list: "清单",
};

export const REMINDER_POLL_MS = 30 * 1000; // 提醒轮询间隔

export const REMINDER_RECENT_GRACE_MS = 60 * 1000; // 仅提醒刚到期（1 分钟内）的任务

export const DUE_TIME_VISIBLE_DAYS = 7; // 截止时间显示时分的天数窗口（今天起 7 天内显示时分，其余只显示日期）
