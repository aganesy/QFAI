/**
 * A retired spec's ledger is history, and `/qfai-implement` must not select
 * from it.
 *
 * `validate` demotes every finding on a non-active spec to `info` so the
 * retired ledger stops gating. That is only half the rule: the skill that
 * *picks* the next row scans `tdd/test-list.md` and takes the first
 * `review-fix` / `todo` it finds. Blind to the lifecycle, an argument-free
 * invocation lands on the retired ledger and re-implements a requirement whose
 * live rows `/qfai-sdd` already migrated to the successor — work nobody owes,
 * against obligations that no longer exist.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Anchored to this file, not to `process.cwd()`.
// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-implement/SKILL.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

describe("qfai-implement selects rows only from an active spec", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: auto-discovery is restricted to active specs`, async () => {
      const skill = unwrap(await read(tree, SKILL));
      expect(skill).toContain("## Spec Auto-Discovery Protocol");
      expect(skill).toContain("**active specs only**");
      for (const status of ["superseded", "deprecated", "removed"]) {
        expect(skill).toContain(`\`Status: ${status}\``);
      }
    });
  }

  for (const tree of QFAI_TREES) {
    it(`${tree}: names the rows a retired ledger would wrongly offer`, async () => {
      const skill = unwrap(await read(tree, SKILL));
      expect(skill).toMatch(/`todo` \/ `review-fix`/);
      expect(skill).toMatch(/historical record/);
    });
  }

  for (const tree of QFAI_TREES) {
    it(`${tree}: an explicit argument does not waive the lifecycle check`, async () => {
      // The reason auto-discovery alone is not enough: naming the spec is how
      // an operator reaches a retired ledger once the scan stops offering it.
      const skill = unwrap(await read(tree, SKILL));
      expect(skill).toContain("**An explicitly named spec that is retired stops the same way**");
      expect(skill).toContain("Superseded-by");
    });
  }
});
