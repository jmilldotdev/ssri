import { nodeTypes, type SoothNodeType } from "./schema";

export type NodeCatalogEntry = {
  type: SoothNodeType;
  label: string;
  inputs: string[];
  outputs: string[];
  params: Record<string, "string" | "number" | "boolean">;
  description: string;
};

export const nodeCatalog: NodeCatalogEntry[] = [
  {
    type: "data.ohlcv",
    label: "Daily OHLCV",
    inputs: [],
    outputs: ["ohlcv"],
    params: { symbol: "string", provider: "string", range: "string" },
    description: "Loads daily candles from the fixture provider."
  },
  {
    type: "series.close",
    label: "Close Price",
    inputs: ["ohlcv"],
    outputs: ["series"],
    params: {},
    description: "Extracts close prices from candles."
  },
  {
    type: "indicator.sma",
    label: "Simple Moving Average",
    inputs: ["series"],
    outputs: ["series"],
    params: { period: "number" },
    description: "Computes a simple moving average over a numeric series."
  },
  {
    type: "indicator.rsi",
    label: "Relative Strength Index",
    inputs: ["series"],
    outputs: ["series"],
    params: { period: "number" },
    description: "Computes RSI over a numeric series."
  },
  {
    type: "condition.crossesAbove",
    label: "Crosses Above",
    inputs: ["a", "b"],
    outputs: ["condition"],
    params: {},
    description: "True when series a was below-or-equal to b on the prior candle and above b on the current candle."
  },
  {
    type: "condition.lt",
    label: "Less Than",
    inputs: ["series"],
    outputs: ["condition"],
    params: { threshold: "number" },
    description: "True when a numeric series is below a threshold."
  },
  {
    type: "logic.all",
    label: "All Conditions",
    inputs: ["condition"],
    outputs: ["condition"],
    params: {},
    description: "Combines any number of boolean condition inputs with logical AND."
  },
  {
    type: "signal.buyMarkers",
    label: "Buy Markers",
    inputs: ["condition"],
    outputs: ["markers"],
    params: {},
    description: "Turns an entry condition into chart buy markers."
  },
  {
    type: "backtest.longOnly",
    label: "Long-Only Backtest",
    inputs: ["ohlcv", "entry"],
    outputs: ["stats"],
    params: { holdDays: "number" },
    description: "Enters on a true entry condition, holds N days, and returns tiny demo stats."
  },
  {
    type: "oracle.iching",
    label: "I Ching Oracle",
    inputs: [],
    outputs: ["oracle"],
    params: { question: "string", seed: "string" },
    description: "Adds deterministic uncertainty/risk annotation. It does not create trading signals."
  }
];

export function getNodeCatalogEntry(type: SoothNodeType): NodeCatalogEntry {
  const entry = nodeCatalog.find((candidate) => candidate.type === type);
  if (!entry) throw new Error(`Unknown node type: ${type}`);
  return entry;
}

export function isNodeType(value: string): value is SoothNodeType {
  return nodeTypes.includes(value as SoothNodeType);
}
