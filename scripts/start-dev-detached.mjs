import { spawn } from "node:child_process";
import { mkdirSync, openSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const viteBin = join(root, "node_modules", "vite", "bin", "vite.js");
const pidFile = join(root, ".dev-server.pid");
const outLog = openSync(join(root, "dev-server.out.log"), "a");
const errLog = openSync(join(root, "dev-server.err.log"), "a");

const child = spawn(
  process.execPath,
  [viteBin, "--host", "0.0.0.0", "--port", "5173"],
  {
    cwd: root,
    detached: true,
    stdio: ["ignore", outLog, errLog],
    windowsHide: true,
  },
);

child.unref();
mkdirSync(dirname(pidFile), { recursive: true });
writeFileSync(pidFile, String(child.pid));

console.log(`Started Resume Tracker dev server on http://localhost:5173`);
console.log(`PID ${child.pid}`);
