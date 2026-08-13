export const STORAGE_KEYS = {
  theme: "todo_fluent_theme",
  tasks: "todo_fluent_tasks",
  aiConfig: "todo_fluent_ai_config",
  weather: "todo_fluent_weather",
} as const;

export const WEATHER_CACHE_TTL = 30 * 60 * 1000; // 30 分钟
