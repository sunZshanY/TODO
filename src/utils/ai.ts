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
  maxTokens = 1024,
): RequestPlan {
  const base = normalizeBaseUrl(config.baseUrl);
  const format: ApiFormat =
    config.apiFormat === "auto" ? detectFormat(base) : config.apiFormat;

  const messages = history.map((m) => ({ role: m.role, content: m.content }));

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

export function extractAnswer(data: unknown, format: ApiFormat): string {
  if (format === "anthropic") {
    const d = data as { content?: { type?: string; text?: string }[] };
    return (
      d.content
        ?.filter((c) => c.type === "text" && c.text)
        .map((c) => c.text as string)
        .join("") ?? ""
    );
  }
  const d = data as { choices?: { message?: { content?: string } }[] };
  return typeof d.choices?.[0]?.message?.content === "string"
    ? d.choices[0].message.content
    : "";
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
