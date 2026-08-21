/**
 * The completion-prohibition list in `qfai-implement/SKILL.md` enumerated the
 * non-terminal statuses that block a spec from closing — and omitted `blocked`.
 *
 * `references/execution-ledger.md` states that `blocked` is
 * "**completion-prohibiting**, exactly like `todo`", and `todo` *is* on that
 * bullet. None of the other prohibition bullets reaches a blocked row either:
 * they test for missing RED / GREEN / reviewer verdicts, and a row that was
 * never started has none of those to be missing. So an agent reading the
 * MUST NOT list as the authoritative check found nothing about `blocked` and
 * could declare the spec complete over an unimplemented obligation whose
 * `Blocked-By` cell made it look handled.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const SKILL_DIRS = [
  "packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement",
  ".qfai/assistant/skills/qfai-implement",
];

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");
const read = (dir: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, dir, rel), "utf-8");

describe("`blocked` prohibits completion in the list phrased as the hard stop", () => {
  for (const relativePath of SKILL_DIRS) {
    it(`${relativePath}: the prohibition list names blocked alongside todo`, async () => {
      const skill = await read(relativePath, "SKILL.md");
      expect(skill).toContain(
        "- Items with `todo`, `blocked`, `red`, `green`, `refactor`, or `review-fix` status still exist",
      );
      // The pre-fix bullet, which left `blocked` unlisted, must be gone.
      expect(skill).not.toContain(
        "- Items with `todo`, `red`, `green`, `refactor`, or `review-fix` status still exist",
      );
    });

    it(`${relativePath}: the ledger reference reconciles blocked with that list`, async () => {
      // `review-fix` already carries this sentence; without the counterpart the
      // next status added to the lifecycle has no stated convention to follow.
      const ledger = await read(relativePath, "references/execution-ledger.md");
      expect(flat(ledger)).toContain(
        "`blocked` is not a completion state and appears in the completion-prohibition list",
      );
      // The rule it reconciles with stays stated where it already lives.
      expect(flat(ledger)).toContain("It is **completion-prohibiting**, exactly like `todo`.");
    });
  }
});
