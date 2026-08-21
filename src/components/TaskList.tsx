import { useCallback, useMemo, useRef, useState } from "react";
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
  shorthands,
  tokens,
} from "@fluentui/react-components";
import {
  AddRegular,
  ArrowDownloadRegular,
  ArrowUploadRegular,
  DismissRegular,
  DocumentTextRegular,
} from "@fluentui/react-icons";
import { TaskItem } from "./TaskItem";
import { TaskFormDialog } from "./TaskFormDialog";
import { MdImportDialog } from "./MdImportDialog";
import { parseTasks } from "../storage";
import type {
  Filter,
  Priority,
  SortKey,
  Task,
  TaskInput,
  TaskSeed,
} from "../types";

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
    "@media (max-width: 640px)": {
      flexWrap: "wrap",
      rowGap: tokens.spacingVerticalXS,
    },
  },
  counts: {
    display: "flex",
    gap: tokens.spacingHorizontalXS,
    "@media (max-width: 640px)": {
      display: "none",
    },
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
    "@media (max-width: 640px)": {
      rowGap: tokens.spacingVerticalXS,
    },
  },
  search: {
    flexGrow: 1,
    minWidth: "200px",
    "@media (max-width: 640px)": {
      minWidth: "100%",
      flexGrow: 0,
    },
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
  danger: {
    backgroundColor: tokens.colorStatusDangerBackground1,
    ...shorthands.borderColor(tokens.colorStatusDangerBackground1),
    color: tokens.colorStatusDangerForeground1,
    ":hover": {
      backgroundColor: tokens.colorStatusDangerBackground2,
      ...shorthands.borderColor(tokens.colorStatusDangerBackground2),
    },
    ":active": {
      backgroundColor: tokens.colorStatusDangerBackground3,
      ...shorthands.borderColor(tokens.colorStatusDangerBackground3),
    },
  },
});

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "active", label: "进行中" },
  { key: "completed", label: "已完成" },
];

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

interface Props {
  tasks: Task[];
  onAdd: (input: TaskInput) => void;
  onAddMany: (seeds: TaskSeed[]) => void;
  onUpdate: (id: string, input: TaskInput) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (fromId: string, toId: string) => void;
  onImport: (tasks: Task[]) => void;
}

export function TaskList({
  tasks,
  onAdd,
  onAddMany,
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
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [mdOpen, setMdOpen] = useState(false);
  const [mdText, setMdText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const mdFileRef = useRef<HTMLInputElement>(null);
  const dragIdRef = useRef<string | null>(null);

  const categories = useMemo(() => {
    const map = new Map<string, { count: number; type: Task["type"] }>();
    for (const t of tasks) {
      const existing = map.get(t.category);
      if (existing) {
        existing.count++;
      } else {
        map.set(t.category, { count: 1, type: t.type });
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [tasks]);

  const activeCategory = categories.find(([name]) => name === categoryFilter)?.[1];

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    let list = tasks.filter((t) => {
      if (filter === "active") return !t.completed;
      if (filter === "completed") return t.completed;
      return true;
    });

    if (categoryFilter) {
      list = list.filter((t) => t.category === categoryFilter);
    }

    if (query) {
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query),
      );
    }

    if (sort === "custom") {
      if (categoryFilter && activeCategory?.type === "schedule") {
        return [...list].sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        });
      }
      return list;
    }

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
  }, [tasks, filter, sort, search, categoryFilter, activeCategory]);

  const activeCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.length - activeCount;

  const openCreate = () => {
    setEditing(null);
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

  const handleToggleItem = useCallback((id: string) => onToggle(id), [onToggle]);

  const handleEditItem = useCallback((task: Task) => {
    setEditing(task);
    setFormOpen(true);
  }, []);

  const handleDeleteItem = useCallback(
    (id: string) => {
      const target = tasks.find((t) => t.id === id);
      if (target) setDeleting(target);
    },
    [tasks],
  );

  const handleDragStart = useCallback((id: string) => {
    dragIdRef.current = id;
    setDragId(id);
  }, []);

  const handleDragOver = useCallback((id: string) => {
    setDragOverId((prev) => (prev === id ? prev : id));
  }, []);

  const handleDragEnd = useCallback(() => {
    dragIdRef.current = null;
    setDragId(null);
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback(
    (targetId: string) => {
      const from = dragIdRef.current;
      if (from && from !== targetId) {
        onMove(from, targetId);
      }
      dragIdRef.current = null;
      setDragId(null);
      setDragOverId(null);
    },
    [onMove],
  );

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

  const handleMdFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setMdText(String(reader.result ?? ""));
      setMdOpen(true);
      if (mdFileRef.current) mdFileRef.current.value = "";
    };
    reader.onerror = () => {
      setImportError("读取 MD 文件失败");
      if (mdFileRef.current) mdFileRef.current.value = "";
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
          <Tooltip content="导入 Markdown" relationship="label">
            <Button
              appearance="subtle"
              icon={<DocumentTextRegular />}
              aria-label="导入 Markdown"
              title="从 Markdown 导入任务"
              onClick={() => mdFileRef.current?.click()}
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
      <input
        ref={mdFileRef}
        type="file"
        accept=".md,.markdown,.txt,text/markdown"
        style={{ display: "none" }}
        onChange={(e) => handleMdFile(e.target.files?.[0])}
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
        <Select
          className={styles.sortSelect}
          size="small"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">全部类别</option>
          {categories.map(([name, meta]) => (
            <option key={name} value={name}>
              {name}（{meta.count}）
            </option>
          ))}
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
              onToggle={handleToggleItem}
              onEdit={handleEditItem}
              onDelete={handleDeleteItem}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDrop={handleDrop}
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

      <MdImportDialog
        open={mdOpen}
        initialText={mdText}
        tasks={tasks}
        onClose={() => setMdOpen(false)}
        onImport={onAddMany}
      />

      <Dialog
        open={!!deleting}
        onOpenChange={(_e, d) => {
          if (!d.open) setDeleting(null);
        }}
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
                className={styles.danger}
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
