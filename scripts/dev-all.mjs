import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const children = [
  spawn(npm, ["run", "dev"], { stdio: "inherit", cwd: path.join(repositoryRoot, "frontend"), shell: false }),
  spawn(npm, ["run", "dev"], { stdio: "inherit", cwd: path.join(repositoryRoot, "backend"), shell: false }),
];
const stop = () => children.forEach(c => c.kill("SIGTERM"));
process.on("SIGINT", stop); process.on("SIGTERM", stop);
children.forEach(c => c.on("exit", code => { if (code && code !== 0) process.exitCode = code; }));
