import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";
import { canvasFromThesis, evaluateCanvas, parseCanvas, presetCanvas, type PresetName } from "../../core/src";
import { getFixtureCandles } from "../../data/src";

const port = Number(process.env.PORT ?? 5050);

const server = createServer(async (req, res) => {
  try {
    await route(req, res);
  } catch (error) {
    json(res, 500, { error: error instanceof Error ? error.message : "Unknown server error" });
  }
});

server.listen(port, () => {
  console.log(`Soothsayer API listening on http://127.0.0.1:${port}`);
});

async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
  cors(res);
  if (req.method === "OPTIONS") return empty(res, 204);

  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    return json(res, 200, { ok: true });
  }

  if (req.method === "GET" && url.pathname === "/v1/data/ohlcv") {
    const symbol = url.searchParams.get("symbol") ?? "SPY";
    const range = url.searchParams.get("range") ?? "2y";
    return json(res, 200, { symbol: symbol.toUpperCase(), range, candles: getFixtureCandles(symbol, range) });
  }

  if (req.method === "POST" && url.pathname === "/v1/canvases/from-thesis") {
    const body = await readJson(req);
    const thesis = stringBody(body.thesis, "Buy SPY when SMA20 crosses above SMA50.");
    const canvas = canvasFromThesis(thesis, { symbol: optionalString(body.symbol), iching: Boolean(body.iching) });
    return json(res, 200, { canvas });
  }

  if (req.method === "POST" && url.pathname === "/v1/canvases/preset") {
    const body = await readJson(req);
    const name = stringBody(body.name, "golden-cross") as PresetName;
    const canvas = presetCanvas(name, stringBody(body.symbol, "SPY"));
    return json(res, 200, { canvas });
  }

  if (req.method === "POST" && url.pathname === "/v1/canvases/evaluate") {
    const body = await readJson(req);
    const canvas = parseCanvas(body.canvas ?? body);
    const evaluated = await evaluateCanvas(canvas, getFixtureCandles);
    return json(res, 200, evaluated);
  }

  return json(res, 404, { error: "Not found" });
}

function cors(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
}

function empty(res: ServerResponse, status: number): void {
  res.writeHead(status);
  res.end();
}

function json(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(value, null, 2));
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? JSON.parse(raw) : {};
}

function stringBody(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}
