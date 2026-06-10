# Soothsayer Hackathon Plan

## Mission

Build a 2.5-hour visual demo of **Soothsayer**: a web-based, node-canvas tool for turning an English investment thesis into a technical-analysis graph, chart, markers, a tiny backtest, and one playful I Ching/oracle annotation.

The demo is explicitly for education/prototyping. It is not investment advice, not real-time trading, and not a broker.

## Demo promise

> “Describe an investment thesis in English. Soothsayer turns it into a visual canvas of data, indicators, conditions, signals, and an oracle/risk annotation. You can tweak the nodes and immediately see the chart/signals.”

The most important demo flow:

```text
User thesis:
"For NVDA, I want a momentum entry when the 20-day average crosses above the 50-day average, but avoid entries when RSI is overbought. Ask the oracle whether to size up or wait."

CLI/API:
sooth thesis "..." --symbol NVDA --iching --out examples/nvda_momentum.sooth.json

Web:
Load canvas -> React Flow nodes -> chart with SMA lines and buy markers -> stats cards -> oracle card.
```

## Ruthless scope

Ship these:

- React visual canvas rendering a Soothsayer JSON file.
- A small node palette / inspector UI.
- Data fixture provider, plus optional live refresh provider.
- CLI that converts a thesis/preset into a `.sooth.json` canvas.
- Shared canvas schema in TypeScript.
- 8–10 node types.
- I Ching node as a deterministic seeded oracle annotation.

Do not ship these today:

- Real-time data.
- Broker integration.
- Authentication.
- Portfolio optimization.
- General-purpose scripting.
- Full backtesting framework.
- Dozens of indicators.
- ML prediction.
- Production-grade legal/compliance language.

## Repository layout

Use a simple pnpm workspace. Do not overbuild package builds; import TypeScript source directly if needed.

```text
soothsayer/
  PLAN.md
  AGENTS.md
  package.json
  pnpm-workspace.yaml
  apps/
    web/
      src/
        App.tsx
        components/
          CanvasView.tsx
          ChartPanel.tsx
          Inspector.tsx
          NodeCard.tsx
        styles.css
        fixtures/demo.sooth.json
  packages/
    core/
      src/
        schema.ts
        nodes.ts
        evaluate.ts
        indicators.ts
        iching.ts
        presets.ts
    data/
      src/
        providers.ts
        fixtureProvider.ts
        stooqProvider.ts
        alphaVantageProvider.ts
      fixtures/
        NVDA.csv
        AAPL.csv
        SPY.csv
    cli/
      src/
        index.ts
  examples/
    nvda_momentum.sooth.json
    spy_golden_cross.sooth.json
  .agents/
    skills/
      soothsayer-canvas/
        SKILL.md
```

## Initial setup commands

```bash
mkdir soothsayer && cd soothsayer
pnpm init
pnpm create vite apps/web --template react-ts
mkdir -p packages/core/src packages/data/src packages/data/fixtures packages/cli/src examples .agents/skills/soothsayer-canvas
cat > pnpm-workspace.yaml <<'YAML'
packages:
  - "apps/*"
  - "packages/*"
YAML

pnpm --filter web add @xyflow/react lightweight-charts lucide-react
pnpm add -w zod commander tsx papaparse
pnpm add -w -D typescript @types/node
```

Root `package.json` scripts:

```json
{
  "scripts": {
    "dev": "pnpm --filter web dev",
    "sooth": "tsx packages/cli/src/index.ts",
    "demo:canvas": "tsx packages/cli/src/index.ts thesis \"For NVDA, buy momentum when SMA20 crosses above SMA50 and RSI is below 70; ask the oracle.\" --symbol NVDA --iching --out examples/nvda_momentum.sooth.json"
  }
}
```

## Ownership split

### Partner: frontend / visuals

Primary files:

```text
apps/web/src/App.tsx
apps/web/src/components/*
apps/web/src/styles.css
apps/web/src/fixtures/demo.sooth.json
```

Responsibilities:

- Load a local `.sooth.json` canvas fixture.
- Render nodes and edges with React Flow.
- Make nodes look beautiful and legible.
- Render right-side chart/results/oracle panel from evaluated output.
- Add a thesis input box and a “Generate Canvas” button that can initially load a canned canvas.
- Add inspector UI for changing ticker/period/threshold params locally.

### You: data / integrations / CLI / schema

Primary files:

```text
packages/core/src/*
packages/data/src/*
packages/data/fixtures/*
packages/cli/src/index.ts
examples/*.sooth.json
.agents/skills/soothsayer-canvas/SKILL.md
AGENTS.md
```

Responsibilities:

- Define `SoothsayerCanvas` schema.
- Implement indicators: SMA and RSI.
- Implement boolean conditions: crossesAbove, lt, and all.
- Implement simple backtest/marker generation.
- Implement I Ching oracle node.
- Implement CLI thesis/preset generator.
- Provide fixture CSVs and a clean data provider interface.

## Integration contract

Everything meets at one file format: `*.sooth.json`.

Frontend can render the graph without any backend. Backend/CLI can create and evaluate the graph without any frontend. This keeps you independent.

Canonical canvas shape:

```ts
export type SoothsayerCanvas = {
  version: "sooth.canvas.v1";
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
  type:
    | "data.ohlcv"
    | "series.close"
    | "indicator.sma"
    | "indicator.rsi"
    | "condition.crossesAbove"
    | "condition.lt"
    | "logic.all"
    | "signal.buyMarkers"
    | "backtest.longOnly"
    | "oracle.iching";
  label: string;
  params: Record<string, unknown>;
  position: { x: number; y: number };
};

export type SoothEdge = {
  id: string;
  from: { node: string; port: string };
  to: { node: string; port: string };
};
```

Example canvas:

```json
{
  "version": "sooth.canvas.v1",
  "meta": {
    "title": "NVDA momentum with oracle check",
    "thesis": "Buy NVDA momentum when SMA20 crosses above SMA50 and RSI is below 70; ask the oracle whether to press or wait.",
    "createdBy": "agent"
  },
  "nodes": [
    { "id": "price", "type": "data.ohlcv", "label": "NVDA daily candles", "params": { "symbol": "NVDA", "provider": "fixture", "range": "2y" }, "position": { "x": 0, "y": 120 } },
    { "id": "close", "type": "series.close", "label": "Close price", "params": {}, "position": { "x": 220, "y": 120 } },
    { "id": "sma20", "type": "indicator.sma", "label": "SMA 20", "params": { "period": 20 }, "position": { "x": 440, "y": 40 } },
    { "id": "sma50", "type": "indicator.sma", "label": "SMA 50", "params": { "period": 50 }, "position": { "x": 440, "y": 200 } },
    { "id": "cross", "type": "condition.crossesAbove", "label": "SMA20 crosses above SMA50", "params": {}, "position": { "x": 680, "y": 80 } },
    { "id": "rsi", "type": "indicator.rsi", "label": "RSI 14", "params": { "period": 14 }, "position": { "x": 440, "y": 360 } },
    { "id": "notOverbought", "type": "condition.lt", "label": "RSI below 70", "params": { "threshold": 70 }, "position": { "x": 680, "y": 320 } },
    { "id": "entry", "type": "logic.all", "label": "Entry: all true", "params": {}, "position": { "x": 920, "y": 200 } },
    { "id": "markers", "type": "signal.buyMarkers", "label": "Buy markers", "params": {}, "position": { "x": 1160, "y": 120 } },
    { "id": "bt", "type": "backtest.longOnly", "label": "Tiny backtest", "params": { "holdDays": 20 }, "position": { "x": 1160, "y": 280 } },
    { "id": "oracle", "type": "oracle.iching", "label": "I Ching oracle", "params": { "question": "Should we press this thesis or wait?", "seed": "NVDA-hackathon" }, "position": { "x": 920, "y": 460 } }
  ],
  "edges": [
    { "id": "e1", "from": { "node": "price", "port": "ohlcv" }, "to": { "node": "close", "port": "ohlcv" } },
    { "id": "e2", "from": { "node": "close", "port": "series" }, "to": { "node": "sma20", "port": "series" } },
    { "id": "e3", "from": { "node": "close", "port": "series" }, "to": { "node": "sma50", "port": "series" } },
    { "id": "e4", "from": { "node": "sma20", "port": "series" }, "to": { "node": "cross", "port": "a" } },
    { "id": "e5", "from": { "node": "sma50", "port": "series" }, "to": { "node": "cross", "port": "b" } },
    { "id": "e6", "from": { "node": "close", "port": "series" }, "to": { "node": "rsi", "port": "series" } },
    { "id": "e7", "from": { "node": "rsi", "port": "series" }, "to": { "node": "notOverbought", "port": "series" } },
    { "id": "e8", "from": { "node": "cross", "port": "condition" }, "to": { "node": "entry", "port": "condition" } },
    { "id": "e9", "from": { "node": "notOverbought", "port": "condition" }, "to": { "node": "entry", "port": "condition" } },
    { "id": "e10", "from": { "node": "entry", "port": "condition" }, "to": { "node": "markers", "port": "condition" } },
    { "id": "e11", "from": { "node": "entry", "port": "condition" }, "to": { "node": "bt", "port": "entry" } },
    { "id": "e12", "from": { "node": "price", "port": "ohlcv" }, "to": { "node": "bt", "port": "ohlcv" } }
  ]
}
```

## CLI/API design

### CLI commands

```bash
# Generate a canvas from an English thesis using hardcoded templates/regex.
pnpm sooth thesis "Buy SPY when SMA20 crosses above SMA50 and RSI is below 70" --symbol SPY --iching --out examples/spy.sooth.json

# Generate known demo presets.
pnpm sooth preset golden-cross --symbol SPY --out examples/spy_golden_cross.sooth.json
pnpm sooth preset rsi-bounce --symbol AAPL --out examples/aapl_rsi_bounce.sooth.json

# Evaluate a canvas into chart-ready JSON.
pnpm sooth eval examples/spy.sooth.json --out examples/spy.evaluated.json

# Optional: refresh fixture data.
pnpm sooth fetch --symbol NVDA --provider alpha-vantage --out packages/data/fixtures/NVDA.csv
```

### API endpoints, only if time allows

The API is just a wrapper around the same core functions. Do not build it first.

```http
POST /v1/canvases/from-thesis
POST /v1/canvases/evaluate
GET  /v1/data/ohlcv?symbol=NVDA&provider=fixture
```

Response for `POST /v1/canvases/from-thesis` is a `SoothsayerCanvas`.

## Thesis-to-canvas parser

Do not use an LLM integration unless the hackathon specifically gives you one already wired. Use templates and make it look magical.

Handle only these phrases:

```text
"SMA20 crosses above SMA50"
"20 day moving average crosses above 50 day moving average"
"RSI below 70"
"RSI under 70"
"golden cross"
"oversold bounce"
"ask the oracle"
"i ching"
```

Fallback behavior:

- If no recognizable phrase: use the golden-cross template.
- If no ticker: default to `SPY`.
- If `oracle`, `i ching`, `random`, or `vibe` appears: add `oracle.iching`.

## Node subset

Implement only these nodes:

1. `data.ohlcv`
   - Params: `symbol`, `provider`, `range`.
   - Output: `ohlcv`.

2. `series.close`
   - Input: `ohlcv`.
   - Output: `series`.

3. `indicator.sma`
   - Input: `series`.
   - Params: `period`.
   - Output: `series`.

4. `indicator.rsi`
   - Input: `series`.
   - Params: `period`.
   - Output: `series`.

5. `condition.crossesAbove`
   - Inputs: `a`, `b`.
   - Output: boolean `condition` where `a[t-1] <= b[t-1] && a[t] > b[t]`.

6. `condition.lt`
   - Input: `series`.
   - Params: `threshold`.
   - Output: boolean `condition`.

7. `logic.all`
   - Input: multiple boolean conditions.
   - Output: boolean condition.

8. `signal.buyMarkers`
   - Input: boolean condition.
   - Output: chart markers.

9. `backtest.longOnly`
   - Inputs: `ohlcv`, entry condition.
   - Params: `holdDays`.
   - Output: cards: total return, number of trades, hit rate, average trade.

10. `oracle.iching`
   - Params: `question`, `seed`.
   - Output: `{ hexagramNumber, hexagramName, changingLines, stance, note }`.

## I Ching module

Keep it fun and deterministic. This should not block the technical analysis path.

Implementation plan:

- Use seeded pseudo-randomness so the demo is reproducible.
- Generate six lines using a three-coin-style method: each line is 6, 7, 8, or 9.
- Interpret 6/8 as yin, 7/9 as yang.
- Treat 6 and 9 as changing lines.
- Map the resulting binary pattern to a number 1–64.
- Use a tiny local table of 64 names if time permits; otherwise ship 8 archetypes and map `number % 8`.
- Output a playful but sober risk stance:
  - `advance`
  - `wait`
  - `reduce size`
  - `observe only`

Example output:

```json
{
  "hexagramNumber": 46,
  "hexagramName": "Pushing Upward",
  "changingLines": [2, 5],
  "stance": "advance carefully",
  "note": "The oracle likes the trend but asks for smaller size until confirmation."
}
```

Optional integration:

- Do not let the oracle decide buy/sell signals by default.
- Let it annotate risk posture or suggested position-size multiplier.
- This keeps the joke funny without making the product look unserious.

## Data plan

Use daily candles only. Use cached CSVs for demo reliability.

Provider priority:

1. `fixture`: local CSV. Always works.
2. `stooq`: no-key historical fallback if easy.
3. `alpha-vantage`: free API key fallback with strict caching.
4. `yfinance`: emergency research-only fallback, with clear disclaimer.

Fixture CSV columns:

```csv
date,open,high,low,close,volume
2025-01-02,100,103,99,102,1234567
```

Adapter interface:

```ts
export type Candle = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type MarketDataProvider = {
  getDailyCandles(symbol: string, opts: { range: "6mo" | "1y" | "2y" }): Promise<Candle[]>;
};
```

## Evaluation output shape

The web should receive chart-ready data, not reconstruct everything.

```ts
export type EvaluatedCanvas = {
  canvas: SoothsayerCanvas;
  chart: {
    candles: Candle[];
    overlays: Array<{ id: string; label: string; points: Array<{ time: string; value: number }> }>;
    markers: Array<{ time: string; position: "belowBar" | "aboveBar"; shape: "arrowUp" | "arrowDown"; text: string }>;
  };
  stats: {
    totalReturnPct: number;
    trades: number;
    hitRatePct: number;
    avgTradePct: number;
  };
  oracle?: {
    hexagramNumber: number;
    hexagramName: string;
    changingLines: number[];
    stance: string;
    note: string;
  };
};
```

## 2.5-hour timeline

### 0:00–0:15 — repo and contract

- Create Vite app and workspace folders.
- Commit baseline.
- Add `PLAN.md`, `AGENTS.md`, schema stub, and one example `.sooth.json`.
- Partner starts visual shell from example canvas.
- You start core evaluator and CLI.

### 0:15–0:45 — parallel MVPs

Partner:

- Render React Flow nodes from JSON.
- Add app layout: left thesis panel, center canvas, right chart/results.
- Style node cards.

You:

- Implement `sma`, `rsi`, `crossesAbove`, `lt`, `all`.
- Add fixture CSV loader.
- Add `evalCanvas(canvas)` returning overlays/markers/stats.

### 0:45–1:20 — visible data

Partner:

- Render chart from evaluated fixture output.
- Render stats cards and oracle card.

You:

- Implement CLI `preset` and `thesis` commands.
- Add I Ching node.
- Generate `examples/nvda_momentum.sooth.json`.

### 1:20–1:50 — integration

- Web loads `examples/nvda_momentum.sooth.json` or copied fixture.
- The “Generate from thesis” button either calls local generator or swaps to generated JSON.
- Fix mismatched field names.
- Cut any broken feature immediately.

### 1:50–2:15 — polish

- Add three canned buttons: `Golden Cross`, `RSI Filter`, `Ask the Oracle`.
- Add big thesis text at top.
- Add hover/inspector copy explaining nodes.
- Make demo deterministic.

### 2:15–2:30 — pitch rehearsal

Demo script:

1. Show blank-ish canvas.
2. Type thesis.
3. Click Generate.
4. Nodes appear.
5. Chart shows candles, SMA overlays, buy markers.
6. Change SMA 20 to SMA 10 and show the idea is tweakable.
7. Show tiny backtest cards.
8. Reveal I Ching oracle card.
9. End with CLI/API angle: coding agents can create canvases using the same `.sooth.json` contract.

## Cut lines

If time is bad, cut in this order:

1. API server.
2. Live data refresh.
3. RSI calculation.
4. Backtest stats beyond trade count.
5. Editable node params.
6. I Ching changing lines.

Never cut:

- Visual canvas.
- Generated canvas from English thesis.
- Chart with at least one overlay and signal markers.
- CLI that creates the canvas JSON.

## Pitch copy

> Soothsayer is a visual thesis compiler for markets. You describe a technical thesis in English, and it becomes a node canvas: data, indicators, conditions, signals, and a tiny backtest. It gives non-quants a way to understand and tweak strategies visually, while giving coding agents a stable CLI/API and canvas format to generate workflows automatically. And because markets are chaotic, we added an I Ching oracle node—not to predict prices, but to make uncertainty visible.
