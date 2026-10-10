/**
 * Spawn-based tests for `scripts/check-not-a-dependency.mjs`.
 *
 * The monorepo root is not the published package. Renaming it to
 * `qfai-monorepo` stops it answering to the *package name* `qfai`, but
 * `"qfai": "github:aganesy/QFAI"` maps a dependency *key* to a git URL that
 * points at this manifest, which ships no CLI. npm stops earlier, at the root's
 * `workspace:` dependency, so the spawned user agents below exercise the guard
 * directly rather than through a real install.
 *
 * This `preinstall` guard aborts an install that reaches it. Its contract:
 *   - npm  -> exit 1 with an explanatory message
 *   - yarn -> exit 1
 *   - pnpm -> exit 0 (the repository's own install must never break)
 *   - unknown / absent user agent -> exit 0 (fail-open)
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { removeTempTree } from "../helpers/tempTree.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// tests/scripts → tests → packages/qfai → packages → repo root
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const SCRIPT = path.join(REPO_ROOT, "scripts/check-not-a-dependency.mjs");

function runGuard(userAgent: string | undefined): { status: number; stderr: string } {
  // Windows environment names are case-insensitive but `{...process.env}` keeps
  // whatever casing the parent used, so a stray `NPM_CONFIG_USER_AGENT` would
  // survive alongside the lowercase key and win in the child. Drop every casing
  // before injecting the one under test.
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.toLowerCase() === "npm_config_user_agent") {
      continue;
    }
    env[key] = value;
  }
  if (userAgent !== undefined) {
    env.npm_config_user_agent = userAgent;
  }
  const result = spawnSync(process.execPath, [SCRIPT], { encoding: "utf-8", env });
  return { status: result.status ?? -1, stderr: result.stderr };
}

describe("check-not-a-dependency guard", () => {
  it("refuses an npm install of the monorepo root", () => {
    const { status, stderr } = runGuard("npm/11.16.0 node/v24.18.0 win32 x64 workspaces/false");
    expect(status).toBe(1);
    expect(stderr).toContain("this is the private monorepo root");
    expect(stderr).toContain("npm i -D qfai");
    expect(stderr).toContain("github:aganesy/QFAI");
  });

  it("refuses a yarn install of the monorepo root", () => {
    const { status } = runGuard("yarn/1.22.19 npm/? node/v20.11.0 linux x64");
    expect(status).toBe(1);
  });

  it("allows pnpm, which is how this repository is developed and built in CI", () => {
    const { status, stderr } = runGuard("pnpm/9.12.3 npm/? node/v20.19.0 linux x64");
    expect(status).toBe(0);
    expect(stderr).toBe("");
  });

  it("fails open when the user agent is absent or unrecognised", () => {
    expect(runGuard(undefined).status).toBe(0);
    expect(runGuard("").status).toBe(0);
    expect(runGuard("bun/1.1.0 node/v22.0.0 darwin arm64").status).toBe(0);
  });

  it("is wired as the root preinstall script", async () => {
    const { readFile } = await import("node:fs/promises");
    const raw = await readFile(path.join(REPO_ROOT, "package.json"), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    expect(parsed).toBeTypeOf("object");
    if (parsed === null || typeof parsed !== "object" || !("scripts" in parsed)) {
      throw new Error("root package.json has no scripts block");
    }
    const scripts = parsed.scripts;
    if (scripts === null || typeof scripts !== "object" || !("preinstall" in scripts)) {
      throw new Error("root package.json has no preinstall script");
    }
    expect(scripts.preinstall).toBe("node ./scripts/check-not-a-dependency.mjs");
  });
});

const bootstrapRoots: string[] = [];
const bootstrapSteps = [
  ["install", "--frozen-lockfile"],
  ["-C", "packages/qfai", "build"],
  ["install", "--frozen-lockfile"],
];

afterEach(async () => {
  await Promise.all(bootstrapRoots.splice(0).map(removeTempTree));
});

type BootstrapOptions = {
  missing?: "npm_execpath" | "npm_config_user_agent";
  cliName?: string;
  userAgent?: string;
  failStage?: number;
  unsafeModules?: { relative: string; kind: "link" | "file" };
  realModules?: boolean;
  invalidNode?: boolean;
};

async function runBootstrap(options: BootstrapOptions = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai bootstrap "));
  bootstrapRoots.push(root);
  const scripts = path.join(root, "scripts");
  const cliDir = path.join(root, "mock cli");
  const foreign = path.join(root, "elsewhere");
  await Promise.all(
    [scripts, cliDir, foreign, path.join(root, "packages/qfai")].map((dir) =>
      mkdir(dir, { recursive: true }),
    ),
  );
  const entry = path.join(scripts, "bootstrap.mjs");
  const source = path.join(REPO_ROOT, "scripts/bootstrap.mjs");
  if (existsSync(source)) await copyFile(source, entry);
  const log = path.join(root, "calls.jsonl");
  const cli = path.join(cliDir, options.cliName ?? "pnpm.cjs");
  await writeFile(
    cli,
    String.raw`
const fs = require("node:fs");
const log = process.env.BOOTSTRAP_CALL_LOG;
const before = fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "";
const stage = before.split("\n").filter(Boolean).length + 1;
fs.appendFileSync(log, JSON.stringify({ argv: process.argv.slice(2), cwd: process.cwd() }) + "\n");
if (stage === Number(process.env.BOOTSTRAP_FAIL_STAGE)) process.exitCode = 40 + stage;
`,
  );
  if (options.realModules) {
    await Promise.all(
      ["node_modules", "packages/qfai/node_modules"].map((relative) =>
        mkdir(path.join(root, relative)),
      ),
    );
  }
  if (options.unsafeModules) {
    const destination = path.join(root, options.unsafeModules.relative);
    if (options.unsafeModules.kind === "file") await writeFile(destination, "keep");
    else await symlink(foreign, destination, process.platform === "win32" ? "junction" : "dir");
  }
  const env: NodeJS.ProcessEnv = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !["npm_execpath", "npm_config_user_agent"].includes(key.toLowerCase()),
    ),
  );
  env.npm_execpath = cli;
  env.npm_config_user_agent = options.userAgent ?? "pnpm/12.10.1 npm/? node/v24.0.0";
  env.BOOTSTRAP_CALL_LOG = log;
  env.BOOTSTRAP_FAIL_STAGE = String(options.failStage ?? 0);
  if (options.missing) {
    if (options.missing === "npm_execpath") env.npm_execpath = undefined;
    else env.npm_config_user_agent = undefined;
  }
  const args = options.invalidNode
    ? [
        "--import",
        "data:text/javascript," +
          encodeURIComponent(
            `Object.defineProperty(process, "execPath", { value: ${JSON.stringify(path.join(root, "missing-node"))} });`,
          ),
        entry,
      ]
    : [entry];
  const result = spawnSync(process.execPath, args, { cwd: foreign, env, encoding: "utf8" });
  const calls: unknown[] = existsSync(log)
    ? (await readFile(log, "utf8"))
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as unknown)
    : [];
  return { root, calls, status: result.status, stderr: result.stderr };
}

describe("the repository bootstrap entry", () => {
  it("is wired as one repository command", async () => {
    const manifest = JSON.parse(
      await readFile(path.join(REPO_ROOT, "package.json"), "utf8"),
    ) as unknown;
    if (
      !manifest ||
      typeof manifest !== "object" ||
      !("scripts" in manifest) ||
      !manifest.scripts ||
      typeof manifest.scripts !== "object" ||
      !("bootstrap" in manifest.scripts)
    ) {
      expect.fail("root package.json must expose bootstrap");
    }
    expect(manifest.scripts.bootstrap).toBe("node ./scripts/bootstrap.mjs");
  });

  it("runs both frozen installs around the local package build, in this repository", async () => {
    const result = await runBootstrap();
    expect(result.status, result.stderr).toBe(0);
    expect(result.calls).toEqual(bootstrapSteps.map((argv) => ({ argv, cwd: result.root })));
    expect(result.stderr).toBe("");
  });

  it.each([1, 2, 3])("stops at failed stage %s and preserves its exit code", async (failStage) => {
    const result = await runBootstrap({ failStage });
    expect(result.status, result.stderr).toBe(40 + failStage);
    expect(result.calls).toEqual(
      bootstrapSteps.slice(0, failStage).map((argv) => ({ argv, cwd: result.root })),
    );
  });

  it.each(["npm_execpath", "npm_config_user_agent"] as const)(
    "refuses a missing %s without launching any command",
    async (missing) => {
      const result = await runBootstrap({ missing });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("corepack pnpm bootstrap");
      expect(result.calls).toEqual([]);
    },
  );

  it.each([
    { cliName: "npm-cli.js" },
    { cliName: "yarn.js" },
    { cliName: "pnpm.c" },
    { userAgent: "npm/11.0.0 node/v24.0.0" },
  ])("refuses another or unknown package-manager entry %j", async (options) => {
    const result = await runBootstrap(options);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("corepack pnpm bootstrap");
    expect(result.calls).toEqual([]);
  });

  it("reports a child spawn failure without continuing", async () => {
    const result = await runBootstrap({ invalidNode: true });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Could not start pnpm");
    expect(result.calls).toEqual([]);
  });

  it.each(["node_modules", "packages/qfai/node_modules"])(
    "refuses linked %s before installing",
    async (relative) => {
      const result = await runBootstrap({ unsafeModules: { relative, kind: "link" } });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(relative);
      expect(result.stderr).toContain("real directory");
      expect(result.calls).toEqual([]);
    },
  );

  it.each(["node_modules", "packages/qfai/node_modules"])(
    "refuses a file at %s before installing",
    async (relative) => {
      const result = await runBootstrap({ unsafeModules: { relative, kind: "file" } });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(relative);
      expect(result.stderr).toContain("real directory");
      expect(result.calls).toEqual([]);
      expect(await readFile(path.join(result.root, relative), "utf8")).toBe("keep");
    },
  );

  it("accepts existing independent dependency directories", async () => {
    const result = await runBootstrap({ realModules: true });
    expect(result.status, result.stderr).toBe(0);
    expect(result.calls).toEqual(bootstrapSteps.map((argv) => ({ argv, cwd: result.root })));
  });
});
