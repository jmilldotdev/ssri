import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Fundamentals } from "../../core/src";

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(here, "../fixtures/fundamentals.json");

export function getFixtureFundamentals(symbol: string): Fundamentals {
  const normalized = symbol.trim().toUpperCase() || "SPY";
  const fixtures = existsSync(fixturePath)
    ? JSON.parse(readFileSync(fixturePath, "utf8")) as Record<string, Fundamentals>
    : {};
  return fixtures[normalized] ?? { symbol: normalized, pe: 30, sector: "Unknown", asOf: "fixture-fallback" };
}
