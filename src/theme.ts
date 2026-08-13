import { STORAGE_KEYS } from "./constants";

export type ThemeMode = "light" | "dark";

export function loadThemeMode(): ThemeMode {
  try {
    return localStorage.getItem(STORAGE_KEYS.theme) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function saveThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEYS.theme, mode);
  } catch {
    // 忽略存储异常
  }
}

export function toggleThemeMode(mode: ThemeMode): ThemeMode {
  return mode === "dark" ? "light" : "dark";
}
