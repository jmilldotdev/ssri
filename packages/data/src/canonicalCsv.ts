import type { Candle } from "../../core/src";

export const candleCsvHeader = "date,open,high,low,close,volume";

export function serializeCandles(candles: Candle[]): string {
  const rows = candles.map((candle) =>
    [candle.date, candle.open, candle.high, candle.low, candle.close, candle.volume ?? 0].join(",")
  );
  return [candleCsvHeader, ...rows].join("\n") + "\n";
}
