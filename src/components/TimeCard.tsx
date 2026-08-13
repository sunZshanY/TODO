import { makeStyles, Text, tokens } from "@fluentui/react-components";
import { useClock } from "../hooks/useClock";
import { WEEKDAYS, formatClock, formatDate, greeting } from "../utils/date";

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

  const { hh, mm, ss } = formatClock(now);
  const date = formatDate(now);

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
