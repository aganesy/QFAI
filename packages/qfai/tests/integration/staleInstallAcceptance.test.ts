import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

import { assertBuiltCliFresh } from "../helpers/builtCli.js";
import { removeTempTree } from "../helpers/tempTree.js";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CLI = path.join(PACKAGE_ROOT, "dist", "cli", "index.mjs");
assertBuiltCliFresh(CLI);

const roots: string[] = [];

afterAll(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

/** A project whose own `node_modules/qfai` is the built package and whose lockfile pins `pinned`. */
async function project(pinned: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-stale-ac-"));
  roots.push(root);
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ name: "p", devDependencies: { qfai: `^${pinned}` } }),
    "utf-8",
  );
  const lock = { packages: { "": {}, "node_modules/qfai": { version: pinned } } };
  await writeFile(path.join(root, "package-lock.json"), JSON.stringify(lock), "utf-8");
  await mkdir(path.join(root, "node_modules"), { recursive: true });
  await symlink(
    PACKAGE_ROOT,
    path.join(root, "node_modules", "qfai"),
    process.platform === "win32" ? "junction" : "dir",
  );
  return root;
}

function qfai(
  root: string,
  args: string[],
): { status: number | null; stderr: string; stdout: string } {
  const child = spawnSync(process.execPath, [CLI, ...args], {
    cwd: root,
    encoding: "utf8",
    timeout: 60_000,
  });
  return { status: child.status, stderr: child.stderr ?? "", stdout: child.stdout ?? "" };
}

async function packageVersion(): Promise<string> {
  const manifest: unknown = JSON.parse(
    await readFile(path.join(PACKAGE_ROOT, "package.json"), "utf8"),
  );
  const version: unknown =
    typeof manifest === "object" && manifest !== null
      ? Reflect.get(manifest, "version")
      : undefined;
  if (typeof version !== "string") throw new Error("package.json has no version");
  return version;
}

describe("a checkout that did not reinstall after a qfai upgrade", () => {
  // QFAI:AC-0001-0313-01
  it("warns on every command and stops workflow plan and the gates", async () => {
    const root = await project("0.0.1");
    const running = await packageVersion();
    const expected = `the installed qfai is ${running}, but package-lock.json pins 0.0.1`;

    const report = qfai(root, ["report", "--root", root]);
    const validate = qfai(root, ["validate", "--root", root]);
    const preflight = qfai(root, ["sdd", "preflight", "--root", root]);
    const plan = qfai(root, ["workflow", "plan", "--order", "--root", root]);

    expect(report.stderr).toContain(expected);
    expect(report.stderr).toContain("`npm ci`");
    for (const gate of [validate, preflight, plan]) {
      expect(gate.stderr).toContain(expected);
      expect(gate.stderr).toContain("This command stops until then.");
      expect(gate.status).toBe(1);
    }
    expect(JSON.parse(plan.stdout)).toMatchObject({
      ok: false,
      reasons: [{ reason: "stale-install", subject: "package-lock.json" }],
    });
  });

  // QFAI:AC-0001-0313-01
  it("stays silent when the lockfile pins the running version", async () => {
    const root = await project(await packageVersion());

    const report = qfai(root, ["report", "--root", root]);

    expect(report.stderr).not.toContain("pins");
  });
});
