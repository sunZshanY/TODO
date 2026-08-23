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
  Switch,
  Text,
  ToggleButton,
  Tooltip,
  shorthands,
  tokens,
} from "@fluentui/react-components";
import {
  AddRegular,
  ArrowClockwiseRegular,
  ArrowDownloadRegular,
  ArrowUploadRegular,
  CheckboxCheckedRegular,
  DeleteRegular,
  DismissRegular,
  DocumentTextRegular,
  RecycleRegular,
} from "@fluentui/react-icons";
import { TaskItem } from "./TaskItem";
import { TaskFormDialog } from "./TaskFormDialog";
import { MdImportDialog } from "./MdImportDialog";
import {
  loadTaskCompleteConfig,
  parseTasks,
  saveTaskCompleteConfig,
} from "../storage";
import { timeAgo } from "../utils/date";
import { TASK_TYPE_LABEL } from "../constants";
import type {
  DeletedTask,
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
    "@media (max-width: 640px)": {
      minWidth: "110px",
      flexGrow: 1,
    },
  },
  autoDeleteWrap: {
    display: "flex",
    alignItems: "center",
    "@media (max-width: 640px)": {
      marginLeft: "auto",
    },
  },
  selectBar: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    flexWrap: "wrap",
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  selectedText: {
    flexGrow: 1,
  },
  dangerSubtle: {
    color: tokens.colorStatusDangerForeground1,
  },
  deletedItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  deletedContent: {
    flexGrow: 1,
    minWidth: 0,
  },
  deletedTitle: {
    display: "block",
    wordBreak: "break-word",
  },
  deletedDesc: {
    display: "block",
    color: tokens.colorNeutralForeground2,
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
  },
  deletedMeta: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalXS,
  },
  deletedAt: {
    color: tokens.colorNeutralForeground3,
  },
  deletedActions: {
    display: "flex",
    flexShrink: 0,
  },
  binHint: {
    color: tokens.colorNeutralForeground3,
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
  tasks: Task[];
  deleted: DeletedTask[];
  onAdd: (input: TaskInput) => void;
  onAddMany: (seeds: TaskSeed[]) => void;
  onUpdate: (id: string, input: TaskInput) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onRestoreDeleted: (record: DeletedTask) => void;
  onPurgeDeleted: (id: string) => void;
  onClearDeleted: () => void;
  onMove: (fromId: string, toId: string) => void;
  onImport: (tasks: Task[]) => void;
}

export function TaskList({
  tasks,
  deleted,
  onAdd,
  onAddMany,
  onUpdate,
  onToggle,
  onDelete,
  onRestoreDeleted,
  onPurgeDeleted,
  onClearDeleted,
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
  const [autoDelete, setAutoDelete] = useState(
    () => loadTaskCompleteConfig().autoDelete,
  );
  const [completing, setCompleting] = useState<Task | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
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

  const deletedVisible = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = [...deleted].sort((a, b) =>
      b.deletedAt.localeCompare(a.deletedAt),
    );
    if (query) {
      result = result.filter((d) => {
        const t = d.task;
        if (!t) return false;
        return (
          t.title.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query)
        );
      });
    }
    return result;
  }, [deleted, search]);

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

  const handleToggleItem = useCallback(
    (id: string, checked: boolean) => {
      if (autoDelete && checked) {
        const target = tasks.find((t) => t.id === id);
        if (target) {
          setCompleting(target);
          return;
        }
      }
      onToggle(id);
    },
    [autoDelete, onToggle, tasks],
  );

  const handleCompletingDelete = () => {
    if (completing) {
      onDelete(completing.id);
      setCompleting(null);
    }
  };

  const handleCompletingKeep = () => {
    if (completing) {
      onToggle(completing.id);
      setCompleting(null);
    }
  };

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

  const enterSelectMode = useCallback(() => {
    setSelected(new Set());
    setSelectMode(true);
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelected(new Set());
    setSelectMode(false);
  }, []);

  const toggleSelect = useCallback((id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const allVisibleSelected = useMemo(() => {
    if (visible.length === 0) return false;
    return visible.every((t) => selected.has(t.id));
  }, [visible, selected]);

  const toggleSelectAll = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const t of visible) next.delete(t.id);
      } else {
        for (const t of visible) next.add(t.id);
      }
      return next;
    });
  }, [allVisibleSelected, visible]);

  const handleDeleteSelected = () => {
    for (const id of selected) onDelete(id);
    setBulkDeleteOpen(false);
    exitSelectMode();
  };

  const handleDeleteAll = () => {
    for (const t of tasks) onDelete(t.id);
    setDeleteAllOpen(false);
  };

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
          {!showDeleted && (
            <>
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
              <Tooltip content="删除全部任务" relationship="label">
                <Button
                  appearance="subtle"
                  className={styles.dangerSubtle}
                  icon={<DeleteRegular />}
                  aria-label="删除全部任务"
                  disabled={tasks.length === 0}
                  onClick={() => setDeleteAllOpen(true)}
                />
              </Tooltip>
            </>
          )}
          <Tooltip
            content={showDeleted ? "返回任务" : `回收站（${deleted.length}）`}
            relationship="label"
          >
            <Button
              appearance={showDeleted ? "primary" : "subtle"}
              icon={<RecycleRegular />}
              aria-label="回收站"
              title={`回收站（${deleted.length}）`}
              onClick={() => {
                setShowDeleted((v) => !v);
                setSearch("");
              }}
            />
          </Tooltip>
          {!showDeleted && (
            <Button appearance="primary" icon={<AddRegular />} onClick={openCreate}>
              新建任务
            </Button>
          )}
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
          placeholder={showDeleted ? "搜索已删除的任务标题、描述或类别..." : "搜索任务标题或描述..."}
          maxLength={200}
          onChange={(e) => setSearch(e.target.value)}
        />
        {showDeleted ? (
          <Text size={200} className={styles.binHint}>
            共 {deleted.length} 项，可恢复 {deleted.filter((d) => d.task).length} 项
          </Text>
        ) : (
          <>
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
            <div className={styles.autoDeleteWrap}>
              <Switch
                size="small"
                checked={autoDelete}
                label="完成自动删除"
                onChange={(_e, data) => {
                  setAutoDelete(data.checked);
                  saveTaskCompleteConfig({ autoDelete: data.checked });
                }}
              />
            </div>
            <ToggleButton
              size="small"
              icon={<CheckboxCheckedRegular />}
              appearance={selectMode ? "primary" : "secondary"}
              checked={selectMode}
              onClick={() => (selectMode ? exitSelectMode() : enterSelectMode())}
            >
              批量选择
            </ToggleButton>
          </>
        )}
      </div>

      {selectMode && (
        <div className={styles.selectBar}>
          <Text size={200} className={styles.selectedText}>
            已选择 {selected.size} 项
          </Text>
          <Button
            size="small"
            disabled={visible.length === 0}
            onClick={toggleSelectAll}
          >
            {allVisibleSelected ? "取消全选" : "全选"}
          </Button>
          <Button
            size="small"
            appearance="primary"
            className={styles.danger}
            icon={<DeleteRegular />}
            disabled={selected.size === 0}
            onClick={() => setBulkDeleteOpen(true)}
          >
            删除所选
          </Button>
          <Button size="small" appearance="secondary" onClick={exitSelectMode}>
            退出
          </Button>
        </div>
      )}

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

      {showDeleted ? (
        deletedVisible.length === 0 ? (
          <div className={styles.empty}>
            <Text size={400}>
              {search
                ? "没有匹配的已删除任务"
                : deleted.length === 0
                  ? "回收站是空的"
                  : "暂无可以恢复的任务"}
            </Text>
            <Text size={200}>删除任务后可在此查找并恢复</Text>
          </div>
        ) : (
          <div className={styles.list}>
            {deletedVisible.map((d) => {
              const t = d.task;
              return (
                <div key={d.id} className={styles.deletedItem}>
                  <div className={styles.deletedContent}>
                    <Text
                      size={300}
                      weight="semibold"
                      className={styles.deletedTitle}
                    >
                      {t?.title ?? "（内容已无法恢复）"}
                    </Text>
                    {t?.description && (
                      <Text size={200} className={styles.deletedDesc}>
                        {t.description}
                      </Text>
                    )}
                    <div className={styles.deletedMeta}>
                      {t && (
                        <>
                          <Badge
                            appearance={
                              t.type === "schedule" ? "filled" : "outline"
                            }
                            color={t.type === "schedule" ? "brand" : undefined}
                            size="small"
                          >
                            {TASK_TYPE_LABEL[t.type]}
                          </Badge>
                          <Text size={200}>#{t.category}</Text>
                          <Badge
                            appearance="filled"
                            color={PRIORITY_TONE[t.priority]}
                            size="small"
                          >
                            {PRIORITY_LABEL[t.priority]}
                          </Badge>
                        </>
                      )}
                      <Text size={200} className={styles.deletedAt}>
                        删除于 {timeAgo(Date.parse(d.deletedAt))}
                      </Text>
                    </div>
                  </div>
                  <div className={styles.deletedActions}>
                    <Tooltip content="恢复" relationship="label">
                      <Button
                        appearance="subtle"
                        size="small"
                        icon={<ArrowClockwiseRegular />}
                        aria-label={`恢复任务：${t?.title ?? ""}`}
                        disabled={!t}
                        onClick={() => t && onRestoreDeleted(d)}
                      />
                    </Tooltip>
                    <Tooltip content="彻底删除" relationship="label">
                      <Button
                        appearance="subtle"
                        size="small"
                        icon={<DeleteRegular />}
                        aria-label={`彻底删除：${t?.title ?? ""}`}
                        className={styles.dangerSubtle}
                        onClick={() => onPurgeDeleted(d.id)}
                      />
                    </Tooltip>
                  </div>
                </div>
              );
            })}
            {deletedVisible.length > 0 && (
              <div>
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<RecycleRegular />}
                  className={styles.dangerSubtle}
                  onClick={onClearDeleted}
                >
                  清空回收站
                </Button>
              </div>
            )}
          </div>
        )
      ) : visible.length === 0 ? (
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
              selectMode={selectMode}
              selected={selected.has(task.id)}
              onToggle={handleToggleItem}
              onSelect={toggleSelect}
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
      <Dialog
        open={bulkDeleteOpen}
        onOpenChange={(_e, d) => {
          if (!d.open) setBulkDeleteOpen(false);
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>确认删除所选任务</DialogTitle>
            <DialogContent>
              <Text>
                确定要删除已选择的 {selected.size} 个任务吗？此操作不可撤销。
              </Text>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setBulkDeleteOpen(false)}>
                取消
              </Button>
              <Button
                appearance="primary"
                className={styles.danger}
                onClick={handleDeleteSelected}
              >
                确认删除
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
      <Dialog
        open={deleteAllOpen}
        onOpenChange={(_e, d) => {
          if (!d.open) setDeleteAllOpen(false);
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>确认删除全部任务</DialogTitle>
            <DialogContent>
              <Text>
                确定要删除全部 {tasks.length} 个任务吗？此操作不可撤销。
              </Text>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setDeleteAllOpen(false)}>
                取消
              </Button>
              <Button
                appearance="primary"
                className={styles.danger}
                onClick={handleDeleteAll}
              >
                确认删除
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
      <Dialog
        open={!!completing}
        onOpenChange={(_e, d) => {
          if (!d.open) setCompleting(null);
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>完成任务</DialogTitle>
            <DialogContent>
              <Text>
                任务「{completing?.title}」已完成，是否自动删除？
              </Text>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setCompleting(null)}>
                取消
              </Button>
              <Button appearance="secondary" onClick={handleCompletingKeep}>
                保留（仅完成）
              </Button>
              <Button
                appearance="primary"
                className={styles.danger}
                onClick={handleCompletingDelete}
              >
                删除
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
