import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  makeStyles,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Spinner,
  Text,
  tokens,
} from "@fluentui/react-components";
import {
  BotRegular,
  DeleteRegular,
  DismissRegular,
  SendRegular,
  SettingsRegular,
} from "@fluentui/react-icons";
import { useAiChat } from "../hooks/useAiChat";

const useStyles = makeStyles({
  panel: {
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    flexGrow: 1,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow4,
    overflow: "hidden",
  },
  header: {
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
});

export function AiPanel() {
  const styles = useStyles();
  const {
    config,
    saveConfig,
    messages,
    clearChat,
    input,
    setInput,
    loading,
    error,
    setError,
    send,
  } = useAiChat();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [baseUrl, setBaseUrl] = useState(config.baseUrl);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [model, setModel] = useState(config.model);

  const openSettings = () => {
    setBaseUrl(config.baseUrl);
    setApiKey(config.apiKey);
    setModel(config.model);
    setSettingsOpen(true);
  };

  const saveSettings = () => {
    saveConfig({
      baseUrl: baseUrl.trim() || config.baseUrl,
      apiKey: apiKey.trim(),
      model: model.trim() || config.model,
    });
    setSettingsOpen(false);
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
            icon={<DeleteRegular />}
            title="清空对话"
            aria-label="清空对话"
            onClick={clearChat}
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
                    placeholder="https://api.anthropic.com"
                  />
                </Field>
                <Field label="API Key">
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-ant-api03-..."
                    autoComplete="off"
                  />
                </Field>
                <Field label="模型">
                  <Input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="claude-sonnet-4-20250514"
                  />
                </Field>
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
