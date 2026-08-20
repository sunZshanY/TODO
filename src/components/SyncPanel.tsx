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
  Link,
  makeStyles,
  Select,
  Spinner,
  Switch,
  Text,
  Tooltip,
  tokens,
} from "@fluentui/react-components";
import {
  ArrowDownloadRegular,
  ArrowUploadRegular,
  ArrowSyncRegular,
  CloudCheckmarkRegular,
  CloudErrorRegular,
  CloudRegular,
  SettingsRegular,
} from "@fluentui/react-icons";
import type { SyncConfig, SyncStatus } from "../types";
import { useSync } from "../hooks/useSync";
import type { DeletedTask, SyncData, Task } from "../types";

const useStyles = makeStyles({
  card: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow4,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
  },
  status: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXXS,
    minHeight: "20px",
    color: tokens.colorNeutralForeground3,
  },
  statusSuccess: {
    color: tokens.colorStatusSuccessForeground1,
  },
  statusError: {
    color: tokens.colorStatusDangerForeground1,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXXS,
  },
  grow: {
    flexGrow: 1,
  },
  link: {
    color: tokens.colorBrandForegroundLink,
    textDecoration: "none",
    ":hover": { textDecoration: "underline" },
  },
});

interface Props {
  tasks: Task[];
  deleted: DeletedTask[];
  onApplySync: (data: SyncData) => void;
}

const STATUS_ICON: Record<SyncStatus, React.ReactNode> = {
  idle: <CloudRegular />,
  syncing: <Spinner size="extra-tiny" />,
  success: <CloudCheckmarkRegular />,
  error: <CloudErrorRegular />,
};

export function SyncPanel({ tasks, deleted, onApplySync }: Props) {
  const styles = useStyles();
  const { config, status, message, lastSyncAt, saveConfig, syncBoth, syncUp, syncDown } =
    useSync(tasks, deleted, onApplySync);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState<SyncConfig>(config);

  const openSettings = () => {
    setDraft(config);
    setSettingsOpen(true);
  };

  const handleSave = () => {
    saveConfig(draft);
    setSettingsOpen(false);
  };

  const statusClass =
    status === "success"
      ? styles.statusSuccess
      : status === "error"
        ? styles.statusError
        : undefined;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        {STATUS_ICON[status]}
        <Text size={300} weight="semibold" className={styles.grow}>
          云端同步
        </Text>
        <Tooltip content="同步设置" relationship="label">
          <Button
            appearance="subtle"
            size="small"
            icon={<SettingsRegular />}
            aria-label="同步设置"
            onClick={openSettings}
          />
        </Tooltip>
      </div>

      <div className={`${styles.status}${statusClass ? ` ${statusClass}` : ""}`}>
        <Text size={100}>
          {message ||
            (lastSyncAt
              ? `上次同步：${new Date(lastSyncAt).toLocaleString()}`
              : "配置 GitHub Gist 后即可多端同步")}
        </Text>
      </div>

      <div className={styles.actions}>
        <Button
          appearance="primary"
          size="small"
          icon={<ArrowSyncRegular />}
          onClick={() => void syncBoth()}
        >
          同步
        </Button>
        <Tooltip content="上传到云端" relationship="label">
          <Button
            appearance="subtle"
            size="small"
            icon={<ArrowUploadRegular />}
            aria-label="上传到云端"
            onClick={() => void syncUp()}
          />
        </Tooltip>
        <Tooltip content="从云端下载" relationship="label">
          <Button
            appearance="subtle"
            size="small"
            icon={<ArrowDownloadRegular />}
            aria-label="从云端下载"
            onClick={() => void syncDown()}
          />
        </Tooltip>
      </div>

      <Dialog open={settingsOpen} onOpenChange={(_e, d) => setSettingsOpen(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>云端同步设置</DialogTitle>
            <DialogContent>
              <Field label="GitHub Token" size="small">
                <Input
                  type="password"
                  value={draft.token}
                  placeholder="ghp_...（需要 gist 权限）"
                  onChange={(e) => setDraft({ ...draft, token: e.target.value })}
                />
              </Field>
              <Field label="Gist ID（可选）" size="small">
                <Input
                  value={draft.gistId}
                  placeholder="留空则首次同步时自动创建"
                  onChange={(e) => setDraft({ ...draft, gistId: e.target.value.trim() })}
                />
              </Field>
              <Field size="small">
                <Switch
                  label="自动同步"
                  checked={draft.autoSync}
                  onChange={(e) => setDraft({ ...draft, autoSync: e.currentTarget.checked })}
                />
              </Field>
              <Field label="自动同步间隔" size="small">
                <Select
                  value={String(draft.intervalMinutes)}
                  onChange={(e) =>
                    setDraft({ ...draft, intervalMinutes: Number(e.target.value) })
                  }
                >
                  <option value="1">1 分钟</option>
                  <option value="5">5 分钟</option>
                  <option value="15">15 分钟</option>
                  <option value="30">30 分钟</option>
                  <option value="60">1 小时</option>
                </Select>
              </Field>
              <Text size={100}>
                Token 可在{" "}
                <Link
                  className={styles.link}
                  href="https://github.com/settings/tokens/new?scopes=gist"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub 创建 Token
                </Link>{" "}
                页面生成，只需勾选 gist 权限。Token 仅保存在本机浏览器中。
              </Text>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setSettingsOpen(false)}>
                取消
              </Button>
              <Button appearance="primary" onClick={handleSave}>
                保存
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
