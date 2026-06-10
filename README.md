# Soothsayer

Soothsayer turns a market thesis into a `.sooth.json` node canvas that can be rendered by the web UI and evaluated by the CLI/API.

This is a hackathon prototype. It is not investment advice, not a trading system, and not a broker integration.

## Fresh Clone

```bash
pnpm install
pnpm typecheck
```

## CLI

Preferred repo-local command:

```bash
pnpm sooth --help
pnpm sooth thesis "For NVDA, buy momentum when SMA20 crosses above SMA50 and RSI is below 70; ask the oracle." --symbol NVDA --iching --out examples/nvda_agent.sooth.json
pnpm sooth eval examples/nvda_agent.sooth.json --out examples/nvda_agent.evaluated.json
```

After `pnpm install`, the workspace also exposes a linked binary:

```bash
pnpm exec sooth --help
```

Agents should use `pnpm sooth` first because it is explicit and works from the repo root.

## API

```bash
pnpm api
```

The API listens on `http://127.0.0.1:5050` by default.

Useful endpoints:

```http
GET  /health
GET  /v1/nodes
POST /v1/canvases
POST /v1/canvases/evaluate
GET  /v1/data/ohlcv?symbol=NVDA&range=2y
```

## Disposable Agent Flow

```bash
pnpm install
pnpm sooth create "For NVDA, buy momentum when SMA20 crosses above SMA50 and RSI is below 70; ask the oracle." --symbol NVDA --iching
pnpm smoke
```

This creates:

```text
examples/current.sooth.json
examples/current.evaluated.json
```

## Web UI

The frontend package is expected at `apps/web`.

Once `apps/web/package.json` exists with a `dev` script, launch it with:

```bash
pnpm web
```

To start API and web together after the frontend lands:

```bash
pnpm inspect
```

In the current backend-only checkout, `pnpm web` exits with a clear message instead of pretending a web app exists.

## Codex Programmatic Smoke Test

Run:

```bash
pnpm codex:smoke
```

Equivalent raw command:

```bash
codex exec -C . -s workspace-write -a never - < scripts/codex-smoke-prompt.md
```

The prompt explicitly tells Codex not to touch `apps/web`; it only tests the skill, CLI, and generated canvas/evaluation outputs.

## Agent Skill

This repo includes a repo-local Codex skill:

```text
.agents/skills/soothsayer-canvas
```

Example prompt:

```text
Use $soothsayer-canvas.

Create a Soothsayer canvas for:
"For NVDA, buy momentum when SMA20 crosses above SMA50 and RSI is below 70; ask the oracle."

Read the current node catalog, write the raw canvas to examples/nvda_agent.sooth.json,
evaluate it to examples/nvda_agent.evaluated.json, and report marker/trade counts.
```

Validate/package the skill:

```bash
pnpm skill:validate
pnpm skill:pack
```
