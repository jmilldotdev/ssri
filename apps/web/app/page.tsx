import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { MarketChart, type Candle, type SymbolDataset } from "./market-chart";

const SYMBOLS = ["NVDA", "SPY", "MU"] as const;

function parseFixtureCsv(symbol: string): SymbolDataset {
  const fixturePathFromRoot = join(
    process.cwd(),
    "packages",
    "data",
    "fixtures",
    `${symbol}.csv`,
  );
  const fixturePathFromWeb = join(
    process.cwd(),
    "..",
    "..",
    "packages",
    "data",
    "fixtures",
    `${symbol}.csv`,
  );
  const filePath = existsSync(fixturePathFromRoot)
    ? fixturePathFromRoot
    : fixturePathFromWeb;
  const rows = readFileSync(filePath, "utf8").trim().split(/\r?\n/).slice(1);

  const candles: Candle[] = rows
    .map((row) => {
      const [date, open, high, low, close, volume] = row.split(",");

      return {
        timestamp: date,
        open: Number(open),
        high: Number(high),
        low: Number(low),
        close: Number(close),
        volume: Number(volume),
      };
    })
    .filter((candle) =>
      Boolean(candle.timestamp) &&
      Number.isFinite(candle.open) &&
      Number.isFinite(candle.high) &&
      Number.isFinite(candle.low) &&
      Number.isFinite(candle.close) &&
      Number.isFinite(candle.volume),
    )
    .reverse();

  return { symbol, candles };
}

export default function Home() {
  const datasets = SYMBOLS.map((symbol) => parseFixtureCsv(symbol));

  return <MarketChart datasets={datasets} />;
}
