import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const thesis = "For NVDA, buy momentum when SMA20 crosses above SMA50 and RSI is below 70; ask the oracle.";

run("pnpm", ["sooth", "create", thesis, "--symbol", "NVDA", "--iching", "--out", "examples/current.sooth.json", "--evaluated-out", "examples/current.evaluated.json"]);
run("pnpm", ["typecheck"]);
run("pnpm", ["skill:validate"]);

const evaluated = JSON.parse(readFileSync("examples/current.evaluated.json", "utf8"));
const checks = [
  ["candles", evaluated.chart.candles.length > 0],
  ["overlays", evaluated.chart.overlays.length > 0],
  ["markers", evaluated.chart.markers.length > 0],
  ["trades", evaluated.stats.trades > 0],
  ["oracle", Boolean(evaluated.oracle)]
];

for (const [name, ok] of checks) {
  if (!ok) throw new Error(`Smoke check failed: ${name}`);
}

console.log(`smoke ok: ${evaluated.chart.candles.length} candles, ${evaluated.chart.markers.length} markers, ${evaluated.stats.trades} trades`);

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
