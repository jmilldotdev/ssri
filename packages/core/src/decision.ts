import { consultOracle } from "./iching";
import { assertValidCanvas } from "./validate";
import type {
  Candle,
  ChartAnnotation,
  DecisionLevel,
  DecisionSignal,
  EvaluatedDecisionGraph,
  OracleOutput,
  SoothsayerCanvas
} from "./schema";

export type Fundamentals = {
  symbol: string;
  pe: number;
  sector?: string;
  asOf?: string;
};

export type FundamentalsLoader = (symbol: string) => Promise<Fundamentals> | Fundamentals;
export type DecisionCandleLoader = (symbol: string, range: string) => Promise<Candle[]> | Candle[];

export async function evaluateDecisionGraph(
  canvasInput: SoothsayerCanvas,
  loadCandles: DecisionCandleLoader,
  loadFundamentals: FundamentalsLoader
): Promise<EvaluatedDecisionGraph> {
  const canvas = assertValidCanvas(canvasInput);
  const priceNode = canvas.nodes.find((node) => node.type === "data.ohlcv");
  const symbol = String(priceNode?.params.symbol ?? inferSymbol(canvas.meta.thesis) ?? "SPY").toUpperCase();
  const range = String(priceNode?.params.range ?? "2y");
  const candles = await loadCandles(symbol, range);
  const lastClose = candles.at(-1)?.close ?? 0;
  const signals: DecisionSignal[] = [];
  let oracle: OracleOutput | undefined;

  for (const node of canvas.nodes) {
    if (node.type === "input.peValue") {
      const fundamentals = await loadFundamentals(String(node.params.symbol ?? symbol));
      signals.push(scorePeValue(node.id, node.label, fundamentals.pe, {
        fairPe: numberParam(node.params.fairPe, 25),
        expensivePe: numberParam(node.params.expensivePe, 45),
        weight: numberParam(node.params.weight, 0.45)
      }));
    }

    if (node.type === "input.iching") {
      oracle = consultOracle(String(node.params.seed ?? `${symbol}-decision`), String(node.params.question ?? canvas.meta.thesis));
      signals.push(scoreIching(node.id, node.label, oracle, numberParam(node.params.weight, 0.2)));
    }
  }

  const score = round(signals.reduce((sum, signal) => sum + signal.weightedScore, 0));
  const directionNode = canvas.nodes.find((node) => node.type === "output.direction");
  const callThreshold = numberParam(directionNode?.params.callThreshold, 0.18);
  const putThreshold = numberParam(directionNode?.params.putThreshold, -0.18);
  const decision = score >= callThreshold ? "call" : score <= putThreshold ? "put" : "hold";
  const levels = buildLevels(candles, decision, numberParam(findNode(canvas, "output.levels")?.params.lookbackDays, 20));

  return {
    canvas,
    symbol,
    thesis: canvas.meta.thesis,
    lastClose,
    signals,
    score,
    decision,
    summary: summarizeDecision(decision, score),
    levels,
    chartAnnotations: levels.map(levelToAnnotation),
    oracle
  };
}

export function createDecisionCanvas(thesis: string, opts: { symbol?: string; iching?: boolean } = {}): SoothsayerCanvas {
  const symbol = (opts.symbol ?? inferSymbol(thesis) ?? "SPY").toUpperCase();
  const includeIching = opts.iching ?? /i ching|oracle/i.test(thesis);

  const nodes: SoothsayerCanvas["nodes"] = [
    node("price", "data.ohlcv", `${symbol} daily candles`, { symbol, provider: "fixture", range: "2y" }, 0, 120),
    node("pe", "input.peValue", "PE value", { symbol, fairPe: 25, expensivePe: 45, weight: 0.45 }, 260, 40),
    node("score", "score.weightedSignal", "Weighted signal score", {}, 560, 120),
    node("levels", "output.levels", "Generated chart levels", { lookbackDays: 20, atrDays: 14 }, 860, 40),
    node("direction", "output.direction", "Call / put / hold", { callThreshold: 0.18, putThreshold: -0.18 }, 860, 220)
  ];

  const edges: SoothsayerCanvas["edges"] = [
    edge("e1", "price", "ohlcv", "levels", "ohlcv"),
    edge("e2", "pe", "signal", "score", "signal"),
    edge("e3", "score", "score", "levels", "score"),
    edge("e4", "score", "score", "direction", "score")
  ];

  if (includeIching) {
    nodes.splice(2, 0, node("iching", "input.iching", "I Ching risk posture", {
      question: "Does the setup favor action or patience?",
      seed: `${symbol}-decision`,
      weight: 0.2
    }, 260, 220));
    edges.splice(2, 0, edge("e5", "iching", "signal", "score", "signal"));
  }

  return {
    version: "sooth.canvas.v1",
    meta: {
      title: `${symbol} decision graph`,
      thesis,
      createdBy: "agent"
    },
    nodes,
    edges
  };
}

function scorePeValue(
  nodeId: string,
  label: string,
  pe: number,
  opts: { fairPe: number; expensivePe: number; weight: number }
): DecisionSignal {
  const span = Math.max(opts.expensivePe - opts.fairPe, 1);
  const normalized = (pe - opts.fairPe) / span;
  const score = clamp(0.35 - normalized * 0.8, -0.55, 0.35);
  const explanation =
    pe <= opts.fairPe
      ? "PE is inside the configured fair-value range."
      : pe >= opts.expensivePe
        ? "PE is above the configured expensive threshold, so valuation reduces the setup score."
        : "PE is between fair and expensive thresholds, so valuation is mildly cautious.";

  return signal(nodeId, label, "peValue", pe, score, opts.weight, explanation);
}

function scoreIching(nodeId: string, label: string, oracle: OracleOutput, weight: number): DecisionSignal {
  const stanceScore: Record<string, number> = {
    "advance carefully": 0.25,
    wait: -0.05,
    "reduce size": -0.2,
    "observe only": -0.35
  };
  const score = stanceScore[oracle.stance] ?? 0;
  return signal(nodeId, label, "iching", oracle.stance, score, weight, oracle.note);
}

function buildLevels(candles: Candle[], decision: "call" | "put" | "hold", lookbackDays: number): DecisionLevel[] {
  const recent = candles.slice(-Math.max(lookbackDays, 2));
  const lastClose = candles.at(-1)?.close ?? 0;
  const support = Math.min(...recent.map((candle) => candle.low));
  const resistance = Math.max(...recent.map((candle) => candle.high));
  const atr = average(candles.slice(-14).map((candle) => candle.high - candle.low));

  const directionalTarget =
    decision === "put"
      ? lastClose - atr * 2
      : decision === "call"
        ? lastClose + atr * 2
        : resistance + atr;
  const stop = decision === "put" ? lastClose + atr * 1.2 : lastClose - atr * 1.2;

  return [
    { price: round(support), label: "Recent support", intent: "support" },
    { price: round(resistance), label: "Recent resistance", intent: "resistance" },
    { price: round(directionalTarget), label: decision === "hold" ? "Breakout trigger" : "Demo target", intent: "target" },
    { price: round(stop), label: "Invalidation", intent: "stop" }
  ];
}

function levelToAnnotation(level: DecisionLevel): ChartAnnotation {
  return { type: "horizontalLevel", price: level.price, label: level.label, intent: level.intent };
}

function summarizeDecision(decision: "call" | "put" | "hold", score: number): string {
  if (decision === "call") return `Call bias: weighted score ${score} is above the action threshold.`;
  if (decision === "put") return `Put bias: weighted score ${score} is below the downside threshold.`;
  return `Hold: weighted score ${score} is not strong enough; wait for a cleaner setup.`;
}

function signal(
  nodeId: string,
  label: string,
  kind: DecisionSignal["kind"],
  value: string | number,
  score: number,
  weight: number,
  explanation: string
): DecisionSignal {
  return {
    nodeId,
    label,
    kind,
    value,
    score: round(score),
    weight: round(weight),
    weightedScore: round(score * weight),
    explanation
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

function findNode(canvas: SoothsayerCanvas, type: string): SoothsayerCanvas["nodes"][number] | undefined {
  return canvas.nodes.find((node) => node.type === type);
}

function inferSymbol(thesis: string): string | undefined {
  return thesis.match(/\b[A-Z]{2,5}\b/)?.[0];
}

function numberParam(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 1;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
