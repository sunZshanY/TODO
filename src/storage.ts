import type { AiConfig, Task } from "./types";

const TASKS_KEY = "todo_fluent_tasks";
const AI_CONFIG_KEY = "todo_fluent_ai_config";

export const DEFAULT_AI_CONFIG: AiConfig = {
  baseUrl: "https://api.anthropic.com",
  apiKey: "",
  model: "claude-sonnet-4-20250514",
};

export function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    return raw ? (JSON.parse(raw) as Task[]) : [];
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch {
    // 忽略存储配额等异常
  }
}

export function loadAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (!raw) return { ...DEFAULT_AI_CONFIG };
    return { ...DEFAULT_AI_CONFIG, ...(JSON.parse(raw) as Partial<AiConfig>) };
  } catch {
    return { ...DEFAULT_AI_CONFIG };
  }
}

export function saveAiConfig(config: AiConfig): void {
  try {
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // 忽略存储异常
  }
}

export function parseTasks(raw: string): Task[] {
  const data = JSON.parse(raw) as unknown;
  if (!Array.isArray(data)) {
    throw new Error("数据格式不正确，应为任务数组");
  }
  return data.filter(
    (t): t is Task =>
      typeof t === "object" &&
      t !== null &&
      typeof (t as Task).id === "string" &&
      typeof (t as Task).title === "string",
  );
}
