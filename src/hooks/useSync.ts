import { useCallback, useEffect, useRef, useState } from "react";
import type { DeletedTask, SyncConfig, SyncData, SyncStatus, Task } from "../types";
import { fetchRemoteData, mergeSync, pushRemoteData } from "../sync";
import { loadSyncConfig, saveSyncConfig } from "../storage";

interface UseSyncResult {
  config: SyncConfig;
  status: SyncStatus;
  message: string;
  lastSyncAt: number | null;
  saveConfig: (config: SyncConfig) => void;
  syncBoth: () => Promise<void>;
  syncUp: () => Promise<void>;
  syncDown: () => Promise<void>;
}

export function useSync(
  tasks: Task[],
  deleted: DeletedTask[],
  applySyncData: (data: SyncData) => void,
): UseSyncResult {
  const [config, setConfig] = useState<SyncConfig>(() => loadSyncConfig());
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [message, setMessage] = useState("");
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const busyRef = useRef(false);
  const stateRef = useRef({ tasks, deleted, config });
  stateRef.current = { tasks, deleted, config };

  const saveConfig = useCallback((next: SyncConfig) => {
    setConfig(next);
    saveSyncConfig(next);
  }, []);

  const buildLocal = useCallback(
    (tasks: Task[], deleted: DeletedTask[]): SyncData => ({
      version: 1,
      updatedAt: new Date().toISOString(),
      tasks,
      deleted,
    }),
    [],
  );

  const run = useCallback(
    async (mode: "both" | "up" | "down") => {
      const { tasks: t, deleted: d, config: c } = stateRef.current;
      if (busyRef.current) return;
      if (!c.token) {
        setStatus("error");
        setMessage("请先在设置中填写 GitHub Token");
        return;
      }
      busyRef.current = true;
      setStatus("syncing");
      setMessage(mode === "up" ? "上传中..." : mode === "down" ? "下载中..." : "同步中...");
      try {
        const local = buildLocal(t, d);
        const remote = await fetchRemoteData(c.token, c.gistId);
        if (mode === "up") {
          const gistId = await pushRemoteData(c.token, c.gistId, local);
          if (!c.gistId && gistId) saveConfig({ ...c, gistId });
          setMessage("已上传云端");
        } else if (mode === "down") {
          if (remote) {
            applySyncData(mergeSync(local, remote));
            setMessage("已下载云端数据");
          } else {
            setMessage("云端暂无数据");
          }
        } else {
          const merged = remote ? mergeSync(local, remote) : local;
          if (remote) applySyncData(merged);
          const gistId = await pushRemoteData(c.token, c.gistId, merged);
          if (!c.gistId && gistId) saveConfig({ ...c, gistId });
          setMessage(remote ? "同步完成" : "已创建云端备份");
        }
        setStatus("success");
        setLastSyncAt(Date.now());
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "同步失败");
      } finally {
        busyRef.current = false;
      }
    },
    [applySyncData, buildLocal, saveConfig],
  );

  const syncBoth = useCallback(() => run("both"), [run]);
  const syncUp = useCallback(() => run("up"), [run]);
  const syncDown = useCallback(() => run("down"), [run]);

  useEffect(() => {
    if (!config.autoSync || !config.token) return;
    const ms = Math.max(1, config.intervalMinutes) * 60 * 1000;
    const timer = setInterval(() => {
      void run("both");
    }, ms);
    return () => clearInterval(timer);
  }, [config.autoSync, config.token, config.intervalMinutes, run]);

  return { config, status, message, lastSyncAt, saveConfig, syncBoth, syncUp, syncDown };
}
