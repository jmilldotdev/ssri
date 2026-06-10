import { z } from "zod";

export const canvasVersion = "sooth.canvas.v1" as const;

export const nodeTypes = [
  "data.ohlcv",
  "series.close",
  "indicator.sma",
  "indicator.rsi",
  "condition.crossesAbove",
  "condition.lt",
  "logic.all",
  "signal.buyMarkers",
  "backtest.longOnly",
  "oracle.iching"
] as const;

export type SoothNodeType = (typeof nodeTypes)[number];

export type SoothsayerCanvas = {
  version: typeof canvasVersion;
  meta: {
    title: string;
    thesis: string;
    createdBy?: "human" | "agent" | "cli";
  };
  nodes: SoothNode[];
  edges: SoothEdge[];
};

export type SoothNode = {
  id: string;
  type: SoothNodeType;
  label: string;
  params: Record<string, unknown>;
  position: { x: number; y: number };
};

export type SoothEdge = {
  id: string;
  from: { node: string; port: string };
  to: { node: string; port: string };
};

export type Candle = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type SeriesPoint = {
  time: string;
  value: number | null;
};

export type OracleOutput = {
  hexagramNumber: number;
  hexagramName: string;
  changingLines: number[];
  stance: string;
  note: string;
};

export type EvaluatedCanvas = {
  canvas: SoothsayerCanvas;
  chart: {
    candles: Candle[];
    overlays: Array<{ id: string; label: string; points: SeriesPoint[] }>;
    markers: Array<{ time: string; position: "belowBar" | "aboveBar"; shape: "arrowUp" | "arrowDown"; text: string }>;
  };
  stats: {
    totalReturnPct: number;
    trades: number;
    hitRatePct: number;
    avgTradePct: number;
  };
  oracle?: OracleOutput;
};

export const canvasSchema = z.object({
  version: z.literal(canvasVersion),
  meta: z.object({
    title: z.string(),
    thesis: z.string(),
    createdBy: z.enum(["human", "agent", "cli"]).optional()
  }),
  nodes: z.array(
    z.object({
      id: z.string().min(1),
      type: z.enum(nodeTypes),
      label: z.string().min(1),
      params: z.record(z.string(), z.unknown()),
      position: z.object({ x: z.number(), y: z.number() })
    })
  ),
  edges: z.array(
    z.object({
      id: z.string().min(1),
      from: z.object({ node: z.string().min(1), port: z.string().min(1) }),
      to: z.object({ node: z.string().min(1), port: z.string().min(1) })
    })
  )
});

export function parseCanvas(input: unknown): SoothsayerCanvas {
  return canvasSchema.parse(input);
}
