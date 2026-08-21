import { Suspense, lazy, useEffect, useState } from "react";
import {
  Button,
  FluentProvider,
  Tab,
  TabList,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  WeatherMoonRegular,
  WeatherSunnyRegular,
} from "@fluentui/react-icons";
import { TimeCard } from "./components/TimeCard";
import { WeatherCard } from "./components/WeatherCard";
import { SyncPanel } from "./components/SyncPanel";
import { TaskList } from "./components/TaskList";
import { useTasks } from "./hooks/useTasks";
import {
  THEME_MODE_LABEL,
  appDarkTheme,
  appLightTheme,
  loadThemeMode,
  nextThemeMode,
  saveThemeMode,
  subscribeSystemTheme,
  systemPrefersDark,
  type ThemeMode,
} from "./theme";

const AiPanel = lazy(() =>
  import("./components/AiPanel").then((m) => ({ default: m.AiPanel })),
);

const useStyles = makeStyles({
  root: {
    display: "flex",
    height: "100vh",
    backgroundColor: tokens.colorNeutralBackground2,
    "@media (max-width: 768px)": {
      flexDirection: "column",
    },
  },
  mobileTabBar: {
    display: "flex",
    alignItems: "center",
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
  },
  hidden: {
    display: "none",
  },
  sidebar: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    width: "340px",
    flexShrink: 0,
    minHeight: 0,
    padding: tokens.spacingVerticalL,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    overflowY: "auto",
    "@media (max-width: 900px)": {
      width: "280px",
    },
    "@media (max-width: 768px)": {
      width: "100%",
      flexGrow: 1,
      borderRight: "none",
      padding: tokens.spacingVerticalM,
      gap: tokens.spacingVerticalM,
    },
  },
  sidebarFooter: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: tokens.spacingVerticalXS,
    color: tokens.colorNeutralForeground3,
  },
  aiFallback: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "120px",
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow4,
    color: tokens.colorNeutralForeground3,
  },
  main: {
    flexGrow: 1,
    minWidth: 0,
    minHeight: 0,
    padding: tokens.spacingVerticalXXL,
    paddingLeft: tokens.spacingVerticalXXXL,
    paddingRight: tokens.spacingVerticalXXXL,
    overflowY: "auto",
    "@media (max-width: 640px)": {
      padding: tokens.spacingVerticalL,
      paddingLeft: tokens.spacingHorizontalM,
      paddingRight: tokens.spacingHorizontalM,
    },
  },
});

type MobileTab = "tasks" | "tools";

function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia(`(max-width: ${breakpoint}px)`).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);
  return isMobile;
}

export default function App() {
  const styles = useStyles();
  const [mode, setMode] = useState<ThemeMode>(() => loadThemeMode());
  const [systemDark, setSystemDark] = useState(() => systemPrefersDark());
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<MobileTab>("tasks");
  const {
    tasks,
    deleted,
    addTask,
    addTasks,
    updateTask,
    toggleTask,
    deleteTask,
    moveTask,
    importTasks,
    applySyncData,
  } = useTasks();

  useEffect(
    () => subscribeSystemTheme(() => setSystemDark(systemPrefersDark())),
    [],
  );

  const dark = mode === "dark" || (mode === "system" && systemDark);

  const cycleTheme = () => {
    setMode((prev) => {
      const next = nextThemeMode(prev);
      saveThemeMode(next);
      return next;
    });
  };

  return (
    <FluentProvider theme={dark ? appDarkTheme : appLightTheme}>
      <div className={styles.root}>
        {isMobile && (
          <div className={styles.mobileTabBar}>
            <TabList
              selectedValue={tab}
              onTabSelect={(_e, data) => setTab(data.value as MobileTab)}
            >
              <Tab value="tasks">任务</Tab>
              <Tab value="tools">工具</Tab>
            </TabList>
          </div>
        )}
        <aside
          className={isMobile && tab !== "tools" ? styles.hidden : styles.sidebar}
        >
          <TimeCard />
          <WeatherCard />
          <Suspense fallback={<div className={styles.aiFallback}>AI 助手加载中...</div>}>
            <AiPanel tasks={tasks} onImportTasks={addTasks} />
          </Suspense>
          <SyncPanel tasks={tasks} deleted={deleted} onApplySync={applySyncData} />
          <div className={styles.sidebarFooter}>
            <Button
              appearance="subtle"
              size="small"
              icon={dark ? <WeatherSunnyRegular /> : <WeatherMoonRegular />}
              onClick={cycleTheme}
            >
              主题：{THEME_MODE_LABEL[mode]}
            </Button>
            <Text size={100}>TODO · Fluent Design</Text>
          </div>
        </aside>

        <main
          className={isMobile && tab !== "tasks" ? styles.hidden : styles.main}
        >
          <TaskList
            tasks={tasks}
            onAdd={addTask}
            onAddMany={addTasks}
            onUpdate={updateTask}
            onToggle={toggleTask}
            onDelete={deleteTask}
            onMove={moveTask}
            onImport={importTasks}
          />
        </main>
      </div>
    </FluentProvider>
  );
}
