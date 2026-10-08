import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { removeTempTree } from "../helpers/tempTree.js";
import { isRecord, REPO_ROOT } from "../scripts/helpers/hygieneTree.js";

const SCRIPT = path.join(REPO_ROOT, "scripts", "link-assistant-tree.mjs");
const ASSISTANT = path.join(REPO_ROOT, ".qfai", "assistant");
const ASSETS = path.join(REPO_ROOT, "packages", "qfai", "assets", "init", ".qfai", "assistant");
const RETIRED_DIRECTORIES = ["skills", "agents", "prompts", "constitution", "manifest", "process"];

type Check = { status: number; output: string };

/** The link check over a checkout, created with one shipped rule file. */
async function isolatedCheckout(): Promise<{ root: string; script: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf0002-links-"));
  const script = path.join(root, "scripts", "link-assistant-tree.mjs");
  const shippedRule = path.join(
    root,
    "packages",
    "qfai",
    "assets",
    "init",
    ".qfai",
    "assistant",
    "rule",
  );
  await mkdir(path.dirname(script), { recursive: true });
  await mkdir(shippedRule, { recursive: true });
  await mkdir(path.join(root, ".qfai", "assistant"), { recursive: true });
  await cp(SCRIPT, script);
  await writeFile(path.join(shippedRule, "quality.md"), "# Quality\n", "utf8");
  return { root, script };
}

function runLinks(script: string, cwd: string, args: string[]): Check {
  const child = spawnSync(process.execPath, [script, ...args], { cwd, encoding: "utf8" });
  return { status: child.status ?? -1, output: `${child.stdout}${child.stderr}` };
}

describe("BF-0002 assistant tree acceptance", () => {
  // QFAI:AC-0002-0021-03
  it("resolves the repository-root rule to the packaged asset and fails the link check on a regular copy", async () => {
    const source = path.join(ASSETS, "rule", "test-layers.md");
    const mirrored = path.join(ASSISTANT, "rule", "test-layers.md");
    expect(lstatSync(path.join(ASSISTANT, "rule")).isSymbolicLink()).toBe(true);
    expect(realpathSync(mirrored)).toBe(realpathSync(source));
    expect(readFileSync(mirrored)).toEqual(readFileSync(source));
    const current = runLinks(SCRIPT, REPO_ROOT, ["--check"]);
    expect(current.status, current.output).toBe(0);

    const { root, script } = await isolatedCheckout();
    try {
      const created = runLinks(script, root, []);
      expect(created.status, created.output).toBe(0);
      const rule = path.join(root, ".qfai", "assistant", "rule");
      expect(lstatSync(rule).isSymbolicLink()).toBe(true);
      expect(runLinks(script, root, ["--check"]).status).toBe(0);

      await rm(rule);
      await mkdir(rule);
      await writeFile(path.join(rule, "quality.md"), "# Local copy\n", "utf8");
      const drifted = runLinks(script, root, ["--check"]);
      expect(drifted.status).toBe(1);
      expect(drifted.output).toContain(".qfai/assistant/rule");
      expect(drifted.output).toContain("not a symlink to");
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:AC-0002-0022-01
  it("links the singular layers to the packaged assets and names a retired directory or a root-only path", async () => {
    for (const layer of ["rule", "skill", "agent", "prompt"]) {
      const entry = path.join(ASSISTANT, layer);
      expect(lstatSync(entry).isSymbolicLink(), layer).toBe(true);
      expect(realpathSync(entry), layer).toBe(realpathSync(path.join(ASSETS, layer)));
    }
    expect(existsSync(path.join(ASSISTANT, "catalog"))).toBe(false);
    const manifest: unknown = JSON.parse(
      readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"),
    );
    const scripts = isRecord(manifest) && isRecord(manifest["scripts"]) ? manifest["scripts"] : {};
    expect(scripts["sync:ssot"]).toContain("link-assistant-tree.mjs");
    expect(scripts["ci:gate:ssot"]).toContain("pnpm sync:ssot");
    expect(scripts["ci:gate:ssot"]).toContain("git diff --exit-code .qfai/");
    const current = runLinks(SCRIPT, REPO_ROOT, ["--check"]);
    expect(current.status, current.output).toBe(0);

    const { root, script } = await isolatedCheckout();
    try {
      expect(runLinks(script, root, []).status).toBe(0);
      expect(runLinks(script, root, ["--check"]).status).toBe(0);
      const assistant = path.join(root, ".qfai", "assistant");

      await mkdir(path.join(assistant, "notes"), { recursive: true });
      await writeFile(path.join(assistant, "notes", "memo.md"), "# Root only\n", "utf8");
      const rootOnly = runLinks(script, root, ["--check"]);
      expect(rootOnly.status, rootOnly.output).toBe(1);
      expect(rootOnly.output).toContain(".qfai/assistant/notes");
      await rm(path.join(assistant, "notes"), { recursive: true });

      for (const retired of RETIRED_DIRECTORIES) {
        const directory = path.join(assistant, retired);
        await mkdir(directory);
        await writeFile(path.join(directory, "left.md"), "# Left behind\n", "utf8");
        const checked = runLinks(script, root, ["--check"]);
        expect(checked.status, `${retired}: ${checked.output}`).toBe(1);
        expect(checked.output, retired).toContain(`.qfai/assistant/${retired}`);
        await rm(directory, { recursive: true });
      }
      expect(runLinks(script, root, ["--check"]).status).toBe(0);
    } finally {
      await removeTempTree(root);
    }
  });
});
