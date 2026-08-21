import { useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Divider,
  Dropdown,
  Field,
  Input,
  Option,
  makeStyles,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Spinner,
  Text,
  Textarea,
  tokens,
} from "@fluentui/react-components";
import {
  AddRegular,
  BotRegular,
  ClipboardTaskAddRegular,
  DeleteRegular,
  DismissRegular,
  SendRegular,
  SettingsRegular,
} from "@fluentui/react-icons";
import { useAiChat } from "../hooks/useAiChat";
import { useAiImport } from "../hooks/useAiImport";
import { ImportPreview } from "./ImportPreview";
import { dedupeDrafts, extractDrafts } from "../utils/importTasks";
import type { AiApiFormat, ImportDraft, Task, TaskInput } from "../types";
import { timeAgo } from "../utils/date";

const FORMAT_OPTIONS: { key: AiApiFormat; label: string }[] = [
  { key: "auto", label: "自动识别" },
  { key: "anthropic", label: "Anthropic 格式" },
  { key: "openai", label: "OpenAI 兼容格式" },
];

const useStyles = makeStyles({
  panel: {
    display: "flex",
    flexDirection: "column",
    minHeight: "200px",
    flexGrow: 1,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow4,
    overflow: "hidden",
  },  header: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalXS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXXS,
    marginLeft: "auto",
  },
  messages: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingHorizontalM,
    overflowY: "auto",
    flexGrow: 1,
    minHeight: 0,
  },
  bubble: {
    maxWidth: "85%",
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusMedium,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  user: {
    alignSelf: "flex-end",
    color: tokens.colorNeutralForegroundOnBrand,
    backgroundColor: tokens.colorBrandBackground,
  },
  assistant: {
    alignSelf: "flex-start",
    backgroundColor: tokens.colorNeutralBackground3,
  },
  empty: {
    margin: "auto",
    textAlign: "center",
    color: tokens.colorNeutralForeground3,
  },
  error: {
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
  },
  inputArea: {
    display: "flex",
    gap: tokens.spacingHorizontalXS,
    padding: tokens.spacingHorizontalM,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  input: {
    flexGrow: 1,
  },
  loading: {
    alignSelf: "flex-start",
    paddingLeft: tokens.spacingHorizontalS,
  },
  settingsForm: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
  historyList: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXXS,
    maxHeight: "180px",
    overflowY: "auto",
  },
  historyItem: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
    minWidth: 0,
  },
  historyTitle: {
    flexGrow: 1,
    justifyContent: "flex-start",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  importPlanInput: {
    width: "100%",
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
  success: {
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
  },
});

export function AiPanel({
  tasks,
  onImportTasks,
}: {
  tasks: Task[];
  onImportTasks: (inputs: TaskInput[]) => void;
}) {
  const styles = useStyles();
  const {
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
  } = useAiChat(tasks);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [baseUrl, setBaseUrl] = useState(config.baseUrl);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [model, setModel] = useState(config.model);
  const [apiFormat, setApiFormat] = useState<AiApiFormat>(config.apiFormat);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [draftsVersion, setDraftsVersion] = useState(0);
  const {
    plan,
    setPlan,
    drafts,
    setDrafts,
    loading: importLoading,
    error: importError,
    setError: setImportError,
    raw,
    generate,
    reset: resetImport,
  } = useAiImport(tasks, config);

  const importableMessages = useMemo(() => {
    const result: { messageId: string; drafts: ImportDraft[] }[] = [];
    for (const m of messages) {
      if (m.role !== "assistant") continue;
      const parsed = extractDrafts(m.content);
      if (parsed.length === 0) continue;
      result.push({ messageId: m.id, drafts: dedupeDrafts(parsed, tasks) });
    }
    return result;
  }, [messages, tasks]);

  const handleImportTasks = (items: ImportDraft[]) => {
    if (items.length === 0) return;
    onImportTasks(items);
    setImportSuccess(`已导入 ${items.length} 个任务`);
  };

  const openImport = () => {
    resetImport();
    setImportOpen(true);
  };

  const handleImportInDialog = (items: ImportDraft[]) => {
    handleImportTasks(items);
    const importedTitles = new Set(items.map((it) => it.title.trim()));
    setDrafts((prev) =>
      prev.filter((d) => !importedTitles.has(d.title.trim())),
    );
    setDraftsVersion((v) => v + 1);
  };

  const openSettings = () => {
    setBaseUrl(config.baseUrl);
    setApiKey(config.apiKey);
    setModel(config.model);
    setApiFormat(config.apiFormat);
    setSettingsOpen(true);
  };

  const saveSettings = () => {
    saveConfig({
      baseUrl: baseUrl.trim() || config.baseUrl,
      apiKey: apiKey.trim(),
      model: model.trim() || config.model,
      apiFormat,
    });
    setSettingsOpen(false);
  };

  const handleTest = async () => {
    saveConfig({
      baseUrl: baseUrl.trim() || config.baseUrl,
      apiKey: apiKey.trim(),
      model: model.trim() || config.model,
      apiFormat,
    });
    setTesting(true);
    setTestResult(null);
    const result = await testConnection();
    setTestResult(result);
    setTesting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      send();
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <BotRegular />
        <Text weight="semibold">AI 助手</Text>
        <div className={styles.headerActions}>
          <Button
            appearance="subtle"
            size="small"
            icon={<ClipboardTaskAddRegular />}
            title="AI 导入计划"
            aria-label="AI 导入计划"
            onClick={openImport}
          />
          <Button
            appearance="subtle"
            size="small"
            icon={<AddRegular />}
            title="新对话"
            aria-label="新对话"
            onClick={newConversation}
          />
          <Button
            appearance="subtle"
            size="small"
            icon={<SettingsRegular />}
            title="AI 设置"
            aria-label="AI 设置"
            onClick={openSettings}
          />
        </div>
      </div>

      <div className={styles.messages}>
        {messages.length === 0 && !loading ? (
          <div className={styles.empty}>
            <Text size={400}>你好，我是 AI 助手</Text>
            <br />
            <Text size={200}>可以帮你拆解任务、优化描述、提供建议</Text>
            <br />
            <Text size={200}>
              点击上方 📋 按钮，可让 AI 把一段计划直接生成为待办任务
            </Text>
            <br />
            <Text size={200}>
              当前已注入 {tasks.length} 条待办计划，可结合计划回答你的问题
            </Text>
          </div>
        ) : (
          messages.map((m) => {
            const embed =
              m.role === "assistant"
                ? importableMessages.find((x) => x.messageId === m.id)
                : undefined;
            return (
              <div key={m.id}>
                <div
                  className={`${styles.bubble} ${m.role === "user" ? styles.user : styles.assistant}`}
                >
                  <Text size={300}>{m.content}</Text>
                </div>
                {embed && embed.drafts.length > 0 && (
                  <ImportPreview
                    drafts={embed.drafts}
                    onImport={handleImportTasks}
                  />
                )}
              </div>
            );
          })
        )}
        {loading && (
          <div className={styles.loading}>
            <Spinner size="tiny" label="思考中..." />
          </div>
        )}
      </div>

      {error && (
        <div className={styles.error}>
          <MessageBar intent="error">
            <MessageBarBody>{error}</MessageBarBody>
            <MessageBarActions>
              <Button
                appearance="transparent"
                icon={<DismissRegular />}
                aria-label="关闭提示"
                onClick={() => setError(null)}
              />
            </MessageBarActions>
          </MessageBar>
        </div>
      )}

      {importSuccess && (
        <div className={styles.success}>
          <MessageBar intent="success">
            <MessageBarBody>{importSuccess}</MessageBarBody>
            <MessageBarActions>
              <Button
                appearance="transparent"
                icon={<DismissRegular />}
                aria-label="关闭提示"
                onClick={() => setImportSuccess(null)}
              />
            </MessageBarActions>
          </MessageBar>
        </div>
      )}

      <div className={styles.inputArea}>
        <Input
          className={styles.input}
          value={input}
          placeholder="输入消息，Enter 发送"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={2000}
        />
        <Button
          appearance="primary"
          icon={<SendRegular />}
          aria-label="发送"
          onClick={send}
        />
      </div>

      <Dialog open={settingsOpen} onOpenChange={(_e, d) => setSettingsOpen(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>AI 服务设置</DialogTitle>
            <DialogContent>
              <div className={styles.settingsForm}>
                <Field label="服务地址（Base URL）">
                  <Input
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.deepseek.com"
                  />
                </Field>
                <Field label="API Key">
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    autoComplete="off"
                  />
                </Field>
                <Field label="模型">
                  <Input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="claude-sonnet-4-20250514 / gpt-4o"
                  />
                </Field>
                <Field label="接口格式">
                  <Dropdown
                    value={
                      FORMAT_OPTIONS.find((o) => o.key === apiFormat)?.label
                    }
                    selectedOptions={[apiFormat]}
                    onOptionSelect={(_e, data) =>
                      setApiFormat(data.optionValue as AiApiFormat)
                    }
                  >
                    {FORMAT_OPTIONS.map((o) => (
                      <Option key={o.key} value={o.key}>
                        {o.label}
                      </Option>
                    ))}
                  </Dropdown>
                </Field>
                <Text size={200}>
                  DeepSeek 地址请填 https://api.deepseek.com（不是
                  platform.deepseek.com 控制台）。自动识别：地址含 anthropic
                  用 Anthropic 格式，否则用 OpenAI 兼容格式。
                </Text>
                <Button
                  appearance="secondary"
                  icon={<SettingsRegular />}
                  disabled={testing}
                  onClick={handleTest}
                >
                  {testing ? "测试中..." : "测试连接"}
                </Button>
                {testResult && <Text size={200}>{testResult}</Text>}
                <Divider />
                <Text weight="semibold">历史对话（{conversations.length}）</Text>
                {conversations.length === 0 ? (
                  <Text size={200}>暂无历史对话</Text>
                ) : (
                  <div className={styles.historyList}>
                    {conversations.map((c) => (
                      <div key={c.id} className={styles.historyItem}>
                        <Button
                          appearance="subtle"
                          size="small"
                          className={styles.historyTitle}
                          title={c.title}
                          onClick={() => {
                            loadConversation(c.id);
                            setSettingsOpen(false);
                          }}
                        >
                          {c.title}
                        </Button>
                        <Text size={100}>{timeAgo(c.updatedAt)}</Text>
                        <Button
                          appearance="subtle"
                          size="small"
                          icon={<DeleteRegular />}
                          aria-label="删除该对话"
                          title="删除该对话"
                          onClick={() => deleteConversation(c.id)}
                        />
                      </div>
                    ))}
                  </div>
                )}
                {conversations.length > 0 && (
                  <Button
                    appearance="secondary"
                    size="small"
                    icon={<DeleteRegular />}
                    onClick={deleteAllConversations}
                  >
                    删除全部历史
                  </Button>
                )}
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setSettingsOpen(false)}>
                取消
              </Button>
              <Button appearance="primary" onClick={saveSettings}>
                保存
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog
        open={importOpen}
        onOpenChange={(_e, d) => {
          if (!d.open) {
            setImportOpen(false);
            setImportSuccess(null);
          }
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>AI 导入计划</DialogTitle>
            <DialogContent>
              <div className={styles.settingsForm}>
                <Field label="描述你的计划">
                  <Textarea
                    className={styles.importPlanInput}
                    value={plan}
                    maxLength={4000}
                    placeholder="例如：下周准备搬家，帮我整理成待办任务，包括联系搬家公司、打包行李、预约水电过户、通知房东退租等"
                    rows={4}
                    onChange={(e) => setPlan(e.target.value)}
                  />
                </Field>
                <Button
                  appearance="primary"
                  icon={<BotRegular />}
                  disabled={importLoading}
                  onClick={() => generate(plan)}
                >
                  {importLoading ? "AI 生成中..." : "AI 生成计划"}
                </Button>

                {importLoading && <Spinner size="small" label="正在拆解计划..." />}

                {importError && (
                  <MessageBar intent="warning">
                    <MessageBarBody>{importError}</MessageBarBody>
                    <MessageBarActions>
                      <Button
                        appearance="transparent"
                        icon={<DismissRegular />}
                        aria-label="关闭提示"
                        onClick={() => setImportError(null)}
                      />
                    </MessageBarActions>
                  </MessageBar>
                )}

                {raw && drafts.length === 0 && (
                  <details>
                    <summary>查看 AI 原始返回</summary>
                    <Text as="pre" size={200} className={styles.rawBlock}>
                      {raw}
                    </Text>
                  </details>
                )}

                {drafts.length > 0 && (
                  <ImportPreview
                    key={draftsVersion}
                    drafts={drafts}
                    onImport={handleImportInDialog}
                  />
                )}

                {importSuccess && (
                  <MessageBar intent="success">
                    <MessageBarBody>{importSuccess}</MessageBarBody>
                  </MessageBar>
                )}
              </div>
            </DialogContent>
            <DialogActions>
              <Button
                appearance="secondary"
                onClick={() => {
                  setImportOpen(false);
                  setImportSuccess(null);
                }}
              >
                关闭
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
