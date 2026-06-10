---
name: soothsayer-canvas
description: Create, validate, or evaluate Soothsayer `.sooth.json` canvas graphs from English investment theses or node-level instructions. Use when authoring Soothsayer nodes, edges, node params, examples, or frontend-ready evaluated canvas JSON.
---

# Soothsayer Canvas

Use this skill to turn an investment thesis into a valid `SoothsayerCanvas` graph. Do not rely on the demo `from-thesis` endpoint as the source of truth; author the canvas shape directly.

## Workflow

1. Read the current node catalog first:
   - Prefer live API: `pnpm api`, then `GET http://127.0.0.1:5050/v1/nodes`.
   - Fallback if the API is not running: read `packages/core/src/catalog.ts`.
2. Build a `.sooth.json` canvas with stable readable node IDs.
3. Validate it:
   - API: `POST /v1/canvases`
   - CLI smoke path: `pnpm sooth eval <canvas.sooth.json> --out <canvas.evaluated.json>`
4. Return both the raw canvas and, when useful for frontend handoff, the evaluated JSON path.

Do not scaffold, replace, or redesign `apps/web` unless the user explicitly asks for frontend work. Prefer writing canvas/evaluated JSON files that the existing frontend can consume.

## Contract

- Keep `version` as `sooth.canvas.v1`.
- Every node needs `id`, `type`, `label`, `params`, and `position`.
- Every edge uses `{ from: { node, port }, to: { node, port } }`.
- Use stable IDs like `price`, `close`, `sma20`, `sma50`, `cross`, `rsi`, `entry`, `markers`, `bt`, `oracle`.
- The oracle annotates uncertainty only; it must not create buy/sell signals unless explicitly requested.

## Reference

For the canonical authoring pattern, example graph, validation commands, and API payloads, read `references/canvas-authoring.md`.
