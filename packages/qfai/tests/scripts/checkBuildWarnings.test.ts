/**
 * Spawn-based tests for `scripts/check-build-warnings.mjs`, run by `ci:gate:build` and
 * `ci:build-verify`.
 *
 * The package build runs through the pnpm that runs the gate, named by `npm_execpath`, so
 * `corepack pnpm ci:gate:build` works on a host with no standalone `pnpm` on PATH. The tests
 * spawn the gate with an empty PATH and a stand-in pnpm that records how it was called.
 */
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, realpath, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { removeTempTree } from "../helpers/tempTree.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// tests/scripts → tests → packages/qfai → packages → repo root
const REPO_ROOT = path.resolve(__dirname, "../../../..");

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map(removeTempTree));
});

type RunOptions = {
  cliName?: string;
  execPath?: "unset" | "missing";
  exitCode?: number;
  native?: boolean;
  output?: string;
};

const RECORDER = String.raw`
require("node:fs").writeFileSync(
  process.env.BUILD_CALL_LOG,
  JSON.stringify({ argv: process.argv.slice(2), execArgv: process.execArgv, cwd: process.cwd() }),
);
process.stdout.write(process.env.BUILD_OUTPUT);
process.exitCode = Number(process.env.BUILD_EXIT_CODE);
`;

async function runGate(options: RunOptions = {}) {
  // The real path, because the script and its child see the temp directory through it (macOS).
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "qfai build warnings ")));
  roots.push(root);
  const scripts = path.join(root, "scripts");
  const cliDir = path.join(root, "corepack cache");
  const elsewhere = path.join(root, "elsewhere");
  await Promise.all([scripts, cliDir, elsewhere].map((dir) => mkdir(dir, { recursive: true })));
  const entry = path.join(scripts, "check-build-warnings.mjs");
  await copyFile(path.join(REPO_ROOT, "scripts", "check-build-warnings.mjs"), entry);
  await mkdir(path.join(scripts, "lib"));
  await copyFile(
    path.join(REPO_ROOT, "scripts", "lib", "pnpm-command.mjs"),
    path.join(scripts, "lib", "pnpm-command.mjs"),
  );
  const log = path.join(root, "call.json");
  const cli = path.join(cliDir, options.cliName ?? "pnpm.cjs");
  if (options.native) {
    // A real native executable stands in for the standalone pnpm: Node.js itself. Started with
    // pnpm's arguments, it reads `-C` as its own `--conditions` flag and runs `<root>/build`.
    await symlink(process.execPath, cli);
    await writeFile(path.join(root, "build"), RECORDER);
  } else {
    // Plain text with no shebang and no execute bit, so only Node.js can start it.
    await writeFile(cli, RECORDER);
  }
  const env: NodeJS.ProcessEnv = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !["npm_execpath", "path"].includes(key.toLowerCase()),
    ),
  );
  // No directory on PATH holds a pnpm, as on a host where only corepack provides one.
  env.PATH = "";
  env.BUILD_CALL_LOG = log;
  env.BUILD_EXIT_CODE = String(options.exitCode ?? 0);
  env.BUILD_OUTPUT = options.output ?? "built\n";
  if (options.execPath === "missing") env.npm_execpath = path.join(cliDir, "gone", "pnpm");
  else if (options.execPath !== "unset") env.npm_execpath = cli;
  const result = spawnSync(process.execPath, [entry], { cwd: elsewhere, env, encoding: "utf8" });
  let call: unknown = null;
  try {
    call = JSON.parse(await readFile(log, "utf8")) as unknown;
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  return { root, call, status: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe("the build-warnings gate", () => {
  it.each(["pnpm.cjs", "pnpm"])(
    "builds the package through the pnpm that runs it, with no pnpm on PATH (%s)",
    async (cliName) => {
      const result = await runGate({ cliName });
      expect(result.status, result.stderr).toBe(0);
      expect(result.call).toEqual({
        argv: ["-C", path.join("packages", "qfai"), "build"],
        execArgv: [],
        cwd: result.root,
      });
      expect(result.stdout).toBe("built\n");
      expect(result.stderr).toBe("");
    },
  );

  it.skipIf(process.platform === "win32")(
    "runs a native pnpm executable directly rather than through Node.js",
    async () => {
      const result = await runGate({ cliName: "pnpm", native: true });
      expect(result.status, result.stderr).toBe(0);
      // Node.js took the arguments itself, so pnpm's would-be arguments land in execArgv.
      expect(result.call).toEqual({
        argv: [],
        execArgv: ["-C", path.join("packages", "qfai")],
        cwd: result.root,
      });
    },
  );

  it("fails on a listed build warning", async () => {
    const result = await runGate({ output: "warning: empty-import-meta\n" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Build warnings detected:\n- empty-import-meta\n");
  });

  it("keeps the package build's exit code", async () => {
    const result = await runGate({ exitCode: 7 });
    expect(result.status).toBe(7);
  });

  it("names pnpm when run directly with none on PATH", async () => {
    const result = await runGate({ execPath: "unset" });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/^Could not start pnpm: /m);
    expect(result.call).toBeNull();
  });

  it("refuses a runner it cannot identify as pnpm", async () => {
    const result = await runGate({ cliName: "npm-cli.js" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("corepack pnpm ci:gate:build");
    expect(result.call).toBeNull();
  });

  it("names a pnpm entry it cannot read", async () => {
    const result = await runGate({ cliName: "pnpm", execPath: "missing" });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/^Cannot read .*pnpm: /m);
    expect(result.call).toBeNull();
  });
});
