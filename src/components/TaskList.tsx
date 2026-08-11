import { useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Input,
  makeStyles,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Select,
  Text,
  ToggleButton,
  Tooltip,
  tokens,
} from "@fluentui/react-components";
import {
  AddRegular,
  ArrowDownloadRegular,
  ArrowUploadRegular,
  DismissRegular,
} from "@fluentui/react-icons";
import { TaskItem } from "./TaskItem";
import { TaskFormDialog } from "./TaskFormDialog";
import { parseTasks } from "../storage";
import type { Filter, SortKey, Task, TaskInput } from "../types";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
    maxWidth: "760px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
  },
  counts: {
    display: "flex",
    gap: tokens.spacingHorizontalXS,
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXXS,
    marginLeft: "auto",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    flexWrap: "wrap",
  },
  search: {
    flexGrow: 1,
    minWidth: "200px",
  },
  sortSelect: {
    minWidth: "140px",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: tokens.spacingVerticalS,
    paddingTop: "120px",
    color: tokens.colorNeutralForeground3,
  },
});

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "active", label: "进行中" },
  { key: "completed", label: "已完成" },
];

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

interface Props {
  tasks: Task[];
  onAdd: (input: TaskInput) => void;
  onUpdate: (id: string, input: TaskInput) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (fromId: string, toId: string) => void;
  onImport: (tasks: Task[]) => void;
}

export function TaskList({
  tasks,
  onAdd,
  onUpdate,
  onToggle,
  onDelete,
  onMove,
  onImport,
}: Props) {
  const styles = useStyles();
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<SortKey>("custom");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    let list = tasks.filter((t) => {
      if (filter === "active") return !t.completed;
      if (filter === "completed") return t.completed;
      return true;
    });

    if (query) {
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query),
      );
    }

    if (sort === "custom") return list;

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "priority":
          return (
            (PRIORITY_ORDER[a.priority] ?? 1) -
            (PRIORITY_ORDER[b.priority] ?? 1)
          );
        case "due_date": {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        }
        case "created":
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });

    return list;
  }, [tasks, filter, sort, search]);

  const activeCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.length - activeCount;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setFormOpen(true);
  };

  const handleSave = (input: TaskInput) => {
    if (editing) {
      onUpdate(editing.id, input);
    } else {
      onAdd(input);
    }
  };

  const handleDelete = () => {
    if (deleting) {
      onDelete(deleting.id);
      setDeleting(null);
    }
  };

  const startDelete = (id: string) => {
    const target = tasks.find((t) => t.id === id);
    if (target) setDeleting(target);
  };

  const clearDrag = () => {
    setDragId(null);
    setDragOverId(null);
  };

  const handleDrop = (targetId: string) => {
    if (dragId && dragId !== targetId) {
      onMove(dragId, targetId);
    }
    clearDrag();
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `todo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        onImport(parseTasks(String(reader.result)));
        setImportError(null);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : "导入失败，请检查文件格式");
      } finally {
        if (fileRef.current) fileRef.current.value = "";
      }
    };
    reader.onerror = () => {
      setImportError("读取文件失败");
      if (fileRef.current) fileRef.current.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Text size={500} weight="bold">
          任务清单
        </Text>
        <div className={styles.counts}>
          <Badge appearance="outline" color="informative" size="small">
            全部 {tasks.length}
          </Badge>
          <Badge appearance="outline" color="brand" size="small">
            进行中 {activeCount}
          </Badge>
          <Badge appearance="outline" color="success" size="small">
            已完成 {completedCount}
          </Badge>
        </div>
        <div className={styles.headerActions}>
          <Tooltip content="导出任务" relationship="label">
            <Button
              appearance="subtle"
              icon={<ArrowDownloadRegular />}
              aria-label="导出任务"
              onClick={handleExport}
            />
          </Tooltip>
          <Tooltip content="导入任务" relationship="label">
            <Button
              appearance="subtle"
              icon={<ArrowUploadRegular />}
              aria-label="导入任务"
              onClick={() => fileRef.current?.click()}
            />
          </Tooltip>
          <Button appearance="primary" icon={<AddRegular />} onClick={openCreate}>
            新建任务
          </Button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: "none" }}
        onChange={(e) => handleImportFile(e.target.files?.[0])}
      />

      <div className={styles.toolbar}>
        <Input
          className={styles.search}
          value={search}
          placeholder="搜索任务标题或描述..."
          maxLength={200}
          onChange={(e) => setSearch(e.target.value)}
        />
        {FILTERS.map((f) => (
          <ToggleButton
            key={f.key}
            size="small"
            appearance={filter === f.key ? "primary" : "secondary"}
            checked={filter === f.key}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </ToggleButton>
        ))}
        <Select
          className={styles.sortSelect}
          size="small"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
        >
          <option value="custom">自定义顺序</option>
          <option value="created">按创建时间</option>
          <option value="priority">按优先级</option>
          <option value="due_date">按截止日期</option>
        </Select>
      </div>

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

      {visible.length === 0 ? (
        <div className={styles.empty}>
          <Text size={400}>
            📝{" "}
            {search
              ? "没有匹配的任务"
              : filter === "all"
                ? "还没有任务"
                : filter === "active"
                  ? "暂无进行中的任务"
                  : "暂无已完成的任务"}
          </Text>
          <Text size={200}>点击右上角「新建任务」开始规划吧</Text>
        </div>
      ) : (
        <div className={styles.list}>
          {visible.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              dragging={dragId === task.id}
              dragOver={dragOverId === task.id && dragId !== task.id}
              onToggle={onToggle}
              onEdit={openEdit}
              onDelete={startDelete}
              onDragStart={() => setDragId(task.id)}
              onDragOver={() => setDragOverId(task.id)}
              onDragEnd={clearDrag}
              onDrop={() => handleDrop(task.id)}
            />
          ))}
        </div>
      )}

      <TaskFormDialog
        open={formOpen}
        task={editing}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />

      <Dialog
        open={!!deleting}
        onOpenChange={(_e, d) => (d.open ? undefined : setDeleting(null))}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>确认删除</DialogTitle>
            <DialogContent>
              <Text>
                确定要删除任务「{deleting?.title}」吗？此操作不可撤销。
              </Text>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setDeleting(null)}>
                取消
              </Button>
              <Button
                appearance="primary"
                style={{
                  backgroundColor: tokens.colorStatusDangerBackground1,
                  borderColor: tokens.colorStatusDangerBackground1,
                }}
                onClick={handleDelete}
              >
                确认删除
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
