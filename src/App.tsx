import { Suspense, lazy, useEffect, useState } from "react";
import {
  Button,
  FluentProvider,
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
  },
  sidebar: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    width: "340px",
    flexShrink: 0,
    padding: tokens.spacingVerticalL,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    overflowY: "auto",
    "@media (max-width: 900px)": {
      width: "280px",
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

export default function App() {
  const styles = useStyles();
  const [mode, setMode] = useState<ThemeMode>(() => loadThemeMode());
  const [systemDark, setSystemDark] = useState(() => systemPrefersDark());
  const {
    tasks,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    moveTask,
    importTasks,
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
        <aside className={styles.sidebar}>
          <TimeCard />
          <WeatherCard />
          <Suspense fallback={<div className={styles.aiFallback}>AI 助手加载中...</div>}>
            <AiPanel />
          </Suspense>
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

        <main className={styles.main}>
          <TaskList
            tasks={tasks}
            onAdd={addTask}
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
