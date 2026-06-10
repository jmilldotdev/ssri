import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { MarketChart, type Candle, type SymbolDataset } from "../market-chart";
import { DecisionGraphPanel } from "./decision-graph-panel";

const SYMBOLS = ["NVDA", "SPY", "MU"] as const;

function repoPath(...parts: string[]) {
  const fromRoot = join(process.cwd(), ...parts);
  if (existsSync(fromRoot)) return fromRoot;
  return join(process.cwd(), "..", "..", ...parts);
}

function parseFixtureCsv(symbol: string): SymbolDataset {
  const filePath = repoPath("packages", "data", "fixtures", `${symbol}.csv`);
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

function readDecision() {
  const current = repoPath("examples", "current.decision.json");
  const fallback = repoPath("examples", "pe_iching_decision.json");
  const path = existsSync(current) ? current : fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

export default function DecisionDemoPage() {
  const datasets = SYMBOLS.map((symbol) => parseFixtureCsv(symbol));
  const decision = readDecision();

  return (
    <div className="decision-layout">
      <div className="decision-chart-pane">
        <MarketChart datasets={datasets} />
      </div>
      <DecisionGraphPanel decision={decision} />
    </div>
  );
}
