import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Candle } from "../../core/src";
import { normalizeRange, type MarketDataProvider } from "./providers";

const here = dirname(fileURLToPath(import.meta.url));
const fixtureDir = resolve(here, "../fixtures");

export class FixtureProvider implements MarketDataProvider {
  getDailyCandles(symbol: string, opts: { range: "6mo" | "1y" | "2y" }): Candle[] {
    const normalized = symbol.trim().toUpperCase() || "SPY";
    const path = resolve(fixtureDir, `${normalized}.csv`);
    const candles = existsSync(path) ? parseCandles(readFileSync(path, "utf8")) : syntheticCandles(normalized);
    return trimRange(candles, normalizeRange(opts.range));
  }
}

export function getFixtureCandles(symbol: string, range = "2y"): Candle[] {
  return new FixtureProvider().getDailyCandles(symbol, { range: normalizeRange(range) });
}

export function parseCandles(csv: string): Candle[] {
  const rows = csv.trim().split(/\r?\n/);
  const header = rows.shift()?.split(",").map((part) => part.trim().toLowerCase()) ?? [];
  const index = (name: string) => header.indexOf(name);
  const required = ["date", "open", "high", "low", "close"];
  const missing = required.filter((name) => index(name) < 0);
  if (missing.length) {
    throw new Error(`Fixture CSV must use canonical header date,open,high,low,close,volume. Missing: ${missing.join(", ")}`);
  }

  return rows
    .map((row) => row.split(",").map((part) => part.trim()))
    .filter((parts) => parts.length >= 5)
    .map((parts) => ({
      date: parts[index("date")],
      open: Number(parts[index("open")]),
      high: Number(parts[index("high")]),
      low: Number(parts[index("low")]),
      close: Number(parts[index("close")]),
      volume: Number(parts[index("volume")] ?? 0)
    }))
    .filter((candle) => candle.date && Number.isFinite(candle.close));
}

export function syntheticCandles(symbol: string, days = 520): Candle[] {
  const seed = [...symbol].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const base = 80 + (seed % 80);
  let previousClose = base;
  const start = new Date("2024-01-02T00:00:00.000Z");
  const candles: Candle[] = [];

  for (let index = 0; candles.length < days; index += 1) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    if (date.getUTCDay() === 0 || date.getUTCDay() === 6) continue;

    const day = candles.length;
    const drift = symbol === "NVDA" ? 0.09 : symbol === "AAPL" ? 0.04 : 0.03;
    const cycle = Math.sin((day + seed) / 18) * 7 + Math.sin((day + seed) / 47) * 11;
    const close = Math.max(10, base + drift * day + cycle);
    const open = previousClose;
    const intraday = 1.1 + Math.abs(close - open) * 0.35;
    const high = Math.max(open, close) + intraday;
    const low = Math.min(open, close) - intraday;
    candles.push({
      date: date.toISOString().slice(0, 10),
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
      volume: 1_000_000 + ((seed + candles.length * 7919) % 900_000)
    });
    previousClose = close;
  }

  return candles;
}

function trimRange(candles: Candle[], range: "6mo" | "1y" | "2y"): Candle[] {
  const count = range === "6mo" ? 126 : range === "1y" ? 252 : 504;
  return candles.slice(-count);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
