import { useCallback, useRef, useState } from "react";
import type { AiConfig, ChatMessage, ImportDraft, Task } from "../types";
import { buildRequest, doRequest, extractAnswer, formatLabel } from "../utils/ai";
import {
  buildImportSystem,
  dedupeDrafts,
  extractDrafts,
} from "../utils/importTasks";

const IMPORT_MAX_TOKENS = 4096;

interface GenerateOptions {
  system?: string;
}

export function useAiImport(tasks: Task[], config: AiConfig) {
  const [plan, setPlan] = useState("");
  const [drafts, setDrafts] = useState<ImportDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [raw, setRaw] = useState<string | null>(null);
  const lastSystemRef = useRef<string | null>(null);

  const generate = useCallback(
    async (text: string, options?: GenerateOptions): Promise<ImportDraft[] | undefined> => {
      const trimmed = text.trim();
      if (!trimmed) {
        setError("请先输入计划内容");
        return undefined;
      }
      if (!config.baseUrl || !config.apiKey) {
        setError("请先在设置中配置 AI 服务地址与 API Key");
        return undefined;
      }

      const system = options?.system ?? buildImportSystem(tasks);
      lastSystemRef.current = system;

      setPlan(trimmed);
      setDrafts([]);
      setRaw(null);
      setError(null);
      setLoading(true);

      const history: ChatMessage[] = [
        { id: "", role: "user", content: trimmed },
      ];

      try {
        const request = buildRequest(config, history, system, IMPORT_MAX_TOKENS);
        const res = await doRequest(request);

        if (!res.ok) {
          throw new Error(
            `请求失败（${res.status}）${res.body.slice(0, 200)}`,
          );
        }

        const answer =
          extractAnswer(JSON.parse(res.body) as unknown, request.format) || "";
        setRaw(answer);

        const parsed = extractDrafts(answer);
        const deduped = dedupeDrafts(parsed, tasks);
        setDrafts(deduped);

        if (parsed.length === 0) {
          setError("未能从 AI 返回中解析出任务，请重试或换一种描述方式。");
        } else if (deduped.length === 0) {
          setError("AI 生成的任务与已有任务重复，无需重复导入。");
        } else if (deduped.length < parsed.length) {
          setError(
            `已过滤 ${parsed.length - deduped.length} 项与现有任务重复的内容。`,
          );
        }

        return deduped;
      } catch (err) {
        if (err instanceof TypeError) {
          const request = buildRequest(
            config,
            history,
            lastSystemRef.current ?? buildImportSystem(tasks),
            IMPORT_MAX_TOKENS,
          );
          setError(
            `网络错误：无法连接到 ${request.url}（${formatLabel(
              request.format,
            )}）。` +
              (request.format === "anthropic"
                ? "Anthropic 官方接口禁止浏览器直连，请改用支持 CORS 的中转服务，或选择 OpenAI 兼容格式。"
                : "请检查网络、服务地址是否正确，或确认该服务允许浏览器直接调用。"),
          );
        } else {
          setError(
            err instanceof Error
              ? err.message
              : "请求出错，请检查网络或稍后重试",
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [config, tasks],
  );

  const reset = useCallback(() => {
    setPlan("");
    setDrafts([]);
    setRaw(null);
    setError(null);
  }, []);

  return {
    plan,
    setPlan,
    drafts,
    setDrafts,
    loading,
    error,
    setError,
    raw,
    generate,
    reset,
  };
}
