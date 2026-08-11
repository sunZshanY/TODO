import { makeStyles, Text, tokens } from "@fluentui/react-components";
import { useClock } from "../hooks/useClock";

const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

const pad = (n: number) => String(n).padStart(2, "0");

function greeting(hour: number): string {
  if (hour < 6) return "夜深了，注意休息";
  if (hour < 9) return "早上好";
  if (hour < 12) return "上午好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";
  if (hour < 22) return "晚上好";
  return "夜深了，注意休息";
}

const useStyles = makeStyles({
  card: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: tokens.spacingVerticalS,
    paddingTop: tokens.spacingVerticalXXL,
    paddingBottom: tokens.spacingVerticalXXL,
    borderRadius: tokens.borderRadiusMedium,
    color: tokens.colorNeutralForegroundOnBrand,
    backgroundImage: `linear-gradient(135deg, ${tokens.colorBrandBackground} 0%, ${tokens.colorBrandBackgroundPressed} 100%)`,
    boxShadow: tokens.shadow8,
  },
  greeting: {
    color: "rgba(255, 255, 255, 0.85)",
  },
  time: {
    fontVariantNumeric: "tabular-nums",
    letterSpacing: tokens.spacingHorizontalXS,
  },
  meta: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
  },
  date: {
    color: "rgba(255, 255, 255, 0.9)",
    fontVariantNumeric: "tabular-nums",
  },
  weekday: {
    paddingTop: tokens.spacingVerticalXXS,
    paddingBottom: tokens.spacingVerticalXXS,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    color: "#ffffff",
    fontSize: tokens.fontSizeBase100,
  },
});

export function TimeCard() {
  const now = useClock();

  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  const date = `${now.getFullYear()}年${pad(now.getMonth() + 1)}月${pad(now.getDate())}日`;

  const styles = useStyles();

  return (
    <div className={styles.card}>
      <Text size={300} className={styles.greeting}>
        {greeting(now.getHours())}
      </Text>
      <Text size={900} weight="bold" className={styles.time}>
        {hh}:{mm}:{ss}
      </Text>
      <div className={styles.meta}>
        <Text size={300} className={styles.date}>
          {date}
        </Text>
        <span className={styles.weekday}>{WEEKDAYS[now.getDay()]}</span>
      </div>
    </div>
  );
}
