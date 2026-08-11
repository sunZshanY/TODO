import { useCallback, useState } from "react";
import type { AiConfig, ChatMessage } from "../types";
import { loadAiConfig, saveAiConfig } from "../storage";

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function useAiChat() {
  const [config, setConfig] = useState<AiConfig>(() => loadAiConfig());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveConfig = useCallback((cfg: AiConfig) => {
    setConfig(cfg);
    saveAiConfig(cfg);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { id: uid(), role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setError(null);

    if (!config.baseUrl || !config.apiKey) {
      setError("请先在设置中配置 AI 服务地址与 API Key");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${config.baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": config.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 1024,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`请求失败（${res.status}）${detail.slice(0, 200)}`);
      }

      const data = (await res.json()) as {
        content?: { type?: string; text?: string }[];
      };
      const answer =
        data.content
          ?.filter((c) => c.type === "text" && c.text)
          .map((c) => c.text as string)
          .join("") ?? "（模型未返回内容）";

      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "assistant", content: answer },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求出错，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [config, input, loading, messages]);

  return { config, saveConfig, messages, clearChat, input, setInput, loading, error, setError, send };
}
