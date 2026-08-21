import { useCallback, useEffect, useState } from "react";
import type {
  DeletedTask,
  SyncData,
  Task,
  TaskInput,
  TaskSeed,
} from "../types";
import {
  loadDeletedTasks,
  loadTasks,
  normalizeTask,
  saveDeletedTasks,
  saveTasks,
} from "../storage";
import { uid } from "../utils/id";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [deleted, setDeleted] = useState<DeletedTask[]>(() => loadDeletedTasks());

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    saveDeletedTasks(deleted);
  }, [deleted]);

  const addTask = useCallback((input: TaskInput) => {
    const now = new Date().toISOString();
    const task: Task = {
      id: uid(),
      completed: false,
      createdAt: now,
      updatedAt: now,
      ...input,
    };
    setTasks((prev) => [task, ...prev]);
  }, []);

  const addTasks = useCallback((seeds: TaskSeed[]) => {
    if (seeds.length === 0) return;
    const now = new Date().toISOString();
    const created: Task[] = seeds.map((seed) => {
      const { completed = false, ...input } = seed;
      return {
        id: uid(),
        completed,
        createdAt: now,
        updatedAt: now,
        ...input,
      };
    });
    setTasks((prev) => [...created, ...prev]);
  }, []);

  const updateTask = useCallback((id: string, input: TaskInput) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, ...input, updatedAt: new Date().toISOString() } : t,
      ),
    );
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, completed: !t.completed, updatedAt: new Date().toISOString() }
          : t,
      ),
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    const now = new Date().toISOString();
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setDeleted((prev) => [...prev, { id, deletedAt: now }]);
  }, []);

  const moveTask = useCallback((fromId: string, toId: string) => {
    setTasks((prev) => {
      const from = prev.findIndex((t) => t.id === fromId);
      const to = prev.findIndex((t) => t.id === toId);
      if (from < 0 || to < 0 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const importTasks = useCallback((incoming: Task[]) => {
    setTasks(incoming.map(normalizeTask));
    setDeleted([]);
  }, []);

  const applySyncData = useCallback((data: SyncData) => {
    setTasks(data.tasks.map(normalizeTask));
    setDeleted(data.deleted);
  }, []);

  return {
    tasks,
    deleted,
    addTask,
    addTasks,
    updateTask,
    toggleTask,
    deleteTask,
    moveTask,
    importTasks,
    applySyncData,
  };
}
