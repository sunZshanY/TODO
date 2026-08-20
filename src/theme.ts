import {
  createDarkTheme,
  createLightTheme,
  type BrandVariants,
  type Theme,
} from "@fluentui/react-components";
import { STORAGE_KEYS } from "./constants";

export type ThemeMode = "light" | "dark" | "system";

export const THEME_MODE_LABEL: Record<ThemeMode, string> = {
  light: "浅色",
  dark: "深色",
  system: "跟随系统",
};

const SYSTEM_QUERY = "(prefers-color-scheme: dark)";

const brandRamp: BrandVariants = {
  10: "#060205",
  20: "#231329",
  30: "#331A44",
  40: "#3F1F59",
  50: "#4C256E",
  60: "#592B84",
  70: "#66329B",
  80: "#7439B2",
  90: "#8240C8",
  100: "#9047DE",
  110: "#9B4EE2",
  120: "#A75FE8",
  130: "#B776ED",
  140: "#C68DF2",
  150: "#CFA3F8",
  160: "#E0B8F9",
};

export const appLightTheme: Theme = createLightTheme(brandRamp);
export const appDarkTheme: Theme = createDarkTheme(brandRamp);

export function loadThemeMode(): ThemeMode {
  try {
    const value = localStorage.getItem(STORAGE_KEYS.theme);
    return value === "light" || value === "dark" || value === "system"
      ? value
      : "system";
  } catch {
    return "system";
  }
}

export function saveThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEYS.theme, mode);
  } catch {
    // 忽略存储异常
  }
}

export function nextThemeMode(mode: ThemeMode): ThemeMode {
  return mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
}

export function systemPrefersDark(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      !!window.matchMedia &&
      window.matchMedia(SYSTEM_QUERY).matches
    );
  } catch {
    return false;
  }
}

export function subscribeSystemTheme(listener: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(SYSTEM_QUERY);
  if (!mq.addEventListener) return () => {};
  mq.addEventListener("change", listener);
  return () => mq.removeEventListener("change", listener);
}
