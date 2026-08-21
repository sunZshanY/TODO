import { useCallback, useEffect, useState } from "react";
import type {
  AiConfig,
  AiConversation,
  ChatMessage,
  Priority,
  Task,
} from "../types";
import {
  loadAiConfig,
  loadAiConversations,
  saveAiConfig,
  saveAiConversations,
} from "../storage";
import { AI_MAX_CONVERSATIONS } from "../constants";
import { uid } from "../utils/id";
import { formatDueDate } from "../utils/date";
import { buildRequest, doRequest, extractAnswer, formatLabel } from "../utils/ai";

const PRIORITY_LABEL: Record<Priority, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

function buildTaskContext(tasks: Task[]): string {
  const total = tasks.length;
  if (total === 0) {
    return "用户当前没有任何待办计划。如果用户问起计划或任务，请如实告知当前没有待办任务。";
  }
  const lines = tasks.slice(0, 50).map((t, i) => {
    const status = t.completed ? "已完成" : "未完成";
    const due = formatDueDate(t.dueDate);
    const parts = [`${i + 1}. [${status}] ${t.title}`];
    parts.push(`${PRIORITY_LABEL[t.priority] ?? "中"}优先级`);
    if (due) parts.push(`截止 ${due}`);
    if (t.description) parts.push(`备注：${t.description}`);
    return `${parts[0]}（${parts.slice(1).join("；")}）`;
  });
  const note = total > 50 ? `共 ${total} 项，仅列出前 50 项` : `共 ${total} 项`;
  return `以下是用户当前的待办计划（${note}），请基于这些待办信息回答用户的问题：\n${lines.join(
    "\n",
  )}`;
}

export function useAiChat(tasks: Task[] = []) {
  const [config, setConfig] = useState<AiConfig>(() => loadAiConfig());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<AiConversation[]>(() =>
    loadAiConversations(),
  );
  const [conversationId, setConversationId] = useState<string>(() => uid());

  const saveConfig = useCallback((cfg: AiConfig) => {
    setConfig(cfg);
    saveAiConfig(cfg);
  }, []);

  const upsertConversation = useCallback(
    (id: string, msgs: ChatMessage[]) => {
      setConversations((prev) => {
        const firstUser = msgs.find((m) => m.role === "user")?.content ?? "";
        const title = firstUser.slice(0, 30) || "空对话";
        const now = Date.now();
        const existing = prev.find((c) => c.id === id);
        const next = existing
          ? prev.map((c) =>
              c.id === id ? { ...c, messages: msgs, title, updatedAt: now } : c,
            )
          : [{ id, title, createdAt: now, updatedAt: now, messages: msgs }, ...prev];
        const trimmed = next.slice(0, AI_MAX_CONVERSATIONS);
        saveAiConversations(trimmed);
        return trimmed;
      });
    },
    [],
  );

  useEffect(() => {
    if (messages.length > 0) {
      upsertConversation(conversationId, messages);
    }
  }, [messages, conversationId, upsertConversation]);

  const newConversation = useCallback(() => {
    setMessages([]);
    setInput("");
    setError(null);
    setConversationId(uid());
  }, []);

  const loadConversation = useCallback(
    (id: string) => {
      const c = conversations.find((x) => x.id === id);
      if (c) {
        setMessages(c.messages);
        setConversationId(id);
        setError(null);
      }
    },
    [conversations],
  );

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveAiConversations(next);
      return next;
    });
  }, []);

  const deleteAllConversations = useCallback(() => {
    setConversations(() => {
      saveAiConversations([]);
      return [];
    });
    setMessages([]);
    setConversationId(uid());
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    if (!config.baseUrl || !config.apiKey) {
      setError("请先在设置中配置 AI 服务地址与 API Key");
      return;
    }

    const userMsg: ChatMessage = { id: uid(), role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setError(null);

    setLoading(true);
    try {
      const system = buildTaskContext(tasks);
      const plan = buildRequest(config, history, system);
      const res = await doRequest(plan);

      if (!res.ok) {
        throw new Error(`请求失败（${res.status}）${res.body.slice(0, 200)}`);
      }

      const answer =
        extractAnswer(JSON.parse(res.body) as unknown, plan.format) ||
        "（模型未返回内容）";

      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "assistant", content: answer },
      ]);
    } catch (err) {
      if (err instanceof TypeError) {
        const plan = buildRequest(config, history, buildTaskContext(tasks));
        setError(
          `网络错误：无法连接到 ${plan.url}（${formatLabel(plan.format)}）。` +
            (plan.format === "anthropic"
              ? "Anthropic 官方接口禁止浏览器直连，请改用支持 CORS 的中转服务，或选择 OpenAI 兼容格式。"
              : "请检查网络、服务地址是否正确，或确认该服务允许浏览器直接调用。"),
        );
      } else {
        setError(err instanceof Error ? err.message : "请求出错，请稍后重试");
      }
    } finally {
      setLoading(false);
    }
  }, [config, input, loading, messages, tasks]);

  const testConnection = useCallback(async () => {
    if (!config.baseUrl) return "请先填写服务地址";
    if (!config.apiKey) return "请先填写 API Key";
    if (!/^sk-/i.test(config.apiKey)) {
      return "API Key 格式不正确：DeepSeek 的 Key 以 sk- 开头。请在 https://platform.deepseek.com/api_keys 创建并复制，不要把网址/邮箱粘进来。";
    }
    const plan = buildRequest(config, [
      { id: "", role: "user", content: "ping" },
    ]);
    const label = `${plan.url}（${formatLabel(plan.format)}）`;
    try {
      const res = await doRequest(plan);
      if (res.ok) return `连接成功：${label}`;
      return `连接失败（${res.status}）：${label} ${res.body.slice(0, 120)}`;
    } catch (err) {
      return err instanceof TypeError
        ? `网络错误（可能是 CORS 或网络不通）：${label}`
        : `连接失败：${label} ${
            err instanceof Error ? err.message : String(err)
          }`;
    }
  }, [config]);

  return {
    config,
    saveConfig,
    messages,
    conversations,
    newConversation,
    loadConversation,
    deleteConversation,
    deleteAllConversations,
    input,
    setInput,
    loading,
    error,
    setError,
    send,
    testConnection,
  };
}
