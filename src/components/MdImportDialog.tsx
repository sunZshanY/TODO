import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Spinner,
  Text,
  Textarea,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { ArrowSyncRegular, DismissRegular, SparkleRegular } from "@fluentui/react-icons";
import { ImportPreview } from "./ImportPreview";
import { parseMdTasks } from "../utils/mdImport";
import { buildOptimizeSystem } from "../utils/importTasks";
import { useAiImport } from "../hooks/useAiImport";
import { loadAiConfig } from "../storage";
import type { ImportDraft, Task, TaskSeed } from "../types";

const useStyles = makeStyles({
  form: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
  editor: {
    width: "100%",
  },
  actionRow: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    flexWrap: "wrap",
  },
  rawBlock: {
    display: "block",
    maxHeight: "120px",
    overflowY: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    padding: tokens.spacingHorizontalM,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
    fontSize: "12px",
  },
});

interface Props {
  open: boolean;
  initialText: string;
  tasks: Task[];
  onClose: () => void;
  onImport: (seeds: TaskSeed[]) => void;
}

type Source = "local" | "ai";

export function MdImportDialog({
  open,
  initialText,
  tasks,
  onClose,
  onImport,
}: Props) {
  const styles = useStyles();
  const [text, setText] = useState(initialText);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [source, setSource] = useState<Source>("local");
  const config = useMemo(() => loadAiConfig(), [open]);
  const {
    drafts: aiDrafts,
    setDrafts: setAiDrafts,
    loading: aiLoading,
    error: aiError,
    setError: setAiError,
    raw,
    generate,
  } = useAiImport(tasks, config);

  useEffect(() => {
    if (open) {
      setText(initialText);
      setSuccess(null);
      setSource("local");
      setAiError(null);
      setAiDrafts([]);
    }
  }, [open, initialText, setAiError, setAiDrafts]);

  const localDrafts = useMemo<ImportDraft[]>(
    () => (open && text.trim() ? parseMdTasks(text) : []),
    [text, open],
  );

  const drafts = source === "ai" ? aiDrafts : localDrafts;

  const handleOptimize = async () => {
    if (localDrafts.length === 0) return;
    const result = await generate(JSON.stringify(localDrafts), {
      system: buildOptimizeSystem(tasks),
    });
    if (result && result.length > 0) setSource("ai");
  };

  const handleImport = (items: ImportDraft[]) => {
    onImport(items);
    setSuccess(`已导入 ${items.length} 个任务`);
    setPreviewKey((k) => k + 1);
  };

  const handleRestore = () => {
    setSource("local");
    setAiError(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(_e, d) => {
        if (!d.open) onClose();
      }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>从 Markdown 导入任务</DialogTitle>
          <DialogContent>
            <div className={styles.form}>
              <Text size={200}>
                支持 `## 标题` 分组、`- [ ]` / `- [x]` 复选框，以及内联标记
                `[高][中][低]` 优先级、`@2026-08-21` 日期、`/说明/`
                描述。含日期的分组自动识别为「日程表」类型。
              </Text>
              <Textarea
                className={styles.editor}
                value={text}
                maxLength={20000}
                rows={6}
                placeholder={`# 我的计划\n\n## 工作\n- [x] 完成周报 /本周总结/\n- [ ] 预约会议室 [高] @2026-08-24\n\n## 生活\n- [ ] 购买日用品`}
                onChange={(e) => {
                  setText(e.target.value);
                  setSuccess(null);
                  if (source === "ai") handleRestore();
                }}
              />

              <div className={styles.actionRow}>
                <Button
                  appearance="primary"
                  icon={<SparkleRegular />}
                  disabled={aiLoading || localDrafts.length === 0}
                  onClick={handleOptimize}
                >
                  {source === "ai" ? "重新 AI 优化" : "AI 优化计划"}
                </Button>
                {source === "ai" && (
                  <Button
                    appearance="secondary"
                    icon={<ArrowSyncRegular />}
                    disabled={aiLoading}
                    onClick={handleRestore}
                  >
                    恢复本地解析
                  </Button>
                )}
                {source === "ai" && (
                  <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                    已由 AI 优化：完善标题/优先级/日期/类别，并与现有任务去重
                  </Text>
                )}
              </div>

              {aiLoading && (
                <Spinner size="small" label="AI 正在优化计划..." />
              )}

              {aiError && (
                <MessageBar intent="warning">
                  <MessageBarBody>{aiError}</MessageBarBody>
                  <MessageBarActions>
                    <Button
                      appearance="transparent"
                      icon={<DismissRegular />}
                      aria-label="关闭提示"
                      onClick={() => setAiError(null)}
                    />
                  </MessageBarActions>
                </MessageBar>
              )}

              {raw && aiDrafts.length === 0 && source === "ai" && (
                <details>
                  <summary>查看 AI 原始返回</summary>
                  <Text as="pre" size={200} className={styles.rawBlock}>
                    {raw}
                  </Text>
                </details>
              )}

              {drafts.length > 0 ? (
                <ImportPreview
                  key={`${previewKey}-${source}`}
                  drafts={drafts}
                  onImport={handleImport}
                />
              ) : (
                !aiLoading && (
                  <MessageBar intent="info">
                    <MessageBarBody>
                      未解析到任务。请确认使用 `- [ ] 任务内容` 的复选框语法。
                    </MessageBarBody>
                  </MessageBar>
                )
              )}

              {success && (
                <MessageBar intent="success">
                  <MessageBarBody>{success}</MessageBarBody>
                  <MessageBarActions>
                    <Button
                      appearance="transparent"
                      icon={<DismissRegular />}
                      aria-label="关闭提示"
                      onClick={() => setSuccess(null)}
                    />
                  </MessageBarActions>
                </MessageBar>
              )}
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>
              关闭
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
