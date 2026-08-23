import { useCallback, useEffect, useRef } from "react";
import {
  Button,
  Toast,
  ToastBody,
  ToastTitle,
  ToastTrigger,
  useToastController,
} from "@fluentui/react-components";
import { DismissRegular } from "@fluentui/react-icons";
import { REMINDER_POLL_MS, REMINDER_RECENT_GRACE_MS, STORAGE_KEYS } from "../constants";
import type { Task } from "../types";
import { formatDueDate } from "../utils/date";

/** 已提醒记录：taskId -> dueDate，用于去重并在截止时间变化时重新提醒 */
function loadNotified(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.remindersNotified);
    if (!raw) return {};
    const obj = JSON.parse(raw) as unknown;
    if (typeof obj !== "object" || obj === null) return {};
    const rec: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (typeof v === "string") rec[k] = v;
    }
    return rec;
  } catch {
    return {};
  }
}

function saveNotified(notified: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.remindersNotified, JSON.stringify(notified));
  } catch {
    // 忽略存储异常
  }
}

/** 定时检查任务截止时间，到期时在应用内弹出提醒（仅提醒带时分截止时间的任务） */
export function useReminders(tasks: Task[]) {
  const { dispatchToast, dismissToast } = useToastController();
  const notifiedRef = useRef<Record<string, string>>(loadNotified());

  const check = useCallback(() => {
    const now = Date.now();
    for (const task of tasks) {
      if (task.completed || !task.dueDate) continue;
      if (!/T\d{2}:\d{2}/.test(task.dueDate)) continue;
      const due = new Date(task.dueDate).getTime();
      if (Number.isNaN(due)) continue;
      if (due > now || due < now - REMINDER_RECENT_GRACE_MS) continue;
      if (notifiedRef.current[task.id] === task.dueDate) continue;

      notifiedRef.current[task.id] = task.dueDate;
      saveNotified(notifiedRef.current);

      dispatchToast(
        <Toast>
          <ToastTitle
            action={
              <ToastTrigger>
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<DismissRegular />}
                  aria-label="关闭提醒"
                  title="关闭提醒"
                  onClick={() => dismissToast(task.id)}
                />
              </ToastTrigger>
            }
          >
            ⏰ 任务到期：{task.title}
          </ToastTitle>
          <ToastBody>
            截止时间：{formatDueDate(task.dueDate)}　类别：{task.category}
          </ToastBody>
        </Toast>,
        {
          intent: "warning",
          position: "top-end",
          toastId: task.id,
          timeout: -1,
        },
      );
    }
  }, [tasks, dispatchToast, dismissToast]);

  useEffect(() => {
    check();
    const timer = setInterval(check, REMINDER_POLL_MS);
    return () => clearInterval(timer);
  }, [check]);

  useEffect(() => {
    const liveIds = new Set(tasks.map((t) => t.id));
    let changed = false;
    for (const id of Object.keys(notifiedRef.current)) {
      if (!liveIds.has(id)) {
        delete notifiedRef.current[id];
        changed = true;
      }
    }
    if (changed) saveNotified(notifiedRef.current);
  }, [tasks]);
}
