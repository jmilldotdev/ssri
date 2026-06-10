import { spawn } from "node:child_process";

const commands = [
  ["api", ["pnpm", ["api"]]],
  ["web", ["pnpm", ["web"]]]
];

const children = commands.map(([name, [cmd, args]]) => {
  const child = spawn(cmd, args, { stdio: "inherit" });
  child.on("exit", (code) => {
    if (code && !shuttingDown) {
      console.error(`${name} exited with code ${code}`);
      shutdown(code);
    }
  });
  return child;
});

let shuttingDown = false;

console.log("Soothsayer API: http://127.0.0.1:5050");
console.log("Soothsayer web: http://127.0.0.1:5173");

process.on("SIGINT", () => shutdown(130));
process.on("SIGTERM", () => shutdown(143));

function shutdown(code) {
  shuttingDown = true;
  for (const child of children) child.kill("SIGTERM");
  setTimeout(() => process.exit(code), 100);
}
