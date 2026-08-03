/**
 * The SSOT mirror is checked in both directions (#396).
 *
 * `sync-init-to-root.mjs` iterated the **source** file list only, and `ci:gate`
 * then asserted drift with `git diff --exit-code .qfai/`. A committed path under
 * `.qfai/` with no counterpart in the assets produced no drift signal, ever —
 * and `git diff` cannot recover the missing direction, because an unmodified
 * tracked file is not a diff.
 *
 * That is how `.qfai/assistant/steering/` survived the v1.9.0 recut: its
 * byte-identical `test-layers.md` makes `loadLayerPolicy` succeed in this tree
 * and throw in every `qfai init` project, so a consumer-only failure outlived a
 * full minor release.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/scripts/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const SCRIPT = path.join(repoRoot, "scripts", "sync-init-to-root.mjs");

function runCheck(): { status: number; output: string } {
  // Both streams: KNOWN-STALE goes to stderr, and on the success path
  // execFileSync would have returned stdout alone.
  const result = spawnSync("node", [SCRIPT, "--check"], { cwd: repoRoot, encoding: "utf-8" });
  return {
    status: result.status ?? 1,
    output: (result.stdout ?? "") + (result.stderr ?? ""),
  };
}

describe("sync-init-to-root --check", () => {
  it("passes on the current tree", () => {
    const { status, output } = runCheck();

    expect(output).toContain("No drift detected.");
    expect(status).toBe(0);
  });

  it("no longer carries the legacy steering residue", () => {
    // This test used to assert the residue was *reported*. It is now gone:
    // `.qfai/assistant/steering/` reached the sunset pinned in
    // `sunset.ts#SUNSETS.legacyAssistantSteering` (1.10.0), which is what made
    // `assistantTreeMigration` escalate `D-DEPRECATED-PATH` to `error`.
    const { output } = runCheck();

    expect(output).not.toContain("KNOWN-STALE: .qfai/assistant/steering/");
    expect(existsSync(path.join(repoRoot, ".qfai", "assistant", "steering"))).toBe(false);
  });

  it("keeps the known-stale reporting mechanism for the next residue", async () => {
    // The map is empty, not deleted. Removing the mechanism along with its last
    // entry would put the next stale path back where `steering/` was — present,
    // uncounted and unreported.
    const source = await readFile(SCRIPT, "utf-8");

    expect(source).toContain("const KNOWN_STALE = new Map([]);");
    expect(source).toContain("KNOWN-STALE: .qfai/");
  });

  it("counts an unknown stale path as drift", async () => {
    // The STALE branch must increment `driftCount`; reporting without failing
    // would reproduce the original defect one level up.
    const source = await readFile(SCRIPT, "utf-8");
    const staleBranch = source.slice(
      source.indexOf("// The other direction:"),
      source.indexOf("// Check config"),
    );

    expect(staleBranch).toContain("STALE: .qfai/");
    expect(staleBranch).toContain("driftCount++");
    // …and the known-stale branch must NOT, or the gate could never pass.
    const knownBranch = staleBranch.slice(
      staleBranch.indexOf("if (reason)"),
      staleBranch.indexOf("continue;"),
    );
    expect(knownBranch).not.toContain("driftCount++");
  });

  it("names every allow-list category in the script", async () => {
    const source = await readFile(SCRIPT, "utf-8");

    // Runtime artifacts `qfai init` deliberately does not seed.
    for (const prefix of ["specs/", "contracts/", "evidence/", "report/", "review/"]) {
      expect(source, prefix).toContain(`"${prefix}"`);
    }
    // A stale path NOT on the known list must fail, which is what stops the
    // residue growing.
    expect(source).toContain("A stale path NOT on this list fails, so the residue cannot grow.");
    expect(source).toContain("driftCount++");
  });

  it("no longer carries the duplicated research-first-protocol", async () => {
    const source = await readFile(SCRIPT, "utf-8");

    // It was a v1.9.0 leftover under catalog/; the shipped copy is under
    // constitution/. Deleted rather than allow-listed.
    expect(source).not.toContain("assistant/catalog/research-first-protocol.md");
  });
});
