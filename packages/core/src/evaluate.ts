import { all, closeSeries, crossesAbove, lt, rsi, sma } from "./indicators";
import { consultOracle } from "./iching";
import { parseCanvas, type Candle, type EvaluatedCanvas, type SeriesPoint, type SoothsayerCanvas } from "./schema";

export type CandleLoader = (symbol: string, range: string) => Promise<Candle[]> | Candle[];

type NodeValue =
  | { kind: "ohlcv"; value: Candle[] }
  | { kind: "series"; value: SeriesPoint[] }
  | { kind: "condition"; value: boolean[] }
  | { kind: "oracle"; value: EvaluatedCanvas["oracle"] };

export async function evaluateCanvas(canvasInput: SoothsayerCanvas, loadCandles: CandleLoader): Promise<EvaluatedCanvas> {
  const canvas = parseCanvas(canvasInput);
  const values = new Map<string, NodeValue>();
  const overlays: EvaluatedCanvas["chart"]["overlays"] = [];
  let candles: Candle[] = [];

  for (const node of canvas.nodes) {
    if (node.type === "data.ohlcv") {
      const symbol = String(node.params.symbol ?? "SPY");
      const range = String(node.params.range ?? "2y");
      candles = await loadCandles(symbol, range);
      values.set(node.id, { kind: "ohlcv", value: candles });
    }

    if (node.type === "series.close") {
      const source = firstInput(canvas, values, node.id, "ohlcv");
      const series = source?.kind === "ohlcv" ? closeSeries(source.value) : [];
      values.set(node.id, { kind: "series", value: series });
    }

    if (node.type === "indicator.sma") {
      const source = firstInput(canvas, values, node.id, "series");
      const series = source?.kind === "series" ? sma(source.value, numberParam(node.params.period, 20)) : [];
      values.set(node.id, { kind: "series", value: series });
      overlays.push({ id: node.id, label: node.label, points: series });
    }

    if (node.type === "indicator.rsi") {
      const source = firstInput(canvas, values, node.id, "series");
      const series = source?.kind === "series" ? rsi(source.value, numberParam(node.params.period, 14)) : [];
      values.set(node.id, { kind: "series", value: series });
    }

    if (node.type === "condition.crossesAbove") {
      const a = inputAt(canvas, values, node.id, "a");
      const b = inputAt(canvas, values, node.id, "b");
      values.set(node.id, { kind: "condition", value: a?.kind === "series" && b?.kind === "series" ? crossesAbove(a.value, b.value) : [] });
    }

    if (node.type === "condition.lt") {
      const source = firstInput(canvas, values, node.id, "series");
      values.set(node.id, {
        kind: "condition",
        value: source?.kind === "series" ? lt(source.value, numberParam(node.params.threshold, 70)) : []
      });
    }

    if (node.type === "logic.all") {
      const inputs = inputsFor(canvas, values, node.id)
        .filter((input): input is { kind: "condition"; value: boolean[] } => input?.kind === "condition")
        .map((input) => input.value);
      values.set(node.id, { kind: "condition", value: all(inputs) });
    }

    if (node.type === "oracle.iching") {
      values.set(node.id, {
        kind: "oracle",
        value: consultOracle(String(node.params.seed ?? canvas.meta.title), String(node.params.question ?? canvas.meta.thesis))
      });
    }
  }

  const entry = [...values.values()].reverse().find((value) => value.kind === "condition") as { kind: "condition"; value: boolean[] } | undefined;
  const backtestNode = canvas.nodes.find((node) => node.type === "backtest.longOnly");
  const holdDays = numberParam(backtestNode?.params.holdDays, 20);
  const markers = entry?.value.map((active, index) => active && candles[index] ? {
    time: candles[index].date,
    position: "belowBar" as const,
    shape: "arrowUp" as const,
    text: "Buy"
  } : null).filter((item): item is NonNullable<typeof item> => item != null) ?? [];

  return {
    canvas,
    chart: { candles, overlays, markers },
    stats: backtest(candles, entry?.value ?? [], holdDays),
    oracle: [...values.values()].find((value) => value.kind === "oracle")?.value
  };
}

function firstInput(canvas: SoothsayerCanvas, values: Map<string, NodeValue>, nodeId: string, port?: string): NodeValue | undefined {
  return inputsFor(canvas, values, nodeId, port)[0];
}

function inputAt(canvas: SoothsayerCanvas, values: Map<string, NodeValue>, nodeId: string, port: string): NodeValue | undefined {
  const edge = canvas.edges.find((candidate) => candidate.to.node === nodeId && candidate.to.port === port);
  return edge ? values.get(edge.from.node) : undefined;
}

function inputsFor(canvas: SoothsayerCanvas, values: Map<string, NodeValue>, nodeId: string, port?: string): Array<NodeValue | undefined> {
  return canvas.edges
    .filter((edge) => edge.to.node === nodeId && (!port || edge.to.port === port))
    .map((edge) => values.get(edge.from.node));
}

function numberParam(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function backtest(candles: Candle[], entry: boolean[], holdDays: number): EvaluatedCanvas["stats"] {
  const returns: number[] = [];
  for (let index = 0; index < candles.length; index += 1) {
    if (!entry[index] || !candles[index + holdDays]) continue;
    returns.push(((candles[index + holdDays].close - candles[index].close) / candles[index].close) * 100);
  }

  const trades = returns.length;
  const totalReturnPct = round(returns.reduce((sum, value) => sum + value, 0));
  const hitRatePct = trades ? round((returns.filter((value) => value > 0).length / trades) * 100) : 0;
  const avgTradePct = trades ? round(totalReturnPct / trades) : 0;
  return { totalReturnPct, trades, hitRatePct, avgTradePct };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
