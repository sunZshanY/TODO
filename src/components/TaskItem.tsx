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
import type { Priority, Task } from "../types";
import { formatDueDate, isOverdue } from "../utils/date";

const useStyles = makeStyles({
  card: {
    display: "flex",
    alignItems: "flex-start",
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    width: "100%",
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
  overdue: {
    color: tokens.colorStatusDangerForeground1,
  },
  actions: {
    display: "flex",
    gap: tokens.spacingHorizontalXXS,
    flexShrink: 0,
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
  onToggle: (id: string) => void;
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
  onToggle,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver: handleDragOver,
  onDragEnd,
  onDrop,
}: Props) {
  const styles = useStyles();

  const overdue = isOverdue(task.dueDate, task.completed);
  const due = formatDueDate(task.dueDate);

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
      <Checkbox
        checked={task.completed}
        aria-label={task.completed ? "标记为未完成" : "标记为已完成"}
        onChange={() => onToggle(task.id)}
      />

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
            appearance="filled"
            color={PRIORITY_TONE[task.priority]}
            size="small"
          >
            {PRIORITY_LABEL[task.priority]}
          </Badge>
          {due && (
            <Text size={200} className={overdue ? styles.overdue : undefined}>
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
