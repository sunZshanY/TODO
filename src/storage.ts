import { STORAGE_KEYS } from "./constants";
import type { AiConfig, AiConversation, DeletedTask, SyncConfig, Task } from "./types";

export const DEFAULT_AI_CONFIG: AiConfig = {
  baseUrl: "https://api.deepseek.com",
  apiKey: "",
  model: "deepseek-v4-flash",
  apiFormat: "auto",
};

export function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.tasks);
    return raw ? (JSON.parse(raw) as Task[]) : [];
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
  } catch {
    // 忽略存储配额等异常
  }
}

export function loadAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.aiConfig);
    if (!raw) return { ...DEFAULT_AI_CONFIG };
    return { ...DEFAULT_AI_CONFIG, ...(JSON.parse(raw) as Partial<AiConfig>) };
  } catch {
    return { ...DEFAULT_AI_CONFIG };
  }
}

export function saveAiConfig(config: AiConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.aiConfig, JSON.stringify(config));
  } catch {
    // 忽略存储异常
  }
}

export function loadAiConversations(): AiConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.aiConversations);
    return raw ? (JSON.parse(raw) as AiConversation[]) : [];
  } catch {
    return [];
  }
}

export function saveAiConversations(list: AiConversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.aiConversations, JSON.stringify(list));
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

export function loadDeletedTasks(): DeletedTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.deleted);
    return raw ? (JSON.parse(raw) as DeletedTask[]) : [];
  } catch {
    return [];
  }
}

export function saveDeletedTasks(deleted: DeletedTask[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.deleted, JSON.stringify(deleted));
  } catch {
    // 忽略存储异常
  }
}

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  token: "",
  gistId: "",
  autoSync: false,
  intervalMinutes: 5,
};

export function loadSyncConfig(): SyncConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.syncConfig);
    if (!raw) return { ...DEFAULT_SYNC_CONFIG };
    return { ...DEFAULT_SYNC_CONFIG, ...(JSON.parse(raw) as Partial<SyncConfig>) };
  } catch {
    return { ...DEFAULT_SYNC_CONFIG };
  }
}

export function saveSyncConfig(config: SyncConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.syncConfig, JSON.stringify(config));
  } catch {
    // 忽略存储异常
  }
}
