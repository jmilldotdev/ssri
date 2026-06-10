import type { SeriesPoint } from "./schema";

export function sma(series: SeriesPoint[], period: number): SeriesPoint[] {
  return series.map((point, index) => {
    if (index + 1 < period) return { time: point.time, value: null };
    const window = series.slice(index + 1 - period, index + 1).map((item) => item.value);
    if (window.some((value) => value == null)) return { time: point.time, value: null };
    const total = window.reduce((sum, value) => sum + Number(value), 0);
    return { time: point.time, value: round(total / period) };
  });
}

export function rsi(series: SeriesPoint[], period: number): SeriesPoint[] {
  let avgGain = 0;
  let avgLoss = 0;

  return series.map((point, index) => {
    if (index === 0 || point.value == null || series[index - 1]?.value == null) {
      return { time: point.time, value: null };
    }

    const change = point.value - Number(series[index - 1].value);
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);

    if (index <= period) {
      avgGain += gain;
      avgLoss += loss;
      if (index < period) return { time: point.time, value: null };
      avgGain /= period;
      avgLoss /= period;
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    if (avgLoss === 0) return { time: point.time, value: 100 };
    const rs = avgGain / avgLoss;
    return { time: point.time, value: round(100 - 100 / (1 + rs)) };
  });
}

export function crossesAbove(a: SeriesPoint[], b: SeriesPoint[]): boolean[] {
  return a.map((point, index) => {
    if (index === 0) return false;
    const prevA = a[index - 1]?.value;
    const prevB = b[index - 1]?.value;
    const currentA = point.value;
    const currentB = b[index]?.value;
    if (prevA == null || prevB == null || currentA == null || currentB == null) return false;
    return prevA <= prevB && currentA > currentB;
  });
}

export function lt(series: SeriesPoint[], threshold: number): boolean[] {
  return series.map((point) => point.value != null && point.value < threshold);
}

export function all(conditions: boolean[][]): boolean[] {
  const longest = Math.max(0, ...conditions.map((condition) => condition.length));
  return Array.from({ length: longest }, (_, index) => conditions.every((condition) => Boolean(condition[index])));
}

export function closeSeries(candles: Array<{ date: string; close: number }>): SeriesPoint[] {
  return candles.map((candle) => ({ time: candle.date, value: candle.close }));
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}
