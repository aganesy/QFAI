import { mkdir, mkdtemp, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import { run } from "../../src/cli/main.js";
import { findStaleInstall } from "../../src/core/lockfileVersion.js";
import { resolveToolVersion } from "../../src/core/version.js";
import { removeTempTree } from "../helpers/tempTree.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const roots: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

/** A project whose `node_modules/qfai` links to the package under test, and whose npm lockfile pins `pinned`. */
async function linkedProject(pinned: string | null, linked = true): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-stale-"));
  roots.push(root);
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ name: "p", devDependencies: { qfai: "^0.0.1" } }),
    "utf-8",
  );
  if (pinned !== null) {
    const lock = { packages: { "": {}, "node_modules/qfai": { version: pinned } } };
    await writeFile(path.join(root, "package-lock.json"), JSON.stringify(lock), "utf-8");
  }
  if (linked) {
    await mkdir(path.join(root, "node_modules"), { recursive: true });
    await symlink(
      packageRoot,
      path.join(root, "node_modules", "qfai"),
      process.platform === "win32" ? "junction" : "dir",
    );
  }
  return root;
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
  it("warns on a command that is not a gate, naming both versions and the install command", async () => {
    const root = await linkedProject("0.0.1");
    const running = await resolveToolVersion();

    const result = await cli(["report", "--root", root], root);

    const lines = result.stderr.split("\n").filter((line) => line.includes("pins"));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain(`the installed qfai is ${running}`);
    expect(lines[0]).toContain("package-lock.json pins 0.0.1");
    expect(lines[0]).toContain("`npm ci`");
    expect(lines[0]).not.toContain("This command stops");
  });

  it("stops validate and sdd preflight with exit 1 before they run", async () => {
    const root = await linkedProject("0.0.1");

    const validate = await cli(["validate", "--root", root], root);
    const preflight = await cli(["sdd", "preflight", "--root", root], root);

    for (const result of [validate, preflight]) {
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("This command stops until then.");
    }
    await expect(stat(path.join(root, ".qfai", "report", "validate.json"))).rejects.toThrow();
  });

  it("refuses workflow plan with a stale-install reason naming the lockfile", async () => {
    const root = await linkedProject("0.0.1");

    const result = await cli(["workflow", "plan", "--order", "--root", root], root);

    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: false,
      reasons: [{ reason: "stale-install", subject: "package-lock.json" }],
    });
    expect(result.stderr).toContain("This command stops until then.");
  });
});

// QFAI:EX-0001-0313-06
describe("no stale install", () => {
  it("is found for a matching pin, a workspace pin, no lockfile or a copy that is not the project's", async () => {
    const running = await resolveToolVersion();
    const workspace = await linkedProject(null);
    await writeFile(
      path.join(workspace, "pnpm-lock.yaml"),
      "importers:\n  .:\n    devDependencies:\n      qfai:\n        specifier: workspace:*\n        version: link:packages/qfai\n",
      "utf-8",
    );

    expect(await findStaleInstall(await linkedProject(running))).toBeNull();
    expect(await findStaleInstall(workspace)).toBeNull();
    expect(await findStaleInstall(await linkedProject(null))).toBeNull();
    expect(await findStaleInstall(await linkedProject("0.0.1", false))).toBeNull();
  });

  it("prints no warning on a command when the pin matches", async () => {
    const root = await linkedProject(await resolveToolVersion());

    const result = await cli(["report", "--root", root], root);

    expect(result.stderr).not.toContain("pins");
  });
});
