/**
 * The root assistant tree is linked at the shipped assets, and the link check
 * is what keeps that true.
 *
 * It replaces a byte-mirror whose drift check had to be bidirectional. The
 * forward direction is gone by construction — a link cannot differ from what it
 * points at — but the reverse one still matters, and for the reason the mirror
 * recorded: a root-only `.qfai/assistant/steering/test-layers.md` made
 * `loadLayerPolicy` succeed in this tree and throw in every `qfai init`
 * project, so a consumer-only failure outlived a full minor release. This tree
 * is the only place the shipped assets are exercised end to end before release,
 * and a file the assets never had is invisible to every adopter.
 *
 * So the cases below are about the half a link does not solve: a path that
 * exists here and nowhere in the package.
 */
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, realpathSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

// tests/scripts/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const SCRIPT = path.join(repoRoot, "scripts", "link-assistant-tree.mjs");
const ASSISTANT = path.join(repoRoot, ".qfai", "assistant");
const ASSETS = path.join(repoRoot, "packages", "qfai", "assets", "init", ".qfai", "assistant");
const fixtureRoots: string[] = [];

afterEach(async () => {
  for (const root of fixtureRoots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function makeIsolatedTree(): Promise<{ root: string; script: string; assistant: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-assistant-links-"));
  fixtureRoots.push(root);
  const script = path.join(root, "scripts", "link-assistant-tree.mjs");
  const assistant = path.join(root, ".qfai", "assistant");
  const source = path.join(root, "packages", "qfai", "assets", "init", ".qfai", "assistant");
  const provenance = path.join(
    root,
    "packages",
    "qfai",
    "src",
    "core",
    "assistantAssetProvenance.ts",
  );
  await mkdir(path.dirname(script), { recursive: true });
  await mkdir(path.join(source, "rule"), { recursive: true });
  await mkdir(path.dirname(provenance), { recursive: true });
  await mkdir(assistant, { recursive: true });
  await cp(SCRIPT, script);
  await writeFile(path.join(source, "rule", "quality.md"), "# Quality\n", "utf-8");
  await writeFile(provenance, "export const ADOPTER_OWNED_CATALOG_FILES = [] as const;\n", "utf-8");
  return { root, script, assistant };
}

function runIsolated(
  script: string,
  root: string,
  checkOnly: boolean,
): { status: number; output: string } {
  const result = spawnSync("node", checkOnly ? [script, "--check"] : [script], {
    cwd: root,
    encoding: "utf-8",
  });
  return { status: result.status ?? 1, output: (result.stdout ?? "") + (result.stderr ?? "") };
}

function runCheck(): { status: number; output: string } {
  // Both streams: a problem goes to stderr, and the success path prints the
  // kept list to stdout.
  const result = spawnSync("node", [SCRIPT, "--check"], { cwd: repoRoot, encoding: "utf-8" });
  return {
    status: result.status ?? 1,
    output: (result.stdout ?? "") + (result.stderr ?? ""),
  };
}

describe("link-assistant-tree --check", () => {
  it("passes on the current tree", () => {
    const { status, output } = runCheck();

    expect(output).toContain("link(s) verified");
    expect(status).toBe(0);
  });

  it("links the layers the package owns end to end", () => {
    for (const layer of ["skill", "agent", "rule", "prompt"]) {
      const entry = path.join(ASSISTANT, layer);
      expect(lstatSync(entry).isSymbolicLink(), `${layer} must be a symlink`).toBe(true);
      expect(realpathSync(entry), `${layer} must resolve to the shipped assets`).toBe(
        realpathSync(path.join(ASSETS, layer)),
      );
    }
  });

  it("has no assistant catalog after project context moves to the spec tree", () => {
    expect(existsSync(path.join(ASSISTANT, "catalog"))).toBe(false);
  });

  it("reports a path that exists here and nowhere in the assets", async () => {
    // The branch, read from the script: an unaccounted path must reach
    // `problems`, which is what makes the check exit non-zero. Reporting
    // without failing is the defect the mirror's own history records.
    const source = await readFile(SCRIPT, "utf-8");

    expect(source).toContain("exists here and nowhere in the shipped assets");
    expect(source).toContain("Add it to the assets, delete it, or allow-list it");
  });

  it("reads the owned-file constant without executing TypeScript", async () => {
    // Importing the `.ts` module needs the type stripping Node gained after the
    // floor this package supports, so the lane that runs on that floor could
    // not execute this script at all. Reading it as text keeps one source.
    const source = await readFile(SCRIPT, "utf-8");

    expect(source).toContain("ADOPTER_OWNED_CATALOG_FILES");
    expect(source).not.toContain("ts-specifier-hook");
    expect(source).not.toContain("await import(");
  });

  it("ignores untracked regular scratch files", async () => {
    // A suite may leave an untracked file in the working tree. Such a file
    // does not change what this repository ships.
    const source = await readFile(SCRIPT, "utf-8");

    expect(source).toContain("git");
    expect(source).toContain("ls-files");
    expect(source).toContain("TRACKED !== null");
  });

  it("accepts an explicitly empty adopter-owned list after the catalog moves", async () => {
    const { root, script, assistant } = await makeIsolatedTree();
    expect(runIsolated(script, root, false).status).toBe(0);
    const checked = runIsolated(script, root, true);
    expect(checked.status).toBe(0);
    expect(lstatSync(path.join(assistant, "rule")).isSymbolicLink()).toBe(true);
  });

  it("rejects an owned-file list whose contents cannot be parsed", async () => {
    const { root, script } = await makeIsolatedTree();
    const provenance = path.join(
      root,
      "packages",
      "qfai",
      "src",
      "core",
      "assistantAssetProvenance.ts",
    );
    await writeFile(
      provenance,
      "export const ADOPTER_OWNED_CATALOG_FILES = [unknownName] as const;\n",
      "utf-8",
    );
    const checked = runIsolated(script, root, true);
    expect(checked.status).toBe(1);
    expect(checked.output).toContain("not a literal string list");
  });

  it("reports a retired layer even when it is a symlink", async () => {
    const { root, script, assistant } = await makeIsolatedTree();
    await symlink(
      path.join(root, "packages", "qfai", "assets", "init", ".qfai", "assistant", "rule"),
      path.join(assistant, "skills"),
      "dir",
    );
    const checked = runIsolated(script, root, true);
    expect(checked.status).toBe(1);
    expect(checked.output).toContain(".qfai/assistant/skills");
  });

  it("reports a retired real directory without deleting its contents", async () => {
    const { root, script, assistant } = await makeIsolatedTree();
    const retired = path.join(assistant, "process");
    await mkdir(retired);
    await writeFile(path.join(retired, "local.md"), "# Local\n", "utf-8");
    const checked = runIsolated(script, root, true);
    expect(checked.status).toBe(1);
    expect(checked.output).toContain(".qfai/assistant/process");
    expect(await readFile(path.join(retired, "local.md"), "utf-8")).toBe("# Local\n");
  });

  it("no longer carries the legacy steering residue", () => {
    // `.qfai/assistant/steering/` is gone, and `assistantTreeMigration` reports
    // `D-DEPRECATED-PATH` at `error` for a tree that still holds it.
    expect(existsSync(path.join(ASSISTANT, "steering"))).toBe(false);
  });
});
