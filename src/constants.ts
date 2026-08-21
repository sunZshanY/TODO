export const STORAGE_KEYS = {
  theme: "todo_fluent_theme",
  tasks: "todo_fluent_tasks",
  deleted: "todo_fluent_deleted",
  syncConfig: "todo_fluent_sync_config",
  aiConfig: "todo_fluent_ai_config",
  aiConversations: "todo_fluent_ai_conversations",
  weather: "todo_fluent_weather",
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
