import { SYNC_GIST_FILENAME, TOMBSTONE_TTL } from "./constants";
import type { DeletedTask, SyncData, Task } from "./types";

const GITHUB_API = "https://api.github.com";

interface GistFile {
  filename: string;
  content?: string;
  raw_url?: string;
  truncated?: boolean;
}

interface Gist {
  id: string;
  files: Record<string, GistFile>;
}

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function normalizeSyncData(data: unknown): SyncData {
  if (typeof data !== "object" || data === null) {
    throw new Error("云端数据格式不正确");
  }
  const d = data as Partial<SyncData>;
  const tasks = Array.isArray(d.tasks)
    ? d.tasks.filter(
        (t): t is Task =>
          typeof t === "object" &&
          t !== null &&
          typeof (t as Task).id === "string" &&
          typeof (t as Task).title === "string",
      )
    : [];
  const deleted = Array.isArray(d.deleted)
    ? d.deleted.filter(
        (x): x is DeletedTask =>
          typeof x === "object" &&
          x !== null &&
          typeof (x as DeletedTask).id === "string",
      )
    : [];
  return {
    version: 1,
    updatedAt: typeof d.updatedAt === "string" ? d.updatedAt : new Date(0).toISOString(),
    tasks,
    deleted,
  };
}

export function fetchRemoteData(token: string, gistId: string): Promise<SyncData | null> {
  return fetch(`${GITHUB_API}/gists/${gistId}`, { headers: headers(token) }).then(async (res) => {
    if (res.status === 404) return null;
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`读取云端失败（HTTP ${res.status}）：${body.slice(0, 200)}`);
    }
    const gist = (await res.json()) as Gist;
    const file = gist.files?.[SYNC_GIST_FILENAME];
    if (!file) return null;
    const raw = file.raw_url ? await fetch(file.raw_url) : null;
    const content =
      raw && raw.ok ? await raw.text() : typeof file.content === "string" ? file.content : "";
    if (!content.trim()) return null;
    return normalizeSyncData(JSON.parse(content));
  });
}

export function pushRemoteData(
  token: string,
  gistId: string,
  data: SyncData,
): Promise<string> {
  const payload = {
    description: "TODO 任务数据（todo-fluent 自动同步）",
    public: false,
    files: { [SYNC_GIST_FILENAME]: { content: JSON.stringify(data, null, 2) } },
  };
  if (gistId) {
    return fetch(`${GITHUB_API}/gists/${gistId}`, {
      method: "PATCH",
      headers: headers(token),
      body: JSON.stringify({ files: payload.files }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`上传云端失败（HTTP ${res.status}）：${body.slice(0, 200)}`);
        }
        return gistId;
      });
  }
  return fetch(`${GITHUB_API}/gists`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(payload),
  })
    .then(async (res) => {
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`创建云端失败（HTTP ${res.status}）：${body.slice(0, 200)}`);
      }
      const gist = (await res.json()) as Gist;
      return gist.id;
    });
}

export function mergeSync(local: SyncData, remote: SyncData): SyncData {
  const deletedMap = new Map<string, DeletedTask>();
  for (const d of [...local.deleted, ...remote.deleted]) {
    const prev = deletedMap.get(d.id);
    if (!prev || d.deletedAt > prev.deletedAt) deletedMap.set(d.id, d);
  }

  const taskMap = new Map<string, Task>();
  for (const t of [...local.tasks, ...remote.tasks]) {
    const prev = taskMap.get(t.id);
    if (!prev || t.updatedAt > prev.updatedAt) taskMap.set(t.id, t);
  }

  const tasks: Task[] = [];
  for (const t of taskMap.values()) {
    const d = deletedMap.get(t.id);
    if (d && d.deletedAt >= t.updatedAt) continue;
    tasks.push(t);
  }

  const now = Date.now();
  const deleted = [...deletedMap.values()].filter(
    (d) => now - Date.parse(d.deletedAt) < TOMBSTONE_TTL,
  );

  tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { version: 1, updatedAt: new Date().toISOString(), tasks, deleted };
}
