import { Button, makeStyles, Spinner, Text, tokens } from "@fluentui/react-components";
import { ArrowSyncRegular } from "@fluentui/react-icons";
import { useWeather } from "../hooks/useWeather";

const useStyles = makeStyles({
  card: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: tokens.spacingVerticalXXS,
    paddingTop: tokens.spacingVerticalL,
    paddingBottom: tokens.spacingVerticalL,
    borderRadius: tokens.borderRadiusMedium,
    backgroundImage: `linear-gradient(135deg, ${tokens.colorPaletteBlueBackground2} 0%, ${tokens.colorPaletteRoyalBlueBackground2} 100%)`,
    boxShadow: tokens.shadow4,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
    color: "rgba(255, 255, 255, 0.7)",
  },
  icon: {
    fontSize: "40px",
    lineHeight: 1,
  },
  temp: {
    fontVariantNumeric: "tabular-nums",
    color: "#ffffff",
  },
  condition: {
    color: "rgba(255, 255, 255, 0.9)",
  },
  detail: {
    display: "flex",
    gap: tokens.spacingHorizontalM,
    color: "rgba(255, 255, 255, 0.75)",
    marginTop: tokens.spacingVerticalXXS,
  },
  city: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  error: {
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
  },
  refresh: {
    color: "rgba(255, 255, 255, 0.7)",
    minWidth: "auto",
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
          <div className={styles.header}>
            <Text size={200}>
              {data.city || "当前位置"}
            </Text>
            <Button
              className={styles.refresh}
              appearance="transparent"
              size="small"
              icon={<ArrowSyncRegular />}
              aria-label="刷新天气"
              onClick={refresh}
            />
          </div>
          <div className={styles.icon}>{data.icon}</div>
          <Text size={900} weight="bold" className={styles.temp}>
            {data.temperature}°
          </Text>
          <Text size={300} className={styles.condition}>
            {data.conditionText} · 体感 {data.apparentTemperature}°
          </Text>
          <div className={styles.detail}>
            <Text size={100}>💧 {data.humidity}%</Text>
            <Text size={100}>🌬️ {data.windSpeed}km/h</Text>
          </div>
        </>
      ) : null}
    </div>
  );
}
