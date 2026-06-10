import type { Candle } from "../../core/src";

export type MarketDataProvider = {
  getDailyCandles: (symbol: string, opts: { range: "6mo" | "1y" | "2y" }) => Promise<Candle[]> | Candle[];
};

export function normalizeRange(value: string): "6mo" | "1y" | "2y" {
  if (value === "6mo" || value === "1y" || value === "2y") return value;
  return "2y";
}
