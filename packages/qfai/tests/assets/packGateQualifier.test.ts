/**
 * The shipped Done criteria must not demand a packaging gate unconditionally.
 *
 * `/qfai-atdd`'s Done criteria list is what an independent completion reviewer
 * grades against, and it stated `pack` as a flat gate while the same file's own
 * step 3 — and all three constitution files it inherits from — qualify it with
 * `(if distributed)`. On a repository that publishes nothing, the criterion is
 * unsatisfiable as written: the reviewer either records an unexplained omission
 * or accepts an invented `pack` command that verifies nothing.
 *
 * These tests pin the qualifier onto the Done bullet, and pin the qualifier the
 * bullet inherits from — the procedure step and the constitution files — so the
 * two cannot drift apart again.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const ATDD = "assistant/skills/qfai-atdd/SKILL.md";
const CONSTITUTION = "assistant/constitution/constitution.md";
const WORKFLOW = "assistant/constitution/workflow.md";
const QUALITY = "assistant/constitution/quality.md";

const read = async (tree: string, rel: string): Promise<string> =>
  await readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s+/g, " ");

describe("shipped Done criteria qualify the packaging gate", () => {
  for (const tree of TREES) {
    it(`${tree}: the ATDD Done bullet marks pack/verify as distribution-conditional`, async () => {
      const body = flat(await read(tree, ATDD));

      expect(body).toContain(
        "- Repository quality gates (format/lint/type/tests, and pack/verify if distributed) pass with evidence.",
      );
      // The pre-fix wording stated the packaging gate as one more flat item in
      // the slash-separated list, with nothing to exempt a non-distributed repo.
      expect(body).not.toContain("(format/lint/type/tests/pack)");
    });

    it(`${tree}: the ATDD procedure keeps the qualifier the Done bullet inherits`, async () => {
      const body = flat(await read(tree, ATDD));

      expect(body).toContain("- pack/verify (if distributed)");
    });

    it(`${tree}: the constitution files it inherits from still carry the qualifier`, async () => {
      const [constitution, workflow, quality] = await Promise.all([
        read(tree, CONSTITUTION),
        read(tree, WORKFLOW),
        read(tree, QUALITY),
      ]);

      expect(flat(constitution)).toContain("- packaging verification (if distributed)");
      expect(flat(workflow)).toContain("- pack/verify (if distributed)");
      expect(flat(quality)).toContain(
        "- pack / distribution verification (when publishing or distribution matters)",
      );
    });
  }
});
