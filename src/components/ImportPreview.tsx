import { useState } from "react";
import {
  Button,
  Checkbox,
  Input,
  makeStyles,
  Select,
  Text,
  tokens,
} from "@fluentui/react-components";
import { CheckmarkRegular } from "@fluentui/react-icons";
import type { ImportDraft, Priority, TaskType } from "../types";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
    width: "100%",
    padding: tokens.spacingHorizontalM,
    marginTop: tokens.spacingVerticalS,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  title: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalS,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
    maxHeight: "300px",
    overflowY: "auto",
  },
  item: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXXS,
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  itemDone: {
    opacity: 0.55,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
    flexWrap: "wrap",
  },
  titleInput: {
    flexGrow: 1,
    minWidth: "120px",
  },
  categoryInput: {
    width: "110px",
    flexShrink: 0,
  },
  typeSelect: {
    width: "88px",
    flexShrink: 0,
  },
  prioritySelect: {
    width: "60px",
    flexShrink: 0,
  },
  dateInput: {
    width: "130px",
    flexShrink: 0,
  },
  footer: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    flexWrap: "wrap",
  },
});

interface Props {
  drafts: ImportDraft[];
  onImport: (items: ImportDraft[]) => void;
}

export function ImportPreview({ drafts, onImport }: Props) {
  const styles = useStyles();
  const [items, setItems] = useState<ImportDraft[]>(() =>
    drafts.map((d) => ({ ...d })),
  );
  const [checked, setChecked] = useState<boolean[]>(() =>
    drafts.map(() => true),
  );

  const selectedCount = checked.filter(Boolean).length;

  const updateItem = (index: number, patch: Partial<ImportDraft>) => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    );
  };

  const toggleAll = () => {
    const next = selectedCount < items.length;
    setChecked(items.map(() => next));
  };

  const handleImport = () => {
    const selected = items.filter((_, i) => checked[i]);
    if (selected.length === 0) return;
    onImport(selected);
    setChecked(items.map(() => false));
  };

  return (
    <div className={styles.root}>
      <div className={styles.title}>
        <Text weight="semibold" size={300}>
          导入计划预览（{drafts.length} 项）
        </Text>
        <Checkbox
          label="全选"
          checked={selectedCount === items.length}
          onChange={toggleAll}
        />
      </div>

      <div className={styles.list}>
        {items.map((it, i) => (
          <div
            key={i}
            className={`${styles.item} ${it.completed ? styles.itemDone : ""}`}
          >
            <div className={styles.row}>
              <Checkbox
                checked={checked[i]}
                aria-label={`勾选第 ${i + 1} 项`}
                onChange={() =>
                  setChecked((prev) =>
                    prev.map((c, idx) => (idx === i ? !c : c)),
                  )
                }
              />
              <Input
                className={styles.titleInput}
                size="small"
                value={it.title}
                maxLength={200}
                onChange={(e) => updateItem(i, { title: e.target.value })}
              />
              <Checkbox
                label="完成"
                checked={!!it.completed}
                onChange={() => updateItem(i, { completed: !it.completed })}
              />
            </div>
            <div className={styles.row}>
              <Input
                className={styles.categoryInput}
                size="small"
                value={it.category}
                maxLength={50}
                placeholder="类别"
                onChange={(e) => updateItem(i, { category: e.target.value })}
              />
              <Select
                className={styles.typeSelect}
                size="small"
                value={it.type}
                onChange={(e) =>
                  updateItem(i, { type: e.target.value as TaskType })
                }
              >
                <option value="schedule">日程表</option>
                <option value="list">清单</option>
              </Select>
              <Select
                className={styles.prioritySelect}
                size="small"
                value={it.priority}
                onChange={(e) =>
                  updateItem(i, { priority: e.target.value as Priority })
                }
              >
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </Select>
              <Input
                className={styles.dateInput}
                size="small"
                type="date"
                value={it.dueDate ?? ""}
                onChange={(e) =>
                  updateItem(i, { dueDate: e.target.value || null })
                }
              />
            </div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <Button
          appearance="primary"
          size="small"
          icon={<CheckmarkRegular />}
          disabled={selectedCount === 0}
          onClick={handleImport}
        >
          导入选中项（{selectedCount}）
        </Button>
        {items.length > 0 && (
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            可勾选需要的任务，已忽略与现有任务重复的项
          </Text>
        )}
      </div>
    </div>
  );
}
