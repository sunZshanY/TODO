import type { AiConfig, ChatMessage } from "../types";

declare global {
  interface Window {
    aiRequest?: (
      payload: { url: string; headers: Record<string, string>; body: unknown },
    ) => Promise<{ ok: boolean; status: number; text: string }>;
  }
}

const REQUEST_TIMEOUT_MS = 120_000;

export type ApiFormat = "anthropic" | "openai";

export interface RequestPlan {
  url: string;
  headers: Record<string, string>;
  body: unknown;
  format: ApiFormat;
}

export function normalizeBaseUrl(url: string): string {
  return url
    .trim()
    .replace(/\/+$/, "")
    .replace("platform.deepseek.com", "api.deepseek.com");
}

export function detectFormat(baseUrl: string): ApiFormat {
  const lower = baseUrl.toLowerCase();
  if (lower.includes("anthropic") || lower.endsWith("/v1/messages")) {
    return "anthropic";
  }
  return "openai";
}

export function buildRequest(
  config: AiConfig,
  history: ChatMessage[],
  system?: string,
  maxTokens = 2048,
  opts?: { disableThinking?: boolean },
): RequestPlan {
  const base = normalizeBaseUrl(config.baseUrl);
  const format: ApiFormat =
    config.apiFormat === "auto" ? detectFormat(base) : config.apiFormat;

  const messages = history.map((m) => ({ role: m.role, content: m.content }));
  const disableThinking = opts?.disableThinking ?? true;

  if (format === "anthropic") {
    return {
      url: /\/v1\/messages$/.test(base) ? base : `${base}/v1/messages`,
      format,
      headers: {
        "content-type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: {
        model: config.model,
        max_tokens: maxTokens,
        messages,
        ...(system ? { system } : {}),
        ...(disableThinking ? { thinking: { type: "disabled" } } : {}),
      },
    };
  }

  const url = /\/chat\/completions$/.test(base)
    ? base
    : /\/v1$/.test(base)
      ? `${base}/chat/completions`
      : `${base}/v1/chat/completions`;
  return {
    url,
    format,
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: {
      model: config.model,
      max_tokens: maxTokens,
      messages: system
        ? [{ role: "system", content: system }, ...messages]
        : messages,
    },
  };
}

interface TextBlock {
  type?: string;
  text?: string;
}

function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter(
        (b): b is TextBlock =>
          typeof b === "object" &&
          b !== null &&
          b.type === "text" &&
          typeof b.text === "string",
      )
      .map((b) => b.text as string)
      .join("");
  }
  return "";
}

function getErrorText(data: Record<string, unknown>): string {
  const candidates: unknown[] = [data.error];
  if (typeof data.message === "string") candidates.push(data.message);
  if (typeof data.msg === "string") candidates.push(data.msg);
  if (data.code !== undefined && data.code !== null) {
    candidates.push(`code=${data.code}`);
  }
  for (const error of candidates) {
    if (typeof error === "string" && error) return error;
    if (error && typeof error === "object") {
      const message = (error as { message?: unknown }).message;
      if (typeof message === "string" && message) return message;
    }
  }
  return "";
}

function isCompletionData(data: Record<string, unknown>): boolean {
  return (
    Array.isArray(data.choices) ||
    data.content !== undefined ||
    typeof data.message === "string"
  );
}

export function extractAnswer(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const root = data as Record<string, unknown>;

  const errorText = getErrorText(root);
  if (errorText) return `（接口错误：${errorText}）`;

  // 响应体本身就是 JSON 数组（部分接口直接返回任务列表）
  if (Array.isArray(root)) return JSON.stringify(root);

  // 兼容某些中转/代理把结果包在 data 字段里
  const d =
    root.data && typeof root.data === "object" && !isCompletionData(root)
      ? (root.data as Record<string, unknown>)
      : root;

  if (Array.isArray(d)) return JSON.stringify(d);

  const choices = d.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const first = choices[0] as Record<string, unknown>;
    const message = first.message as Record<string, unknown> | undefined;
    if (message) {
      const text = contentToText(message.content);
      if (text) return text;
    }
    const text = contentToText(first.text);
    if (text) return text;
  }
  if (typeof d.message === "string") return d.message;

  const text = contentToText(d.content);
  if (text) return text;

  // 响应体本身是任务数据（{ tasks: [...] } 等非标准结构），原样返回以便下游解析
  if (!isCompletionData(d)) return JSON.stringify(d);

  return "";
}

export async function doRequest(
  plan: RequestPlan,
): Promise<{ ok: boolean; status: number; body: string }> {
  if (typeof window.aiRequest === "function") {
    const res = await window.aiRequest(plan);
    return { ok: res.ok, status: res.status, body: res.text };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(plan.url, {
      method: "POST",
      headers: plan.headers,
      body: JSON.stringify(plan.body),
      signal: controller.signal,
    });
    return { ok: res.ok, status: res.status, body: await res.text() };
  } finally {
    clearTimeout(timer);
  }
}

export function formatLabel(format: ApiFormat): string {
  return format === "anthropic" ? "Anthropic 格式" : "OpenAI 兼容格式";
}
