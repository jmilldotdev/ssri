# AGENTS.md

## Project

Soothsayer is a hackathon web app that turns an English investment thesis into a visual technical-analysis canvas. The core artifact is a `.sooth.json` file containing nodes, edges, params, and layout. The UI renders this canvas; the CLI/API generates and evaluates it.

This project is a demo/prototyping tool, not investment advice or a trading system.

## Setup commands

Use pnpm.

```bash
pnpm install
pnpm api
pnpm sooth preset golden-cross --symbol SPY --out examples/spy_golden_cross.sooth.json
pnpm sooth thesis "Buy NVDA when SMA20 crosses above SMA50 and RSI is below 70; ask the oracle" --symbol NVDA --iching --out examples/nvda_momentum.sooth.json
pnpm sooth eval examples/nvda_momentum.sooth.json --out examples/nvda_momentum.evaluated.json
```

## Repository map

```text
apps/web/                 React/Vite frontend
packages/core/src/        schema, indicators, evaluator, presets, I Ching
packages/data/src/        market data providers and fixture loading
packages/data/fixtures/   cached CSVs for demo data
packages/cli/src/         CLI entrypoint
packages/api/src/         thin HTTP API for frontend integration
examples/                 generated demo canvases
.agents/skills/           repository skills for coding agents
```

## Hard rule: preserve the canvas contract

The shared interface is `SoothsayerCanvas` in `packages/core/src/schema.ts`.

Do not change field names in the schema unless you update:

- frontend loader/rendering code,
- CLI canvas generation,
- examples,
- evaluator tests or smoke checks.

Canonical version:

```ts
version: "sooth.canvas.v1"
```

Node IDs should be stable, readable strings like `price`, `sma20`, `entry`, not random UUIDs unless necessary.

## Coding conventions

- Prefer TypeScript.
- Prefer small pure functions in `packages/core`.
- Do not add heavy dependencies during the hackathon unless absolutely necessary.
- Keep data deterministic. Use local CSV fixtures first.
- Use seeded randomness for oracle output.
- Avoid async/network calls in rendering paths when fixtures can be used.
- No broker integration, order execution, or claims of market prediction.

## Frontend guidance

When working in `apps/web`:

- The UI should be able to render from a static `.sooth.json` fixture even if the API/CLI is broken.
- Use `@xyflow/react` for the canvas.
- Treat nodes as display/edit cards; do not reimplement the whole evaluator in the UI.
- The chart panel should accept an already evaluated object when available.
- Visual clarity beats feature count.

Primary visual pieces:

- thesis input / preset buttons,
- React Flow canvas,
- node inspector,
- chart/results panel,
- oracle card.

## Core/evaluator guidance

When working in `packages/core`:

- Implement only the MVP nodes: OHLCV, close, SMA, RSI, crossesAbove, lt, all, buyMarkers, longOnly backtest, iching.
- Evaluation should tolerate missing data and return useful partial output.
- Prefer returning chart-ready arrays over abstract objects.
- Backtest can be deliberately simple: enter on signal, hold N days, compute trade returns.

## CLI guidance

When working in `packages/cli`:

- The CLI should be impressive but template-based.
- `thesis` command may use regex/string matching, not a full NLP parser.
- Always write valid `.sooth.json`.
- Include layout positions in generated nodes so the frontend looks good immediately.
- Provide `preset` commands for deterministic demo recovery.

Required commands:

```bash
pnpm sooth thesis "..." --symbol NVDA --iching --out examples/nvda_momentum.sooth.json
pnpm sooth preset golden-cross --symbol SPY --out examples/spy_golden_cross.sooth.json
pnpm sooth eval examples/nvda_momentum.sooth.json --out examples/nvda_momentum.evaluated.json
```

## API guidance

The API is intentionally thin and calls the same core functions as the CLI.

Run it with:

```bash
pnpm api
```

Endpoints:

- `GET /health`
- `GET /v1/data/ohlcv?symbol=NVDA&range=2y`
- `GET /v1/nodes` returns the node catalog an agent should use to author canvases
- `POST /v1/canvases` validates a posted canvas graph
- `POST /v1/canvases/from-thesis` is only a deterministic demo template helper
- `POST /v1/canvases/preset` with `{ "name": "golden-cross", "symbol": "SPY" }`
- `POST /v1/canvases/evaluate` with either a canvas body or `{ "canvas": ... }`

Preferred creation flow:

1. Agent reads `GET /v1/nodes`, `packages/core/src/schema.ts`, and this file.
2. Agent turns the English thesis into a `SoothsayerCanvas` graph.
3. Agent posts the canvas to `POST /v1/canvases` for validation.
4. Agent posts the same canvas to `POST /v1/canvases/evaluate`.

Do not treat `from-thesis` as a real language parser. It is a recovery/demo shortcut.

## Data guidance

Use providers in this order:

1. fixture CSVs,
2. Stooq historical download if easy,
3. Alpha Vantage with `ALPHA_VANTAGE_API_KEY`,
4. yfinance only as an emergency research/demo fallback.

Never let the demo depend on a network request.

## I Ching/oracle guidance

The oracle is playful uncertainty annotation, not trading logic.

- Use seeded randomness.
- Return a small object: hexagram number/name, changing lines, stance, note.
- Do not let the oracle directly generate buy/sell markers unless explicitly asked.
- Good stances: `advance carefully`, `wait`, `reduce size`, `observe only`.

## Done definition for the hackathon

A successful demo has:

- a thesis string,
- a generated `.sooth.json`,
- visible nodes and edges,
- chart with candles/SMA overlays/buy markers,
- tiny backtest stats,
- oracle card,
- one CLI command that generated the same canvas.
