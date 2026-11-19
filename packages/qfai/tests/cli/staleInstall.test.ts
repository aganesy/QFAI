import { mkdir, mkdtemp, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { run } from "../../src/cli/main.js";
import type * as LockfileModule from "../../src/core/lockfileVersion.js";
import { findStaleInstall, type StaleInstall } from "../../src/core/lockfileVersion.js";
import { removeTempTree } from "../helpers/tempTree.js";

// The gate tests hand `main.ts` a stale install directly: the running copy is
// this source tree, which no temp project can hold as its own install.
const stale = vi.hoisted(() => ({ value: null as StaleInstall | null }));
vi.mock("../../src/core/lockfileVersion.js", async (importOriginal) => {
  const actual = await importOriginal<typeof LockfileModule>();
  return {
    ...actual,
    findStaleInstall: async (...args: Parameters<typeof actual.findStaleInstall>) =>
      stale.value ?? (args[1] === undefined ? null : actual.findStaleInstall(...args)),
  };
});

const roots: string[] = [];

afterEach(async () => {
  stale.value = null;
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

/**
 * A project declaring qfai, whose npm lockfile pins `pinned`, and the
 * directory of the qfai copy it holds: an installed copy under its own
 * `node_modules`, or, for `npm-link`, a copy elsewhere that
 * `node_modules/qfai` links to, as `npm link` leaves it.
 */
async function project(
  pinned: string | null,
  layout: "installed" | "npm-link" = "installed",
): Promise<{ root: string; packageDir: string }> {
  const base = await mkdtemp(path.join(os.tmpdir(), "qfai-stale-"));
  roots.push(base);
  const root = path.join(base, "project");
  const installed = path.join(root, "node_modules", "qfai");
  const elsewhere = path.join(base, "checkout", "qfai");
  const packageDir = layout === "installed" ? installed : elsewhere;
  await mkdir(packageDir, { recursive: true });
  // The project and its node_modules exist in both layouts; only the copy moves.
  await mkdir(path.dirname(installed), { recursive: true });
  await writeFile(path.join(packageDir, "package.json"), JSON.stringify({ name: "qfai" }), "utf-8");
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ name: "p", devDependencies: { qfai: "^0.0.1" } }),
    "utf-8",
  );
  if (pinned !== null) {
    const lock = { packages: { "": {}, "node_modules/qfai": { version: pinned } } };
    await writeFile(path.join(root, "package-lock.json"), JSON.stringify(lock), "utf-8");
  }
  if (layout === "npm-link") {
    await symlink(elsewhere, installed, process.platform === "win32" ? "junction" : "dir");
  }
  return { root, packageDir };
}

/** The smallest story tree `report` accepts: a business-flow directory with nothing in it. */
async function storyTree(root: string): Promise<void> {
  await mkdir(path.join(root, ".qfai", "spec", "02_business-flow"), { recursive: true });
}

type Captured = { stdout: string; stderr: string; exitCode: number | undefined };

async function cli(argv: string[], cwd: string): Promise<Captured> {
  const out: string[] = [];
  const err: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    out.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    err.push(String(chunk));
    return true;
  });
  const previous = process.exitCode;
  process.exitCode = undefined;
  try {
    await run(argv, cwd);
    const code = process.exitCode;
    return { stdout: out.join(""), stderr: err.join(""), exitCode: code };
  } finally {
    process.exitCode = previous;
    vi.restoreAllMocks();
  }
}

// QFAI:EX-0001-0313-05
describe("a stale install", () => {
  it("is found for the project's installed copy at another version than the lockfile pins", async () => {
    const { root, packageDir } = await project("0.0.1");

    const found = await findStaleInstall(root, { packageDir, version: "2.5.0" });

    expect(found).toMatchObject({
      running: "2.5.0",
      pin: { manager: "npm", file: "package-lock.json", version: "0.0.1" },
    });
  });

  it("warns on a command that is not a gate, naming both versions and the install command", async () => {
    const { root, packageDir } = await project("0.0.1");
    stale.value = await findStaleInstall(root, { packageDir, version: "2.5.0" });

    const result = await cli(["report", "--root", root], root);

    const lines = result.stderr.split("\n").filter((line) => line.includes("pins"));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("the installed qfai is 2.5.0, but package-lock.json pins 0.0.1");
    expect(lines[0]).toContain("`npm ci`");
    expect(lines[0]).not.toContain("This command stops");
  });

  it("stops validate and sdd preflight with exit 1 before they run, even under --fail-on never", async () => {
    const { root, packageDir } = await project("0.0.1");
    stale.value = await findStaleInstall(root, { packageDir, version: "2.5.0" });

    const validate = await cli(["validate", "--root", root, "--fail-on", "never"], root);
    const preflight = await cli(["sdd", "preflight", "--root", root, "--fail-on", "never"], root);

    for (const result of [validate, preflight]) {
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("This command stops until then.");
    }
    await expect(stat(path.join(root, ".qfai", "report", "validate.json"))).rejects.toThrow();
  });

  it("refuses workflow plan with a stale-install reason naming the lockfile", async () => {
    const { root, packageDir } = await project("0.0.1");
    stale.value = await findStaleInstall(root, { packageDir, version: "2.5.0" });

    const result = await cli(["workflow", "plan", "--order", "--root", root], root);

    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: false,
      reasons: [{ reason: "stale-install", subject: "package-lock.json" }],
    });
    expect(result.stderr).toContain("This command stops until then.");
  });
});

// QFAI:EX-0001-0313-08
describe("report on a stale install", () => {
  it("stops report --run-validate with exit 1 before it validates, even under --fail-on never", async () => {
    const { root, packageDir } = await project("0.0.1");
    await storyTree(root);
    stale.value = await findStaleInstall(root, { packageDir, version: "2.5.0" });

    const result = await cli(
      ["report", "--run-validate", "--root", root, "--fail-on", "never"],
      root,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("This command stops until then.");
    await expect(stat(path.join(root, ".qfai", "report", "validate.json"))).rejects.toThrow();
    await expect(stat(path.join(root, ".qfai", "report", "report.md"))).rejects.toThrow();
  });

  it("still reports an existing validate result without --run-validate, warning only", async () => {
    const { root, packageDir } = await project("0.0.1");
    await storyTree(root);
    await cli(["validate", "--root", root, "--fail-on", "never"], root);
    await stat(path.join(root, ".qfai", "report", "validate.json"));
    stale.value = await findStaleInstall(root, { packageDir, version: "2.5.0" });

    const result = await cli(["report", "--root", root, "--fail-on", "never"], root);

    expect(result.exitCode ?? 0).toBe(0);
    await stat(path.join(root, ".qfai", "report", "report.md"));
    expect(result.stderr).toContain("package-lock.json pins 0.0.1");
    expect(result.stderr).not.toContain("This command stops");
  });
});

// QFAI:EX-0001-0313-06
describe("no stale install", () => {
  it("is found for a matching pin, build metadata, a workspace pin, no lockfile or a copy elsewhere", async () => {
    const tool = (packageDir: string) => ({ packageDir, version: "2.5.0" });
    const matching = await project("2.5.0");
    const build = await project("2.5.0+build.1");
    const none = await project(null);
    const workspace = await project(null);
    await writeFile(
      path.join(workspace.root, "pnpm-lock.yaml"),
      "importers:\n  .:\n    devDependencies:\n      qfai:\n        specifier: workspace:*\n        version: link:packages/qfai\n",
      "utf-8",
    );
    const elsewhere = await project("0.0.1");

    expect(await findStaleInstall(matching.root, tool(matching.packageDir))).toBeNull();
    expect(await findStaleInstall(build.root, tool(build.packageDir))).toBeNull();
    expect(await findStaleInstall(none.root, tool(none.packageDir))).toBeNull();
    expect(await findStaleInstall(workspace.root, tool(workspace.packageDir))).toBeNull();
    expect(
      await findStaleInstall(elsewhere.root, tool(path.join(os.tmpdir(), "elsewhere", "qfai"))),
    ).toBeNull();
  });

  it("is not found for a copy that node_modules/qfai links to, as npm link leaves it", async () => {
    const { root, packageDir } = await project("0.0.1", "npm-link");

    expect(await findStaleInstall(root, { packageDir, version: "2.5.0" })).toBeNull();
  });
});
