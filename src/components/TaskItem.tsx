import { memo } from "react";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  makeStyles,
  Text,
  Tooltip,
  tokens,
} from "@fluentui/react-components";
import { DeleteRegular, EditRegular } from "@fluentui/react-icons";
import { DUE_TIME_VISIBLE_DAYS, TASK_TYPE_LABEL } from "../constants";
import type { Priority, Task } from "../types";
import { dueWithinDays, formatDueDate, isOverdue } from "../utils/date";

const useStyles = makeStyles({
  card: {
    display: "flex",
    alignItems: "flex-start",
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    width: "100%",
    "@media (max-width: 480px)": {
      gap: tokens.spacingHorizontalXS,
      paddingTop: tokens.spacingVerticalXS,
      paddingBottom: tokens.spacingVerticalXS,
    },
  },
  completed: {
    opacity: 0.6,
  },
  dragging: {
    opacity: 0.4,
  },
  dragOver: {
    boxShadow: tokens.shadow4,
  },
  content: {
    flexGrow: 1,
    minWidth: 0,
    cursor: "pointer",
  },
  title: {
    display: "block",
    wordBreak: "break-word",
  },
  titleDone: {
    textDecoration: "line-through",
    color: tokens.colorNeutralForeground3,
  },
  desc: {
    display: "block",
    color: tokens.colorNeutralForeground2,
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
  },
  meta: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalXS,
  },
  category: {
    color: tokens.colorNeutralForeground3,
  },
  scheduleDate: {
    color: tokens.colorBrandForeground1,
    fontWeight: 600,
  },
  overdue: {
    color: tokens.colorStatusDangerForeground1,
  },
  actions: {
    display: "flex",
    gap: tokens.spacingHorizontalXXS,
    flexShrink: 0,
    "@media (max-width: 480px)": {
      gap: tokens.spacingHorizontalXXS,
    },
  },
});

const PRIORITY_LABEL: Record<Priority, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

const PRIORITY_TONE: Record<Priority, "danger" | "warning" | "success"> = {
  high: "danger",
  medium: "warning",
  low: "success",
};

interface Props {
  task: Task;
  dragging: boolean;
  dragOver: boolean;
  selectMode?: boolean;
  selected?: boolean;
  onToggle: (id: string, checked: boolean) => void;
  onSelect?: (id: string, checked: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (id: string) => void;
}

export const TaskItem = memo(function TaskItem({
  task,
  dragging,
  dragOver,
  selectMode = false,
  selected = false,
  onToggle,
  onSelect,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver: handleDragOver,
  onDragEnd,
  onDrop,
}: Props) {
  const styles = useStyles();

  const overdue = isOverdue(task.dueDate, task.completed);
  const due = formatDueDate(
    task.dueDate,
    dueWithinDays(task.dueDate, DUE_TIME_VISIBLE_DAYS),
  );

  return (
    <Card
      className={`${styles.card} ${task.completed ? styles.completed : ""} ${dragging ? styles.dragging : ""} ${dragOver ? styles.dragOver : ""}`}
      appearance="outline"
      draggable
      onDragStart={() => onDragStart(task.id)}
      onDragOver={(e) => {
        e.preventDefault();
        handleDragOver(task.id);
      }}
      onDragEnd={onDragEnd}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(task.id);
      }}
    >
      {selectMode ? (
        <Checkbox
          checked={selected}
          aria-label="选择任务"
          title="选择任务"
          onChange={(_e, data) => onSelect?.(task.id, data.checked === true)}
        />
      ) : (
        <Checkbox
          checked={task.completed}
          aria-label={task.completed ? "标记为未完成" : "标记为已完成"}
          onChange={(_e, data) => onToggle(task.id, data.checked === true)}
        />
      )}

      <div className={styles.content} onClick={() => onEdit(task)}>
        <Text
          size={300}
          weight="semibold"
          className={`${styles.title} ${task.completed ? styles.titleDone : ""}`}
        >
          {task.title}
        </Text>
        {task.description && (
          <Text size={200} className={styles.desc}>
            {task.description}
          </Text>
        )}
        <div className={styles.meta}>
          <Badge
            appearance={task.type === "schedule" ? "filled" : "outline"}
            color={task.type === "schedule" ? "brand" : undefined}
            size="small"
          >
            {TASK_TYPE_LABEL[task.type]}
          </Badge>
          <Text size={200} className={styles.category}>
            #{task.category}
          </Text>
          <Badge
            appearance="filled"
            color={PRIORITY_TONE[task.priority]}
            size="small"
          >
            {PRIORITY_LABEL[task.priority]}
          </Badge>
          {due && (
            <Text
              size={200}
              className={
                overdue
                  ? styles.overdue
                  : task.type === "schedule"
                    ? styles.scheduleDate
                    : undefined
              }
            >
              📅 {due}
              {overdue ? " ⚠️ 已逾期" : ""}
            </Text>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        <Tooltip content="编辑" relationship="label">
          <Button
            appearance="subtle"
            size="small"
            icon={<EditRegular />}
            aria-label={`编辑任务：${task.title}`}
            onClick={() => onEdit(task)}
          />
        </Tooltip>
        <Tooltip content="删除" relationship="label">
          <Button
            appearance="subtle"
            size="small"
            icon={<DeleteRegular />}
            aria-label={`删除任务：${task.title}`}
            onClick={() => onDelete(task.id)}
          />
        </Tooltip>
      </div>
    </Card>
  );
});
