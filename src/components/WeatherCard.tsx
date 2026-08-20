import { Button, makeStyles, Spinner, Text, tokens } from "@fluentui/react-components";
import { ArrowSyncRegular } from "@fluentui/react-icons";
import { useWeather } from "../hooks/useWeather";

const useStyles = makeStyles({
  card: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusMedium,
    backgroundImage: `linear-gradient(135deg, ${tokens.colorPaletteBlueBackground2} 0%, ${tokens.colorPaletteRoyalBlueBackground2} 100%)`,
    boxShadow: tokens.shadow4,
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
    flexShrink: 0,
  },
  icon: {
    fontSize: "30px",
    lineHeight: 1,
  },
  temp: {
    fontVariantNumeric: "tabular-nums",
    color: "#ffffff",
  },
  info: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    minWidth: 0,
    gap: tokens.spacingVerticalXXS,
  },
  condition: {
    color: "rgba(255, 255, 255, 0.9)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  detail: {
    display: "flex",
    gap: tokens.spacingHorizontalM,
    color: "rgba(255, 255, 255, 0.75)",
    whiteSpace: "nowrap",
  },
  city: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  refresh: {
    color: "rgba(255, 255, 255, 0.7)",
    minWidth: "auto",
    flexShrink: 0,
  },
  error: {
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
  },
});

export function WeatherCard() {
  const styles = useStyles();
  const { data, loading, error, refresh } = useWeather();

  return (
    <div className={styles.card}>
      {loading && !data ? (
        <Spinner size="extra-tiny" />
      ) : error && !data ? (
        <div className={styles.error}>
          <Text size={200}>{error}</Text>
          <br />
          <Button
            className={styles.refresh}
            appearance="transparent"
            size="small"
            icon={<ArrowSyncRegular />}
            onClick={refresh}
          >
            重试
          </Button>
        </div>
      ) : data ? (
        <>
          <div className={styles.left}>
            <div className={styles.icon}>{data.icon}</div>
            <Text size={700} weight="bold" className={styles.temp}>
              {data.temperature}°
            </Text>
          </div>
          <div className={styles.info}>
            <Text size={200} className={styles.condition}>
              {data.conditionText} · 体感 {data.apparentTemperature}°
            </Text>
            <div className={styles.detail}>
              <Text size={100}>💧 {data.humidity}%</Text>
              <Text size={100}>🌬️ {data.windSpeed}km/h</Text>
            </div>
            <Text size={100} className={styles.city}>
              {data.city || "当前位置"}
            </Text>
          </div>
          <Button
            className={styles.refresh}
            appearance="transparent"
            size="small"
            icon={<ArrowSyncRegular />}
            aria-label="刷新天气"
            onClick={refresh}
          />
        </>
      ) : null}
    </div>
  );
}
