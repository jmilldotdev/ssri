import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

const webPackage = "apps/web/package.json";
const nextBin = "apps/web/node_modules/.bin/next";

if (!existsSync(webPackage)) {
  console.error("apps/web is not scaffolded in this checkout yet.");
  console.error("Start the API with `pnpm api`; the frontend package should add apps/web/package.json and a dev script.");
  process.exit(1);
}

if (!existsSync(nextBin)) {
  console.error("apps/web dependencies are not installed yet.");
  console.error("Run `cd apps/web && pnpm install`, then retry `pnpm web`.");
  process.exit(1);
}

const child = spawn("./node_modules/.bin/next", ["dev", "--webpack"], {
  cwd: "apps/web",
  stdio: "inherit",
  shell: false
});

child.on("error", (error) => {
  console.error(`Failed to start apps/web dev server: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
