# Canvas Authoring Reference

## Agent Prompt Example

User prompt to Codex:

```text
Use $soothsayer-canvas. Create a Soothsayer canvas for:
"For NVDA, buy momentum when SMA20 crosses above SMA50 and RSI is below 70; ask the oracle."

Read the current node catalog, write the raw canvas to examples/nvda_agent.sooth.json,
evaluate it to examples/nvda_agent.evaluated.json, and report marker/trade counts.
```

## Preferred API Flow

```bash
pnpm install
pnpm api
curl -s http://127.0.0.1:5050/v1/nodes
curl -s -X POST http://127.0.0.1:5050/v1/canvases \
  -H 'content-type: application/json' \
  --data-binary @examples/full_mvp_canvas.sooth.json
curl -s -X POST http://127.0.0.1:5050/v1/canvases/evaluate \
  -H 'content-type: application/json' \
  --data-binary @examples/full_mvp_canvas.sooth.json
```

`POST /v1/canvases/from-thesis` is only a deterministic template helper. Do not treat it as a real natural-language parser.

## Canonical Thesis Mapping

For:

```text
For NVDA, buy momentum when SMA20 crosses above SMA50 and RSI is below 70; ask the oracle.
```

Create this graph:

```text
data.ohlcv(price)
  -> series.close(close)
  -> indicator.sma(sma20, period=20)
  -> indicator.sma(sma50, period=50)
  -> condition.crossesAbove(cross)
  -> logic.all(entry)
  -> signal.buyMarkers(markers)
  -> backtest.longOnly(bt, holdDays=20)

series.close(close)
  -> indicator.rsi(rsi, period=28)
  -> condition.lt(notOverbought, threshold=70)
  -> logic.all(entry)

oracle.iching(oracle)
```

Use `RSI 28` for the demo fixture because it preserves the intended “below 70” filter while still producing visible entries. If real data changes, choose the period/threshold stated by the user unless the user asks for a demo-visible fixture.

## Minimal Raw Canvas Shape

```json
{
  "version": "sooth.canvas.v1",
  "meta": {
    "title": "NVDA momentum thesis",
    "thesis": "For NVDA, buy momentum when SMA20 crosses above SMA50 and RSI is below 70; ask the oracle.",
    "createdBy": "agent"
  },
  "nodes": [
    {
      "id": "price",
      "type": "data.ohlcv",
      "label": "NVDA daily candles",
      "params": { "symbol": "NVDA", "provider": "fixture", "range": "2y" },
      "position": { "x": 0, "y": 160 }
    }
  ],
  "edges": []
}
```

For a complete working example, inspect `examples/full_mvp_canvas.sooth.json`.

## Validation

Required checks before handoff:

```bash
pnpm typecheck
pnpm sooth --help
pnpm sooth eval examples/full_mvp_canvas.sooth.json --out examples/full_mvp_canvas.evaluated.json
```

For a useful frontend demo, evaluated JSON should include non-empty:

- `chart.candles`
- `chart.overlays`
- `chart.markers`
- `stats`

`oracle` should be present only when the graph contains `oracle.iching`.
