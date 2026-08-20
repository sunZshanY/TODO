import { useState } from "react";
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
  tokens,
} from "@fluentui/react-components";
import {
  AddRegular,
  BotRegular,
  DeleteRegular,
  DismissRegular,
  SendRegular,
  SettingsRegular,
} from "@fluentui/react-icons";
import { useAiChat } from "../hooks/useAiChat";
import type { AiApiFormat, Task } from "../types";
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
});

export function AiPanel({ tasks }: { tasks: Task[] }) {
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
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`${styles.bubble} ${m.role === "user" ? styles.user : styles.assistant}`}
            >
              <Text size={300}>{m.content}</Text>
            </div>
          ))
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
    </div>
  );
}
