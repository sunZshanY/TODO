import { useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  makeStyles,
  shorthands,
  Text,
  tokens,
} from "@fluentui/react-components";
import {
  ArrowLeftRegular,
  ArrowRightRegular,
  CalendarTodayRegular,
  ChevronDownRegular,
  ChevronRightRegular,
} from "@fluentui/react-icons";
import { dueDateKey, pad, todayKey } from "../utils/date";
import type { Task } from "../types";

type DayStatus =
  | "none"
  | "done"
  | "pending"
  | "partial"
  | "completed"
  | "overdue";

const useStyles = makeStyles({
  card: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
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
  title: {
    flexGrow: 1,
  },
  summary: {
    color: tokens.colorNeutralForeground3,
    whiteSpace: "nowrap",
  },
  navRow: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
  },
  monthTitle: {
    flexGrow: 1,
    textAlign: "center",
  },
  weekdayRow: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: tokens.spacingHorizontalXXS,
  },
  weekday: {
    textAlign: "center",
    color: tokens.colorNeutralForeground3,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: tokens.spacingHorizontalXXS,
    rowGap: tokens.spacingVerticalXXS,
  },
  cell: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: tokens.spacingVerticalXXS,
    minWidth: 0,
    paddingTop: tokens.spacingVerticalXXS,
    paddingBottom: tokens.spacingVerticalXXS,
    border: "1px solid transparent",
    borderRadius: tokens.borderRadiusMedium,
    cursor: "pointer",
    backgroundColor: "transparent",
    color: tokens.colorNeutralForeground3,
    fontFamily: "inherit",
    fontSize: tokens.fontSizeBase200,
    ":hover": {
      filter: "brightness(0.96)",
    },
  },
  emptyCell: {
    minHeight: "34px",
  },
  cellSelected: {
    outline: `2px solid ${tokens.colorBrandStroke1}`,
    outlineOffset: "1px",
  },
  cellToday: {
    ...shorthands.borderColor(tokens.colorBrandStroke1),
  },
  cellPending: {
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground1,
  },
  cellPartial: {
    backgroundColor: tokens.colorPaletteBlueBackground2,
    color: tokens.colorPaletteBlueForeground2,
  },
  cellCompleted: {
    backgroundColor: tokens.colorPaletteGreenBackground2,
    color: tokens.colorPaletteGreenForeground2,
  },
  cellOverdue: {
    backgroundColor: tokens.colorPaletteRedBackground2,
    color: tokens.colorPaletteRedForeground2,
  },
  cellBottom: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "14px",
  },
  count: {
    fontSize: tokens.fontSizeBase100,
    fontWeight: 600,
  },
  doneMark: {
    fontSize: tokens.fontSizeBase100,
    fontWeight: 700,
    color: tokens.colorPaletteGreenForeground1,
  },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    gap: tokens.spacingHorizontalS,
    rowGap: tokens.spacingVerticalXS,
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXXS,
    color: tokens.colorNeutralForeground3,
  },
  swatch: {
    width: "10px",
    height: "10px",
    borderRadius: tokens.borderRadiusSmall,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  detail: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    paddingTop: tokens.spacingVerticalS,
  },
  detailHeader: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
  },
  sectionTitle: {
    color: tokens.colorNeutralForeground3,
  },
  taskRow: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
    minWidth: 0,
  },
  taskTitle: {
    flexGrow: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  taskDone: {
    textDecoration: "line-through",
    color: tokens.colorNeutralForeground3,
  },
});

interface Props {
  tasks: Task[];
  onToggle: (id: string) => void;
}

function statusCellClass(
  styles: Record<string, string | undefined>,
  status: DayStatus,
): string | undefined {
  switch (status) {
    case "completed":
      return styles.cellCompleted;
    case "partial":
      return styles.cellPartial;
    case "overdue":
      return styles.cellOverdue;
    case "pending":
      return styles.cellPending;
    default:
      return undefined;
  }
}

export function CalendarCard({ tasks, onToggle }: Props) {
  const styles = useStyles();
  const today = todayKey();
  const [open, setOpen] = useState(false);

  const [view, setView] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState(today);

  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const start = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    const arr: (string | null)[] = [];
    for (let i = 0; i < start; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      arr.push(`${view.y}-${pad(view.m + 1)}-${pad(d)}`);
    }
    return arr;
  }, [view]);

  const { dueMap, doneMap } = useMemo(() => {
    const due = new Map<string, Task[]>();
    const done = new Map<string, Task[]>();
    for (const t of tasks) {
      const dk = dueDateKey(t.dueDate);
      if (dk) {
        const list = due.get(dk) ?? [];
        list.push(t);
        due.set(dk, list);
      }
      for (const c of t.completedDates ?? []) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(c)) continue;
        const list = done.get(c) ?? [];
        list.push(t);
        done.set(c, list);
      }
    }
    return { dueMap: due, doneMap: done };
  }, [tasks]);

  const dayStatus = (key: string): DayStatus => {
    const due = dueMap.get(key) ?? [];
    const done = doneMap.get(key) ?? [];
    if (due.length === 0) return done.length > 0 ? "done" : "none";
    const completedCount = due.filter((t) => t.completed).length;
    if (due.some((t) => !t.completed && key < today)) return "overdue";
    if (completedCount === due.length) return "completed";
    if (completedCount > 0) return "partial";
    return "pending";
  };

  const move = (delta: number) => {
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const goToday = () => {
    const d = new Date();
    setView({ y: d.getFullYear(), m: d.getMonth() });
    setSelected(today);
  };

  const selDue = dueMap.get(selected) ?? [];
  const selDone = doneMap.get(selected) ?? [];
  const todayDue = dueMap.get(today) ?? [];
  const todayDone = doneMap.get(today) ?? [];
  const [sy, sm, sd] = selected.split("-").map(Number);
  const selWeekday = new Date(sy, sm - 1, sd).getDay();
  const weekdayNames = ["日", "一", "二", "三", "四", "五", "六"];

  const legend: { swatch?: string; label: string }[] = [
    { swatch: "green", label: "全部完成" },
    { swatch: "blue", label: "部分完成" },
    { swatch: "gray", label: "待完成" },
    { swatch: "red", label: "有逾期" },
    { label: "✓ 当日完成记录" },
  ];

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Button
          appearance="subtle"
          size="small"
          icon={open ? <ChevronDownRegular /> : <ChevronRightRegular />}
          aria-label={open ? "收起日程表" : "展开日程表"}
          title={open ? "收起日程表" : "展开日程表"}
          onClick={() => setOpen((v) => !v)}
        />
        <Text size={300} weight="semibold" className={styles.title}>
          📅 日程表
        </Text>
        {!open && (
          <Text size={100} className={styles.summary}>
            今日到期 {todayDue.length} · 完成 {todayDone.length}
          </Text>
        )}
        {open && (
          <div className={styles.navRow}>
            <Button
              appearance="subtle"
              size="small"
              icon={<ArrowLeftRegular />}
              aria-label="上个月"
              title="上个月"
              onClick={() => move(-1)}
            />
            <Button
              appearance="subtle"
              size="small"
              icon={<ArrowRightRegular />}
              aria-label="下个月"
              title="下个月"
              onClick={() => move(1)}
            />
            <Button
              appearance="subtle"
              size="small"
              icon={<CalendarTodayRegular />}
              aria-label="回到今天"
              title="回到今天"
              onClick={goToday}
            />
          </div>
        )}
      </div>

      {open && (
        <>
          <div className={styles.weekdayRow}>
            {weekdayNames.map((w, i) => (
              <Text key={i} size={100} className={styles.weekday}>
                {w}
              </Text>
            ))}
          </div>

          <div className={styles.grid}>
            {cells.map((key, i) => {
              if (!key) return <div key={`e${i}`} className={styles.emptyCell} />;
              const status = dayStatus(key);
              const due = dueMap.get(key) ?? [];
              const done = doneMap.get(key) ?? [];
              const isToday = key === today;
              const isSelected = key === selected;
              return (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  className={`${styles.cell} ${statusCellClass(styles, status)} ${
                    isToday ? styles.cellToday : ""
                  } ${isSelected ? styles.cellSelected : ""}`}
                  onClick={() => setSelected(key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setSelected(key);
                  }}
                >
                  <span>{Number(key.slice(8))}</span>
                  <div className={styles.cellBottom}>
                    {due.length > 0 ? (
                      <span className={styles.count}>{due.length}</span>
                    ) : done.length > 0 ? (
                      <span className={styles.doneMark}>✓</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.legend}>
            {legend.map((item, i) => (
              <div key={i} className={styles.legendItem}>
                {item.swatch ? (
                  <span
                    className={styles.swatch}
                    style={{
                      backgroundColor:
                        item.swatch === "green"
                          ? tokens.colorPaletteGreenForeground1
                          : item.swatch === "blue"
                            ? tokens.colorBrandBackground
                            : item.swatch === "gray"
                              ? tokens.colorNeutralStroke2
                              : tokens.colorPaletteRedForeground1,
                    }}
                  />
                ) : (
                  <span className={styles.doneMark}>✓</span>
                )}
                <Text size={100}>{item.label}</Text>
              </div>
            ))}
          </div>

          <div className={styles.detail}>
            <div className={styles.detailHeader}>
              <Text size={200} weight="semibold">
                {view.y}年{view.m + 1}月 {Number(selected.slice(8))}日 星期
                {weekdayNames[selWeekday]}
              </Text>
              {selected === today && (
                <Text size={100} className={styles.sectionTitle}>
                  （今天）
                </Text>
              )}
            </div>
            {selDue.length === 0 && selDone.length === 0 ? (
              <Text size={200} className={styles.sectionTitle}>
                当天暂无到期任务与完成记录
              </Text>
            ) : (
              <>
                {selDue.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <Text size={100} className={styles.sectionTitle}>
                      🗓 到期任务（{selDue.length}）
                    </Text>
                    {selDue.map((t) => (
                      <div key={t.id} className={styles.taskRow}>
                        <Checkbox
                          checked={t.completed}
                          aria-label={`切换任务：${t.title}`}
                          title="切换完成状态"
                          onChange={() => onToggle(t.id)}
                        />
                        <Text
                          size={200}
                          className={`${styles.taskTitle} ${
                            t.completed ? styles.taskDone : ""
                          }`}
                        >
                          {t.title}
                        </Text>
                      </div>
                    ))}
                  </div>
                )}
                {selDone.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <Text size={100} className={styles.sectionTitle}>
                      ✓ 当日完成（{selDone.length}）
                    </Text>
                    {selDone.map((t) => (
                      <div key={t.id} className={styles.taskRow}>
                        <span className={styles.doneMark}>✓</span>
                        <Text
                          size={200}
                          className={`${styles.taskTitle} ${styles.taskDone}`}
                        >
                          {t.title}
                        </Text>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
