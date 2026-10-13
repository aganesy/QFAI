import childProcess from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

// This preload replaces acquisition only in explicitly selected legacy init children.
if (process.argv[2] !== "init") throw new Error("Legacy acquisition preload requires init.");
const original = childProcess.execFile;
const execute = promisify(original);

async function acquire(command, args, options) {
  if (
    ["claude", "codex", "copilot"].includes(command) &&
    args.length === 1 &&
    args[0] === "--version"
  )
    return { stdout: "", stderr: "", failed: true };
  const invocation = args[0]?.endsWith("npm-cli.js") ? args.slice(1) : args;
  const inside = (file) => {
    if (typeof file !== "string" || typeof options.cwd !== "string") return false;
    const relative = path.relative(path.join(options.cwd, ".qfai", "tools"), file);
    return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  };
  const npmLauncher =
    command === "npm" ||
    (command === process.execPath &&
      args[0] !== undefined &&
      path.basename(args[0]) === "npm-cli.js");
  if (
    npmLauncher &&
    invocation.length === 8 &&
    invocation[0] === "install" &&
    invocation[1] === "--prefix" &&
    inside(invocation[2]) &&
    invocation.slice(3).join("\0") ===
      [
        "--no-audit",
        "--no-fund",
        "--save-exact",
        "--ignore-scripts",
        "@colbymchenry/codegraph@1.6.2",
      ].join("\0")
  ) {
    const shim = path.join(
      invocation[2],
      "node_modules",
      "@colbymchenry",
      "codegraph",
      "npm-shim.js",
    );
    await mkdir(path.dirname(shim), { recursive: true });
    await writeFile(shim, "Legacy acquisition fixture executable\n");
    return { stdout: "", stderr: "" };
  }
  if (
    command === "uv" &&
    invocation.length === 5 &&
    invocation.slice(0, 4).join("\0") ===
      ["venv", "--python", ">=3.10", "--no-python-downloads"].join("\0") &&
    inside(invocation[4])
  ) {
    const interpreter =
      process.platform === "win32"
        ? path.join(invocation[4], "Scripts", "python.exe")
        : path.join(invocation[4], "bin", "python");
    await mkdir(path.dirname(interpreter), { recursive: true });
    await writeFile(interpreter, "Legacy acquisition fixture interpreter\n");
    return { stdout: "", stderr: "" };
  }
  if (
    command === "uv" &&
    invocation.length === 5 &&
    invocation.slice(0, 3).join("\0") === ["pip", "install", "--python"].join("\0") &&
    inside(invocation[3]) &&
    invocation[4] === "graphifyy[ollama]==0.9.86"
  )
    return { stdout: "", stderr: "" };
  if (
    command === process.execPath &&
    invocation.length === 2 &&
    inside(invocation[0]) &&
    invocation[0]?.endsWith("npm-shim.js") &&
    invocation[1] === "--version"
  )
    return { stdout: "1.6.2", stderr: "" };
  if (
    inside(command) &&
    invocation.length === 5 &&
    invocation.slice(0, 4).join("\0") === ["-I", "-X", "utf8", "-c"].join("\0") &&
    invocation[4] === 'from importlib.metadata import version; print(version("graphifyy"))'
  )
    return { stdout: "0.9.86", stderr: "" };
  if (
    command === "uv" ||
    invocation.includes("@colbymchenry/codegraph@1.6.2") ||
    invocation.includes("graphifyy[ollama]==0.9.86") ||
    inside(command)
  )
    throw new Error("Unexpected acquisition operation in legacy init preload.");
  return undefined;
}

function wrapped(...args) {
  return original(...args);
}
wrapped[promisify.custom] = async (command, args, options = {}) => {
  const fixture = await acquire(command, args, options);
  if (!fixture) return execute(command, args, options);
  if (fixture.failed) {
    const error = new Error("Host capability is unverified in the legacy fixture.");
    error.code = 1;
    throw error;
  }
  return { stdout: fixture.stdout, stderr: fixture.stderr };
};
childProcess.execFile = wrapped;
syncBuiltinESMExports();
