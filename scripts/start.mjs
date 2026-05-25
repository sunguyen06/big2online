import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const isWindows = process.platform === "win32";
const frontendCommand = isWindows
  ? path.join(rootDir, "node_modules", ".bin", "next.cmd")
  : path.join(rootDir, "node_modules", ".bin", "next");
const backendCommand = isWindows
  ? path.join(rootDir, "node_modules", ".bin", "tsx.cmd")
  : path.join(rootDir, "node_modules", ".bin", "tsx");

const children = [];
let isShuttingDown = false;

function spawnService(name, command, args, extraEnv = {}) {
  const child = isWindows
    ? spawn(command, args, {
        cwd: rootDir,
        env: {
          ...process.env,
          ...extraEnv,
          NODE_ENV: "production",
        },
        shell: true,
        stdio: "inherit",
      })
    : spawn(command, args, {
        cwd: rootDir,
        env: {
          ...process.env,
          ...extraEnv,
          NODE_ENV: "production",
        },
        shell: false,
        stdio: "inherit",
      });

  child.on("exit", (code, signal) => {
    if (isShuttingDown) {
      return;
    }

    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    console.error(`[${name}] exited with ${reason}`);
    shutdown(code ?? 1);
  });

  children.push(child);
}

function shutdown(exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => process.exit(exitCode), 200);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log("> Starting frontend on http://localhost:3000");
console.log("> Starting lobby backend on http://localhost:8000");

spawnService("frontend", frontendCommand, ["start", "--hostname", "localhost", "--port", "3000"]);
spawnService("backend", backendCommand, ["server.ts"], {
  FRONTEND_ORIGIN: "http://localhost:3000",
  LOBBY_HOST: "localhost",
  LOBBY_PORT: "8000",
});
