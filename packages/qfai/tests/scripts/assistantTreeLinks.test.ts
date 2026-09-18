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
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/scripts/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const SCRIPT = path.join(repoRoot, "scripts", "link-assistant-tree.mjs");
const ASSISTANT = path.join(repoRoot, ".qfai", "assistant");
const ASSETS = path.join(repoRoot, "packages", "qfai", "assets", "init", ".qfai", "assistant");

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
    for (const layer of ["skills", "agents", "constitution", "manifest"]) {
      const entry = path.join(ASSISTANT, layer);
      expect(lstatSync(entry).isSymbolicLink(), `${layer} must be a symlink`).toBe(true);
      expect(realpathSync(entry), `${layer} must resolve to the shipped assets`).toBe(
        realpathSync(path.join(ASSETS, layer)),
      );
    }
  });

  it("keeps the four catalog documents the project owns as real files", () => {
    // `ADOPTER_OWNED_CATALOG_FILES` is the script's source for these, and
    // `qfai init --force` reads the same constant to decide what it must not
    // overwrite. Linking one would make a project's own Stage 0 answers a copy
    // of the shipped placeholder.
    for (const fileName of ["manifest.md", "product.md", "structure.md", "tech.md"]) {
      const entry = path.join(ASSISTANT, "catalog", fileName);
      expect(existsSync(entry), `${fileName} must exist`).toBe(true);
      expect(lstatSync(entry).isSymbolicLink(), `${fileName} must NOT be a symlink`).toBe(false);
    }
  });

  it("reports a path that exists here and nowhere in the assets", async () => {
    // The branch, read from the script: an unaccounted path must reach
    // `problems`, which is what makes the check exit non-zero. Reporting
    // without failing is the defect the mirror's own history records.
    const source = await readFile(SCRIPT, "utf-8");

    expect(source).toContain("exists here and nowhere in the shipped assets");
    expect(source).toContain("Add it to the assets, delete it, or allow-list it");
  });

  it("names the one prefix this tree may hold alone", async () => {
    // `qfai init --upgrade-assistant-tree` writes a migration memo per upgrade
    // into the tree that ran it. Everything else is unaccounted for, so the
    // allow-list stays one entry long and visible.
    const source = await readFile(SCRIPT, "utf-8");

    expect(source).toContain('const LOCAL_ONLY_ALLOWED = ["process/migrations/"];');
  });

  it("no longer carries the legacy steering residue", () => {
    // `.qfai/assistant/steering/` is gone, and `assistantTreeMigration` reports
    // `D-DEPRECATED-PATH` at `error` for a tree that still holds it.
    expect(existsSync(path.join(ASSISTANT, "steering"))).toBe(false);
  });
});
