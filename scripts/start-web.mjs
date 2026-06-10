import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

const webPackage = "apps/web/package.json";

if (!existsSync(webPackage)) {
  console.error("apps/web is not scaffolded in this checkout yet.");
  console.error("Start the API with `pnpm api`; the frontend package should add apps/web/package.json and a dev script.");
  process.exit(1);
}

const child = spawn("pnpm", ["--dir", "apps/web", "dev"], {
  stdio: "inherit",
  shell: false
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
