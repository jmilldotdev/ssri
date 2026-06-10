"use client";

import { useMemo, useState } from "react";

export type Candle = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type SymbolDataset = {
  symbol: string;
  candles: Candle[];
};

type MarketChartProps = {
  datasets: SymbolDataset[];
};

type DecisionNodeKind = "source" | "signal" | "condition" | "decision" | "output";

type DecisionNode = {
  id: string;
  label: string;
  kind: DecisionNodeKind;
  x: number;
  y: number;
  weight: number;
  value: number;
  parentId?: string;
  summary: string;
};

type DecisionEdge = {
  id: string;
  source: string;
  target: string;
  weight: number;
  label: string;
};

const SYMBOL_NAMES: Record<string, string> = {
  MU: "Micron Technology, Inc.",
  NVDA: "NVIDIA Corporation",
  SPY: "SPDR S&P 500 ETF Trust",
};

const WIDTH = 1280;
const HEIGHT = 660;
const MARGIN = { top: 34, right: 82, bottom: 50, left: 18 };
const VOLUME_HEIGHT = 112;
const PRICE_BOTTOM = HEIGHT - MARGIN.bottom - VOLUME_HEIGHT;
const VOLUME_TOP = PRICE_BOTTOM + 16;
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PRICE_HEIGHT = PRICE_BOTTOM - MARGIN.top;
const DECISION_CANVAS_WIDTH = 1160;
const DECISION_CANVAS_HEIGHT = 520;

const INITIAL_DECISION_NODES: DecisionNode[] = [
  {
    id: "price",
    label: "Price",
    kind: "source",
    x: 52,
    y: 68,
    weight: 1,
    value: 72,
    summary: "Fixture OHLCV feed for the selected ticker.",
  },
  {
    id: "sma-cross",
    label: "SMA20 > SMA50",
    kind: "signal",
    x: 300,
    y: 42,
    weight: 1,
    value: 78,
    parentId: "momentum",
    summary: "Momentum sub-node: short average is above the slow average.",
  },
  {
    id: "rsi-cap",
    label: "RSI < 70",
    kind: "condition",
    x: 300,
    y: 178,
    weight: 0.8,
    value: 64,
    parentId: "momentum",
    summary: "Risk sub-node: avoids overbought entries.",
  },
  {
    id: "oracle",
    label: "Oracle stance",
    kind: "condition",
    x: 300,
    y: 314,
    weight: 0.35,
    value: 42,
    parentId: "momentum",
    summary: "Playful uncertainty annotation, not direct trade logic.",
  },
  {
    id: "decision",
    label: "Entry decision",
    kind: "decision",
    x: 642,
    y: 162,
    weight: 1,
    value: 50,
    summary: "Combines weighted evidence into a single decision score.",
  },
  {
    id: "output",
    label: "Canvas output",
    kind: "output",
    x: 930,
    y: 162,
    weight: 1,
    value: 50,
    summary: "Final generated action, confidence, and explanation.",
  },
];

const INITIAL_DECISION_EDGES: DecisionEdge[] = [
  { id: "price-sma", source: "price", target: "sma-cross", weight: 1, label: "close" },
  { id: "price-rsi", source: "price", target: "rsi-cap", weight: 0.9, label: "close" },
  { id: "sma-decision", source: "sma-cross", target: "decision", weight: 0.72, label: "trend" },
  { id: "rsi-decision", source: "rsi-cap", target: "decision", weight: 0.48, label: "risk" },
  { id: "oracle-decision", source: "oracle", target: "decision", weight: 0.18, label: "context" },
  { id: "decision-output", source: "decision", target: "output", weight: 1, label: "score" },
];

function formatPrice(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCompact(value: number) {
  return Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatAxisDate(timestamp: string) {
  const date = new Date(`${timestamp}T00:00:00`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatWeight(value: number) {
  return value.toFixed(2).replace(/\.00$/, "");
}

function nodeCenter(node: DecisionNode) {
  return {
    x: node.x + 96,
    y: node.y + 48,
  };
}

export default function MarketChart({ datasets }: MarketChartProps) {
  const initialSymbol = datasets.some((dataset) => dataset.symbol === "MU")
    ? "MU"
    : datasets[0]?.symbol ?? "";
  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol);
  const [decisionNodes, setDecisionNodes] = useState(INITIAL_DECISION_NODES);
  const [decisionEdges, setDecisionEdges] = useState(INITIAL_DECISION_EDGES);
  const [selectedDecisionNodeId, setSelectedDecisionNodeId] = useState("decision");

  const dataset =
    datasets.find((candidate) => candidate.symbol === selectedSymbol) ?? datasets[0];

  const chart = useMemo(() => {
    const candles = dataset?.candles ?? [];
    const highs = candles.map((candle) => candle.high);
    const lows = candles.map((candle) => candle.low);
    const maxVolume = Math.max(...candles.map((candle) => candle.volume), 1);
    const minPrice = Math.min(...lows);
    const maxPrice = Math.max(...highs);
    const pricePadding = Math.max((maxPrice - minPrice) * 0.08, 1);
    const priceMin = minPrice - pricePadding;
    const priceMax = maxPrice + pricePadding;
    const priceRange = priceMax - priceMin || 1;
    const step = PLOT_WIDTH / Math.max(candles.length, 1);
    const candleWidth = clamp(step * 0.58, 3, 13);

    const xFor = (index: number) => MARGIN.left + index * step + step / 2;
    const yFor = (price: number) =>
      MARGIN.top + ((priceMax - price) / priceRange) * PRICE_HEIGHT;

    const priceTicks = Array.from({ length: 7 }, (_, index) => {
      const value = priceMin + (priceRange / 6) * index;
      return Number(value.toFixed(2));
    }).reverse();

    const dateTickCount = Math.min(7, candles.length);
    const dateTicks = Array.from({ length: dateTickCount }, (_, index) => {
      const candleIndex =
        dateTickCount === 1
          ? 0
          : Math.round((index / (dateTickCount - 1)) * (candles.length - 1));
      return {
        index: candleIndex,
        candle: candles[candleIndex],
      };
    });

    return {
      candles,
      maxVolume,
      step,
      candleWidth,
      xFor,
      yFor,
      priceTicks,
      dateTicks,
    };
  }, [dataset]);

  const decisionModel = useMemo(() => {
    const nodesById = new Map(decisionNodes.map((node) => [node.id, node]));
    const inputEdges = decisionEdges.filter((edge) => edge.target === "decision");
    const weightedSignal = inputEdges.reduce((total, edge) => {
      const source = nodesById.get(edge.source);

      if (!source) {
        return total;
      }

      return total + (source.value / 100) * source.weight * edge.weight;
    }, 0);
    const weightTotal = inputEdges.reduce((total, edge) => {
      const source = nodesById.get(edge.source);
      return total + Math.abs(edge.weight * (source?.weight ?? 1));
    }, 0);
    const normalizedScore = weightTotal > 0 ? (weightedSignal / weightTotal) * 100 : 50;
    const decisionScore = Math.round(clamp(normalizedScore, 0, 100));
    const stance =
      decisionScore >= 68 ? "Generate buy setup" : decisionScore >= 50 ? "Watchlist" : "Stand down";

    return {
      decisionScore,
      stance,
      nodesById,
      selectedNode: nodesById.get(selectedDecisionNodeId) ?? decisionNodes[0],
    };
  }, [decisionEdges, decisionNodes, selectedDecisionNodeId]);

  const displayNodes = useMemo(
    () =>
      decisionNodes.map((node) =>
        node.id === "decision" || node.id === "output"
          ? { ...node, value: decisionModel.decisionScore }
          : node,
      ),
    [decisionModel.decisionScore, decisionNodes],
  );

  const addDecisionNode = (kind: DecisionNodeKind) => {
    const createdCount = decisionNodes.filter((node) => node.id.startsWith("custom-")).length + 1;
    const id = `custom-${createdCount}`;
    const nextNode: DecisionNode = {
      id,
      label:
        kind === "decision"
          ? `Decision ${createdCount}`
          : kind === "condition"
            ? `Condition ${createdCount}`
            : `Signal ${createdCount}`,
      kind,
      x: 78 + ((createdCount - 1) % 3) * 170,
      y: 390,
      weight: 0.5,
      value: 50,
      parentId: "momentum",
      summary: "New editable evidence node connected into the entry decision.",
    };
    const nextEdge: DecisionEdge = {
      id: `${id}-decision`,
      source: id,
      target: "decision",
      weight: 0.35,
      label: "input",
    };

    setDecisionNodes((nodes) => [...nodes, nextNode]);
    setDecisionEdges((edges) => [...edges, nextEdge]);
    setSelectedDecisionNodeId(id);
  };

  const updateSelectedNode = (updates: Partial<DecisionNode>) => {
    setDecisionNodes((nodes) =>
      nodes.map((node) =>
        node.id === selectedDecisionNodeId ? { ...node, ...updates } : node,
      ),
    );
  };

  const updateEdgeWeight = (edgeId: string, weight: number) => {
    setDecisionEdges((edges) =>
      edges.map((edge) => (edge.id === edgeId ? { ...edge, weight } : edge)),
    );
  };

  const selectedIncomingEdges = decisionEdges.filter(
    (edge) =>
      edge.source === decisionModel.selectedNode?.id ||
      edge.target === decisionModel.selectedNode?.id,
  );

  if (!dataset) {
    return (
      <main className="market-page">
        <div className="empty-state">No fixture data found.</div>
      </main>
    );
  }

  const last = chart.candles.at(-1);
  const previous = chart.candles.at(-2);
  const change = last && previous ? last.close - previous.close : 0;
  const changePercent = last && previous ? (change / previous.close) * 100 : 0;
  const isDown = change < 0;
  const currentPriceY = last ? chart.yFor(last.close) : 0;

  return (
    <main className="market-page">
      <header className="market-toolbar">
        <label className="symbol-control">
          <span>Symbol</span>
          <select
            value={dataset.symbol}
            onChange={(event) => setSelectedSymbol(event.target.value)}
          >
            {datasets.map((candidate) => (
              <option key={candidate.symbol} value={candidate.symbol}>
                {candidate.symbol}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section className="decision-surface" aria-label="Decision node canvas">
        <div className="decision-shell">
          <div className="decision-main">
            <div className="decision-topbar">
              <div>
                <p className="panel-eyebrow">Decision canvas</p>
                <h2>Weighted node model</h2>
              </div>
              <div className="node-actions" aria-label="Add decision nodes">
                <button type="button" onClick={() => addDecisionNode("signal")}>
                  + Signal
                </button>
                <button type="button" onClick={() => addDecisionNode("condition")}>
                  + Condition
                </button>
                <button type="button" onClick={() => addDecisionNode("decision")}>
                  + Decision
                </button>
              </div>
            </div>

            <div className="decision-canvas">
              <div className="node-group momentum-group">
                <span>Momentum subnodes</span>
              </div>
              <svg
                className="decision-edges"
                viewBox={`0 0 ${DECISION_CANVAS_WIDTH} ${DECISION_CANVAS_HEIGHT}`}
                aria-hidden="true"
              >
                <defs>
                  <marker
                    id="edge-arrow"
                    markerWidth="10"
                    markerHeight="10"
                    refX="8"
                    refY="3"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M0,0 L0,6 L8,3 z" className="edge-arrow" />
                  </marker>
                </defs>
                {decisionEdges.map((edge) => {
                  const source = displayNodes.find((node) => node.id === edge.source);
                  const target = displayNodes.find((node) => node.id === edge.target);

                  if (!source || !target) {
                    return null;
                  }

                  const start = nodeCenter(source);
                  const end = nodeCenter(target);
                  const midX = (start.x + end.x) / 2;
                  const midY = (start.y + end.y) / 2;
                  const controlOffset = Math.max(40, Math.abs(end.x - start.x) * 0.28);
                  const path = `M ${start.x} ${start.y} C ${start.x + controlOffset} ${start.y}, ${end.x - controlOffset} ${end.y}, ${end.x} ${end.y}`;

                  return (
                    <g key={edge.id} className="decision-edge">
                      <path
                        d={path}
                        className={edge.weight < 0 ? "edge-path negative-edge" : "edge-path"}
                        markerEnd="url(#edge-arrow)"
                      />
                      <foreignObject x={midX - 42} y={midY - 16} width="84" height="30">
                        <div className="edge-label">
                          {edge.label} {formatWeight(edge.weight)}
                        </div>
                      </foreignObject>
                    </g>
                  );
                })}
              </svg>

              {displayNodes.map((node) => (
                <button
                  type="button"
                  key={node.id}
                  className={`decision-node ${node.kind} ${
                    selectedDecisionNodeId === node.id ? "selected" : ""
                  }`}
                  style={{ left: node.x, top: node.y }}
                  onClick={() => setSelectedDecisionNodeId(node.id)}
                >
                  <span className="node-kind">{node.kind}</span>
                  <strong>{node.label}</strong>
                  <span>{node.summary}</span>
                  <meter min="0" max="100" value={node.value} />
                  <small>
                    value {Math.round(node.value)} · weight {formatWeight(node.weight)}
                  </small>
                </button>
              ))}
            </div>
          </div>

          <aside className="decision-inspector" aria-label="Selected node inspector">
            <p className="panel-eyebrow">Inspector</p>
            <h2>{decisionModel.selectedNode?.label ?? "Node"}</h2>
            <div className="output-score">
              <span>{decisionModel.stance}</span>
              <strong>{decisionModel.decisionScore}/100</strong>
            </div>

            {decisionModel.selectedNode ? (
              <div className="inspector-controls">
                <label>
                  Label
                  <input
                    value={decisionModel.selectedNode.label}
                    onChange={(event) => updateSelectedNode({ label: event.target.value })}
                  />
                </label>
                <label>
                  Node value
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={decisionModel.selectedNode.value}
                    onChange={(event) =>
                      updateSelectedNode({ value: Number(event.target.value) })
                    }
                  />
                </label>
                <label>
                  Node weight
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    value={decisionModel.selectedNode.weight}
                    onChange={(event) =>
                      updateSelectedNode({ weight: Number(event.target.value) })
                    }
                  />
                </label>

                <div className="edge-editor">
                  <span>Connected weights</span>
                  {selectedIncomingEdges.map((edge) => (
                    <label key={edge.id}>
                      {edge.source} → {edge.target}
                      <input
                        type="range"
                        min="-1"
                        max="1"
                        step="0.05"
                        value={edge.weight}
                        onChange={(event) =>
                          updateEdgeWeight(edge.id, Number(event.target.value))
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      <section className="chart-surface" aria-label={`${dataset.symbol} candlestick chart`}>
        <div className="chart-header">
          <div>
            <div className="instrument-line">
              <strong>{SYMBOL_NAMES[dataset.symbol] ?? dataset.symbol}</strong>
              <span>{dataset.symbol}</span>
              <span>1D</span>
              <span>NASDAQ</span>
            </div>
            {last ? (
              <div className="ohlc-line">
                <span>O {formatPrice(last.open)}</span>
                <span>H {formatPrice(last.high)}</span>
                <span>L {formatPrice(last.low)}</span>
                <span>C {formatPrice(last.close)}</span>
                <span className={isDown ? "negative" : "positive"}>
                  {change >= 0 ? "+" : ""}
                  {formatPrice(change)} ({changePercent.toFixed(2)}%)
                </span>
              </div>
            ) : null}
          </div>

          {last ? (
            <div className={isDown ? "quote-pill negative-bg" : "quote-pill positive-bg"}>
              <span>{formatPrice(last.close)}</span>
              <small>{formatCompact(last.volume)} Vol</small>
            </div>
          ) : null}
        </div>

        <div className="chart-wrap">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" className="candle-svg">
            <rect x="0" y="0" width={WIDTH} height={HEIGHT} className="chart-bg" />

            {chart.dateTicks.map(({ index }, bandIndex) => {
              const x = MARGIN.left + index * chart.step;
              const width = chart.step * 5;
              return (
                <rect
                  key={`session-${index}`}
                  x={x}
                  y={0}
                  width={width}
                  height={HEIGHT - MARGIN.bottom}
                  className={bandIndex % 2 === 0 ? "session-band-a" : "session-band-b"}
                />
              );
            })}

            {chart.priceTicks.map((tick) => {
              const y = chart.yFor(tick);
              return (
                <g key={tick}>
                  <line
                    x1={MARGIN.left}
                    y1={y}
                    x2={WIDTH - MARGIN.right}
                    y2={y}
                    className="grid-line"
                  />
                  <text x={WIDTH - 12} y={y + 4} textAnchor="end" className="axis-label">
                    {formatPrice(tick)}
                  </text>
                </g>
              );
            })}

            {chart.dateTicks.map(({ index, candle }) => {
              const x = chart.xFor(index);
              return (
                <g key={`${candle.timestamp}-${index}`}>
                  <line
                    x1={x}
                    y1={MARGIN.top}
                    x2={x}
                    y2={HEIGHT - MARGIN.bottom}
                    className="date-grid-line"
                  />
                  <text
                    x={x}
                    y={HEIGHT - 18}
                    textAnchor="middle"
                    className="axis-label date-label"
                  >
                    {formatAxisDate(candle.timestamp)}
                  </text>
                </g>
              );
            })}

            {chart.candles.map((candle, index) => {
              const x = chart.xFor(index);
              const openY = chart.yFor(candle.open);
              const closeY = chart.yFor(candle.close);
              const highY = chart.yFor(candle.high);
              const lowY = chart.yFor(candle.low);
              const isPositive = candle.close >= candle.open;
              const bodyHeight = Math.max(Math.abs(closeY - openY), 1.6);
              const bodyY = Math.min(openY, closeY);
              const volumeHeight =
                (candle.volume / chart.maxVolume) * (HEIGHT - MARGIN.bottom - VOLUME_TOP);

              return (
                <g key={candle.timestamp}>
                  <rect
                    x={x - chart.candleWidth / 2}
                    y={HEIGHT - MARGIN.bottom - volumeHeight}
                    width={chart.candleWidth}
                    height={volumeHeight}
                    className={isPositive ? "volume-up" : "volume-down"}
                  />
                  <line
                    x1={x}
                    y1={highY}
                    x2={x}
                    y2={lowY}
                    className={isPositive ? "wick-up" : "wick-down"}
                  />
                  <rect
                    x={x - chart.candleWidth / 2}
                    y={bodyY}
                    width={chart.candleWidth}
                    height={bodyHeight}
                    rx="1.2"
                    className={isPositive ? "candle-up" : "candle-down"}
                  />
                </g>
              );
            })}

            {last ? (
              <g>
                <line
                  x1={MARGIN.left}
                  y1={currentPriceY}
                  x2={WIDTH - MARGIN.right}
                  y2={currentPriceY}
                  className={isDown ? "last-price-line down" : "last-price-line up"}
                />
                <rect
                  x={WIDTH - MARGIN.right + 8}
                  y={currentPriceY - 15}
                  width="72"
                  height="30"
                  rx="3"
                  className={isDown ? "price-tag down" : "price-tag up"}
                />
                <text
                  x={WIDTH - MARGIN.right + 44}
                  y={currentPriceY + 5}
                  textAnchor="middle"
                  className="price-tag-text"
                >
                  {formatPrice(last.close)}
                </text>
              </g>
            ) : null}

            <text x={MARGIN.left} y={VOLUME_TOP - 8} className="volume-label">
              Vol {last ? formatCompact(last.volume) : ""}
            </text>
          </svg>
        </div>
      </section>
    </main>
  );
}
