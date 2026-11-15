import { spawnSync } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

import { assertBuiltCliFresh } from "../helpers/builtCli.js";
import { removeTempTree } from "../helpers/tempTree.js";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
assertBuiltCliFresh(path.join(PACKAGE_ROOT, "dist", "cli", "index.mjs"));

const LINK_TYPE = process.platform === "win32" ? "junction" : "dir";
const roots: string[] = [];

afterAll(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

/** A project declaring qfai whose npm lockfile pins `pinned`. */
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
  return root;
}

/**
 * Links each dependency of the package into `to` by its real path. A link to
 * the package's own `node_modules` would not do: pnpm's entries there are
 * relative links, which Windows resolves against the link's path.
 */
async function linkDependencies(from: string, to: string): Promise<void> {
  await mkdir(to, { recursive: true });
  for (const name of await readdir(from)) {
    if (name.startsWith(".")) continue;
    const source = path.join(from, name);
    if (name.startsWith("@")) {
      await linkDependencies(source, path.join(to, name));
      continue;
    }
    await symlink(await realpath(source), path.join(to, name), LINK_TYPE);
  }
}

/**
 * Installs the built package into the project as a real copy, the way an
 * install leaves it, and returns its CLI.
 */
async function installCopy(root: string): Promise<string> {
  const copy = path.join(root, "node_modules", "qfai");
  await mkdir(copy, { recursive: true });
  await cp(path.join(PACKAGE_ROOT, "package.json"), path.join(copy, "package.json"));
  await cp(path.join(PACKAGE_ROOT, "dist"), path.join(copy, "dist"), { recursive: true });
  await linkDependencies(path.join(PACKAGE_ROOT, "node_modules"), path.join(copy, "node_modules"));
  return path.join(copy, "dist", "cli", "index.mjs");
}

/** Links the project's `node_modules/qfai` to the package, as `npm link` does, and returns its CLI. */
async function linkPackage(root: string): Promise<string> {
  await symlink(PACKAGE_ROOT, path.join(root, "node_modules", "qfai"), LINK_TYPE);
  return path.join(root, "node_modules", "qfai", "dist", "cli", "index.mjs");
}

function qfai(
  cli: string,
  root: string,
  args: string[],
): { status: number | null; stderr: string; stdout: string } {
  const child = spawnSync(process.execPath, [cli, ...args], {
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
    const cli = await installCopy(root);
    const running = await packageVersion();
    const expected = `the installed qfai is ${running}, but package-lock.json pins 0.0.1`;

    const report = qfai(cli, root, ["report", "--root", root]);
    const validate = qfai(cli, root, ["validate", "--root", root, "--fail-on", "never"]);
    const preflight = qfai(cli, root, ["sdd", "preflight", "--root", root]);
    const plan = qfai(cli, root, ["workflow", "plan", "--order", "--root", root]);

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
    await expect(stat(path.join(root, ".qfai", "report", "validate.json"))).rejects.toThrow();
  });

  // QFAI:AC-0001-0313-01
  it("stays silent when the lockfile pins the running version", async () => {
    const root = await project(await packageVersion());
    const cli = await installCopy(root);

    const report = qfai(cli, root, ["report", "--root", root]);

    expect(report.stderr).not.toContain("pins");
  });

  // QFAI:AC-0001-0313-01
  it("stops nothing for a copy that node_modules/qfai links to, as npm link leaves it", async () => {
    const root = await project("0.0.1");
    const cli = await linkPackage(root);

    const report = qfai(cli, root, ["report", "--root", root]);
    const plan = qfai(cli, root, ["workflow", "plan", "--order", "--root", root]);

    expect(report.stderr).not.toContain("pins");
    expect(plan.stderr).not.toContain("This command stops");
    expect(plan.stdout).not.toContain("stale-install");
  });
});
