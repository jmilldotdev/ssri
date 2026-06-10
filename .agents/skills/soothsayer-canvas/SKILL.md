# Soothsayer Canvas Skill

Use this skill when creating or modifying `.sooth.json` canvases for this repo.

## Contract

- Keep `version` as `sooth.canvas.v1`.
- Use stable readable node IDs such as `price`, `close`, `sma20`, `entry`.
- Every node needs `id`, `type`, `label`, `params`, and `position`.
- Every edge uses `{ from: { node, port }, to: { node, port } }`.

## Fast Commands

```bash
pnpm sooth thesis "For NVDA, buy momentum when SMA20 crosses above SMA50 and RSI is below 70; ask the oracle." --symbol NVDA --iching --out examples/nvda_momentum.sooth.json
pnpm sooth preset golden-cross --symbol SPY --out examples/spy_golden_cross.sooth.json
pnpm sooth eval examples/nvda_momentum.sooth.json --out examples/nvda_momentum.evaluated.json
pnpm api
```

## Supported Nodes

- `data.ohlcv`
- `series.close`
- `indicator.sma`
- `indicator.rsi`
- `condition.crossesAbove`
- `condition.lt`
- `logic.all`
- `signal.buyMarkers`
- `backtest.longOnly`
- `oracle.iching`
