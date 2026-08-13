import { useCallback, useEffect, useState } from "react";
import type { WeatherData } from "../types";
import { STORAGE_KEYS, WEATHER_CACHE_TTL } from "../constants";

const POSITION_TIMEOUT = 8000;

const WMO_CODES: Record<number, { text: string; icon: string }> = {
  0: { text: "晴朗", icon: "☀️" },
  1: { text: "少云", icon: "🌤️" },
  2: { text: "多云", icon: "⛅" },
  3: { text: "阴", icon: "☁️" },
  45: { text: "雾", icon: "🌫️" },
  48: { text: "雾凇", icon: "🌫️" },
  51: { text: "小毛毛雨", icon: "🌦️" },
  53: { text: "毛毛雨", icon: "🌦️" },
  55: { text: "大毛毛雨", icon: "🌧️" },
  61: { text: "小雨", icon: "🌧️" },
  63: { text: "中雨", icon: "🌧️" },
  65: { text: "大雨", icon: "🌧️" },
  66: { text: "小冻雨", icon: "🌨️" },
  67: { text: "冻雨", icon: "🌨️" },
  71: { text: "小雪", icon: "🌨️" },
  73: { text: "中雪", icon: "❄️" },
  75: { text: "大雪", icon: "❄️" },
  77: { text: "雪粒", icon: "❄️" },
  80: { text: "小阵雨", icon: "🌦️" },
  81: { text: "阵雨", icon: "🌧️" },
  82: { text: "大阵雨", icon: "🌧️" },
  85: { text: "小阵雪", icon: "🌨️" },
  86: { text: "阵雪", icon: "🌨️" },
  95: { text: "雷暴", icon: "⛈️" },
  96: { text: "雷暴伴小冰雹", icon: "⛈️" },
  99: { text: "雷暴伴大冰雹", icon: "⛈️" },
};

function getCondition(code: number) {
  return WMO_CODES[code] ?? { text: "未知", icon: "🌈" };
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("浏览器不支持地理位置"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: POSITION_TIMEOUT,
      maximumAge: 10 * 60 * 1000,
    });
  });
}

async function reverseCity(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=zh`,
      { headers: { "User-Agent": "TODO-Fluent/1.0" } },
    );
    if (!res.ok) return "";
    const data = (await res.json()) as {
      name?: string;
      address?: { city?: string; town?: string; village?: string; county?: string };
    };
    const addr = data.address;
    if (addr) {
      const locality = addr.city || addr.town || addr.village || addr.county || data.name;
      return locality || "";
    }
    return data.name || "";
  } catch {
    return "";
  }
}

async function fetchWeather(): Promise<WeatherData | null> {
  try {
    const pos = await getPosition();
    const { latitude, longitude } = pos.coords;

    const [weatherRes, city] = await Promise.all([
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto&forecast_days=1`,
      ),
      reverseCity(latitude, longitude),
    ]);

    if (!weatherRes.ok) return null;
    const data = (await weatherRes.json()) as {
      current: {
        temperature_2m: number;
        apparent_temperature: number;
        relative_humidity_2m: number;
        weather_code: number;
        wind_speed_10m: number;
      };
      timezone?: string;
    };

    const { text, icon } = getCondition(data.current.weather_code);

    return {
      temperature: Math.round(data.current.temperature_2m),
      apparentTemperature: Math.round(data.current.apparent_temperature),
      humidity: data.current.relative_humidity_2m,
      windSpeed: Math.round(data.current.wind_speed_10m),
      weatherCode: data.current.weather_code,
      conditionText: text,
      icon,
      city,
      updatedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

function loadCache(): WeatherData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.weather);
    if (!raw) return null;
    const cached = JSON.parse(raw) as WeatherData;
    if (Date.now() - cached.updatedAt > WEATHER_CACHE_TTL) return null;
    return cached;
  } catch {
    return null;
  }
}

function saveCache(data: WeatherData) {
  try {
    localStorage.setItem(STORAGE_KEYS.weather, JSON.stringify(data));
  } catch {
    // 忽略存储异常
  }
}

export function useWeather() {
  const [data, setData] = useState<WeatherData | null>(loadCache);
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await fetchWeather();
    if (result) {
      saveCache(result);
      setData(result);
    } else {
      setError("无法获取天气数据");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!data || Date.now() - data.updatedAt > WEATHER_CACHE_TTL) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, error, refresh };
}
