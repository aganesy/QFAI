/**
 * Spawn-based tests for `scripts/run-package-build.mjs`, the root `build` script.
 *
 * The package build runs through the pnpm that runs the root script, named by
 * `npm_execpath`, so `corepack pnpm build` works on a host with no standalone
 * `pnpm` on PATH. The tests spawn the script with an empty PATH and a stand-in
 * pnpm that records how it was called.
 */
import { spawnSync } from "node:child_process";
import { chmod, copyFile, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
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

type RunOptions = { cliName?: string; execPath?: "unset" | "relative"; exitCode?: number };

async function runBuild(options: RunOptions = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai build "));
  roots.push(root);
  const scripts = path.join(root, "scripts");
  const cliDir = path.join(root, "corepack cache");
  const elsewhere = path.join(root, "elsewhere");
  await Promise.all([scripts, cliDir, elsewhere].map((dir) => mkdir(dir, { recursive: true })));
  const entry = path.join(scripts, "run-package-build.mjs");
  await copyFile(path.join(REPO_ROOT, "scripts", "run-package-build.mjs"), entry);
  const log = path.join(root, "call.json");
  const cli = path.join(cliDir, options.cliName ?? "pnpm.cjs");
  // A name with no JavaScript extension stands for the standalone pnpm's own executable.
  const shebang = /\.(?:cjs|mjs|js)$/.test(cli) ? "" : `#!${process.execPath}\n`;
  await writeFile(
    cli,
    shebang +
      String.raw`
require("node:fs").writeFileSync(
  process.env.BUILD_CALL_LOG,
  JSON.stringify({ argv: process.argv.slice(2), cwd: process.cwd() }),
);
process.exitCode = Number(process.env.BUILD_EXIT_CODE);
`,
  );
  if (shebang) await chmod(cli, 0o755);
  const env: NodeJS.ProcessEnv = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !["npm_execpath", "path"].includes(key.toLowerCase()),
    ),
  );
  // No directory on PATH holds a pnpm, as on a host where only corepack provides one.
  env.PATH = "";
  env.BUILD_CALL_LOG = log;
  env.BUILD_EXIT_CODE = String(options.exitCode ?? 0);
  if (options.execPath === "relative") env.npm_execpath = path.relative(elsewhere, cli);
  else if (options.execPath !== "unset") env.npm_execpath = cli;
  const result = spawnSync(process.execPath, [entry], { cwd: elsewhere, env, encoding: "utf8" });
  let call: unknown = null;
  try {
    call = JSON.parse(await readFile(log, "utf8")) as unknown;
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  return { root, call, status: result.status, stderr: result.stderr };
}

describe("the root build script", () => {
  it("is wired to the package build runner", async () => {
    const manifest: unknown = JSON.parse(
      await readFile(path.join(REPO_ROOT, "package.json"), "utf8"),
    );
    if (
      !manifest ||
      typeof manifest !== "object" ||
      !("scripts" in manifest) ||
      !manifest.scripts ||
      typeof manifest.scripts !== "object" ||
      !("build" in manifest.scripts)
    ) {
      expect.fail("root package.json must expose build");
    }
    expect(manifest.scripts.build).toBe("node ./scripts/run-package-build.mjs");
  });

  it("builds the package through the pnpm that runs it, with no pnpm on PATH", async () => {
    const result = await runBuild();
    expect(result.status, result.stderr).toBe(0);
    expect(result.call).toEqual({
      argv: ["-C", path.join("packages", "qfai"), "build"],
      cwd: result.root,
    });
    expect(result.stderr).toBe("");
  });

  it.skipIf(process.platform === "win32")(
    "runs a standalone pnpm executable directly rather than through Node.js",
    async () => {
      const result = await runBuild({ cliName: "pnpm" });
      expect(result.status, result.stderr).toBe(0);
      expect(result.call).toEqual({
        argv: ["-C", path.join("packages", "qfai"), "build"],
        cwd: result.root,
      });
    },
  );

  it("keeps the package build's exit code", async () => {
    const result = await runBuild({ exitCode: 7 });
    expect(result.status).toBe(7);
  });

  it.each([
    { execPath: "unset" as const },
    { execPath: "relative" as const },
    { cliName: "npm-cli.js" },
  ])("refuses a runner it cannot identify as pnpm (%o)", async (options) => {
    const result = await runBuild(options);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("corepack pnpm build");
    expect(result.call).toBeNull();
  });
});
