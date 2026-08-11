import { useCallback, useEffect, useState } from "react";
import type { Task, TaskInput } from "../types";
import { loadTasks, saveTasks } from "../storage";

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

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
    setTasks((prev) => prev.filter((t) => t.id !== id));
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
    setTasks(incoming);
  }, []);

  return { tasks, addTask, updateTask, toggleTask, deleteTask, moveTask, importTasks };
}
