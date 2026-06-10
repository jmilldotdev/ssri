Use $soothsayer-canvas.

Disposable smoke test for the Soothsayer repo.

Do not create, modify, or scaffold `apps/web`; frontend is owned by another collaborator.
Do not start long-running dev servers.

Task:

1. Inspect the node catalog from `packages/core/src/catalog.ts`.
2. Create a Soothsayer canvas for:
   "For NVDA, buy momentum when SMA20 crosses above SMA50 and RSI is below 70; ask the oracle."
3. Write the raw canvas to `examples/codex_smoke.sooth.json`.
4. Write evaluated output to `examples/codex_smoke.evaluated.json`.
5. Run the repo smoke command.
6. Report whether the evaluated output has candles, overlays, markers, trades, and oracle data.

Preferred commands:

```bash
pnpm sooth create "For NVDA, buy momentum when SMA20 crosses above SMA50 and RSI is below 70; ask the oracle." --symbol NVDA --iching --out examples/codex_smoke.sooth.json --evaluated-out examples/codex_smoke.evaluated.json
pnpm smoke
```
