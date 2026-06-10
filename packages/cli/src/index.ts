#!/usr/bin/env tsx
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { Command } from "commander";
import { canvasFromThesis, evaluateCanvas, parseCanvas, presetCanvas, type PresetName } from "../../core/src";
import { getFixtureCandles, syntheticCandles } from "../../data/src";

const program = new Command();

program
  .name("sooth")
  .description("Generate and evaluate Soothsayer canvas JSON files.")
  .version("0.0.0");

program
  .command("thesis")
  .argument("<text>", "English investment thesis")
  .option("--symbol <symbol>", "Ticker symbol")
  .option("--iching", "Add deterministic I Ching oracle node")
  .requiredOption("--out <path>", "Output .sooth.json path")
  .action((text: string, opts: { symbol?: string; iching?: boolean; out: string }) => {
    writeJson(opts.out, canvasFromThesis(text, { symbol: opts.symbol, iching: opts.iching }));
  });

program
  .command("create")
  .argument("<text>", "English investment thesis")
  .option("--symbol <symbol>", "Ticker symbol")
  .option("--iching", "Add deterministic I Ching oracle node")
  .option("--out <path>", "Output .sooth.json path", "examples/current.sooth.json")
  .option("--evaluated-out <path>", "Output evaluated JSON path", "examples/current.evaluated.json")
  .action(async (text: string, opts: { symbol?: string; iching?: boolean; out: string; evaluatedOut: string }) => {
    const canvas = canvasFromThesis(text, { symbol: opts.symbol, iching: opts.iching });
    const evaluated = await evaluateCanvas(canvas, getFixtureCandles);
    writeJson(opts.out, canvas);
    writeJson(opts.evaluatedOut, evaluated);
  });

program
  .command("preset")
  .argument("<name>", "Preset name: golden-cross, rsi-bounce, momentum-oracle")
  .option("--symbol <symbol>", "Ticker symbol", "SPY")
  .requiredOption("--out <path>", "Output .sooth.json path")
  .action((name: PresetName, opts: { symbol: string; out: string }) => {
    writeJson(opts.out, presetCanvas(name, opts.symbol));
  });

program
  .command("eval")
  .argument("<path>", "Input .sooth.json path")
  .requiredOption("--out <path>", "Output evaluated JSON path")
  .action(async (path: string, opts: { out: string }) => {
    const canvas = parseCanvas(JSON.parse(readFileSync(path, "utf8")));
    const evaluated = await evaluateCanvas(canvas, getFixtureCandles);
    writeJson(opts.out, evaluated);
  });

program
  .command("fetch")
  .description("Create a deterministic local fixture CSV for demo reliability.")
  .requiredOption("--symbol <symbol>", "Ticker symbol")
  .requiredOption("--out <path>", "Output CSV path")
  .action((opts: { symbol: string; out: string }) => {
    const rows = syntheticCandles(opts.symbol).map((candle) =>
      [candle.date, candle.open, candle.high, candle.low, candle.close, candle.volume ?? 0].join(",")
    );
    writeText(opts.out, ["date,open,high,low,close,volume", ...rows].join("\n") + "\n");
  });

program.parseAsync();

function writeJson(path: string, value: unknown): void {
  writeText(path, JSON.stringify(value, null, 2) + "\n");
}

function writeText(path: string, value: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value);
  console.log(`wrote ${path}`);
}
