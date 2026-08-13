import { Suspense, lazy, useState } from "react";
import {
  Button,
  FluentProvider,
  Text,
  makeStyles,
  tokens,
  webDarkTheme,
  webLightTheme,
} from "@fluentui/react-components";
import {
  WeatherMoonRegular,
  WeatherSunnyRegular,
} from "@fluentui/react-icons";
import { TimeCard } from "./components/TimeCard";
import { WeatherCard } from "./components/WeatherCard";
import { TaskList } from "./components/TaskList";
import { useTasks } from "./hooks/useTasks";
import { loadThemeMode, saveThemeMode, toggleThemeMode } from "./theme";

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
  },
});

export default function App() {
  const styles = useStyles();
  const [dark, setDark] = useState(() => loadThemeMode() === "dark");
  const {
    tasks,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    moveTask,
    importTasks,
  } = useTasks();

  const toggleTheme = () => {
    setDark((prev) => {
      const next = toggleThemeMode(prev ? "dark" : "light");
      saveThemeMode(next);
      return next === "dark";
    });
  };

  return (
    <FluentProvider theme={dark ? webDarkTheme : webLightTheme}>
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
              onClick={toggleTheme}
            >
              {dark ? "浅色模式" : "深色模式"}
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
