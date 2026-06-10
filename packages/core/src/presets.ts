import { canvasVersion, type SoothsayerCanvas } from "./schema";

export type PresetName = "golden-cross" | "rsi-bounce" | "momentum-oracle";

export function canvasFromThesis(thesis: string, opts: { symbol?: string; iching?: boolean } = {}): SoothsayerCanvas {
  const symbol = normalizeSymbol(opts.symbol ?? inferSymbol(thesis) ?? "SPY");
  const lower = thesis.toLowerCase();
  const wantsOracle = opts.iching || /oracle|i ching|random|vibe/.test(lower);
  const wantsRsi = /rsi|overbought|under 70|below 70|oversold/.test(lower);
  return momentumCanvas(symbol, thesis, wantsOracle, wantsRsi);
}

export function presetCanvas(name: PresetName, symbol = "SPY"): SoothsayerCanvas {
  const normalized = normalizeSymbol(symbol);
  if (name === "rsi-bounce") {
    return momentumCanvas(
      normalized,
      `Buy ${normalized} when SMA20 crosses above SMA50 and RSI is below 70.`,
      false,
      true
    );
  }
  if (name === "momentum-oracle") {
    return momentumCanvas(
      normalized,
      `Buy ${normalized} momentum when SMA20 crosses above SMA50 and RSI is below 70; ask the oracle.`,
      true,
      true
    );
  }
  return momentumCanvas(normalized, `Buy ${normalized} when SMA20 crosses above SMA50.`, false, false);
}

function momentumCanvas(symbol: string, thesis: string, includeOracle: boolean, includeRsi: boolean): SoothsayerCanvas {
  const nodes: SoothsayerCanvas["nodes"] = [
    node("price", "data.ohlcv", `${symbol} daily candles`, { symbol, provider: "fixture", range: "2y" }, 0, 160),
    node("close", "series.close", "Close price", {}, 220, 160),
    node("sma20", "indicator.sma", "SMA 20", { period: 20 }, 460, 70),
    node("sma50", "indicator.sma", "SMA 50", { period: 50 }, 460, 250),
    node("cross", "condition.crossesAbove", "SMA20 crosses above SMA50", {}, 720, 140),
    node("entry", "logic.all", "Entry: all true", {}, 960, includeRsi ? 210 : 140),
    node("markers", "signal.buyMarkers", "Buy markers", {}, 1200, 120),
    node("bt", "backtest.longOnly", "Tiny backtest", { holdDays: 20 }, 1200, 300)
  ];

  const edges: SoothsayerCanvas["edges"] = [
    edge("e1", "price", "ohlcv", "close", "ohlcv"),
    edge("e2", "close", "series", "sma20", "series"),
    edge("e3", "close", "series", "sma50", "series"),
    edge("e4", "sma20", "series", "cross", "a"),
    edge("e5", "sma50", "series", "cross", "b"),
    edge("e8", "cross", "condition", "entry", "condition"),
    edge("e10", "entry", "condition", "markers", "condition"),
    edge("e11", "entry", "condition", "bt", "entry"),
    edge("e12", "price", "ohlcv", "bt", "ohlcv")
  ];

  if (includeRsi) {
    nodes.splice(5, 0, node("rsi", "indicator.rsi", "RSI 14", { period: 14 }, 460, 420));
    nodes.splice(6, 0, node("notOverbought", "condition.lt", "RSI below 70", { threshold: 70 }, 720, 380));
    edges.splice(5, 0, edge("e6", "close", "series", "rsi", "series"), edge("e7", "rsi", "series", "notOverbought", "series"), edge("e9", "notOverbought", "condition", "entry", "condition"));
  }

  if (includeOracle) {
    nodes.push(node("oracle", "oracle.iching", "I Ching oracle", { question: "Should we press this thesis or wait?", seed: `${symbol}-hackathon` }, 960, 480));
  }

  return {
    version: canvasVersion,
    meta: {
      title: `${symbol} momentum thesis`,
      thesis,
      createdBy: "cli"
    },
    nodes,
    edges
  };
}

function node(
  id: string,
  type: SoothsayerCanvas["nodes"][number]["type"],
  label: string,
  params: Record<string, unknown>,
  x: number,
  y: number
): SoothsayerCanvas["nodes"][number] {
  return { id, type, label, params, position: { x, y } };
}

function edge(id: string, fromNode: string, fromPort: string, toNode: string, toPort: string): SoothsayerCanvas["edges"][number] {
  return { id, from: { node: fromNode, port: fromPort }, to: { node: toNode, port: toPort } };
}

function inferSymbol(thesis: string): string | undefined {
  const match = thesis.match(/\b[A-Z]{2,5}\b/);
  return match?.[0];
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase() || "SPY";
}
