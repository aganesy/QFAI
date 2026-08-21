/**
 * `Prototype parity` needs a recording obligation, not just a field (#571).
 *
 * `qfai-implement/SKILL.md` makes prototype parity PASS item 9 of the gate and
 * gives it a named field in the per-item evidence contract, but the two
 * passages that oblige a verdict to be *written* to the evidence file — gate
 * item 11 and the completion prohibition — both said "both reviewer verdicts".
 * Two, not three. Since the prohibition also declares itself "the single
 * blocking statement about the evidence file", a UI-affecting item could reach
 * `done` with a gate-passing evidence file that never recorded the parity
 * verdict — the one verdict that cannot be re-derived from the spec and the
 * diff, because it was taken against a rendered surface that has since moved.
 *
 * The field was also weaker than its two siblings: it carried neither
 * `Reviewed revision` nor `Audited evidence hash`, so gate item 10's
 * recompute had nothing to recompute for it.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL_REL = "assistant/skills/qfai-implement/SKILL.md";

const readSkill = (tree: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, SKILL_REL), "utf-8");

/** The single line of `text` that contains `needle`. */
function lineWith(text: string, needle: string): string {
  const line = text.split(/\r?\n/).find((candidate) => candidate.includes(needle));
  expect(line, `no line contains ${JSON.stringify(needle)}`).toBeDefined();
  return line ?? "";
}

describe("prototype parity is recorded, not merely required", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: no evidence obligation hard-codes a count of two verdicts`, async () => {
      // The defect in one line: every passage that obliges verdicts to be
      // written said "both", which excludes the third reviewer by arithmetic.
      expect(await readSkill(tree)).not.toContain("both reviewer verdicts");
    });

    it(`${tree}: gate item 11 obliges every routed reviewer's verdict`, async () => {
      const item11 = lineWith(await readSkill(tree), "11. The item's evidence file (item 10)");

      expect(item11).toContain("every routed reviewer's");
      expect(item11).toContain("`Prototype parity`");
      // Item 11 stays scoped to the post-7-8 append; it must not become a
      // second statement about the file's existence.
      expect(item11).toContain("after items 7-8 returned PASS");
    });

    it(`${tree}: the completion prohibition covers the parity verdict`, async () => {
      const prohibition = lineWith(
        await readSkill(tree),
        "single blocking statement about the evidence file",
      );

      expect(prohibition).toContain("every routed reviewer's");
      expect(prohibition).toContain("`Prototype parity`");
    });

    it(`${tree}: the parity field carries the revision and audit hash its siblings do`, async () => {
      const skill = await readSkill(tree);
      const parity = lineWith(skill, "- `Prototype parity` — product-surface-reviewer result");

      // Item 10 recomputes "each reviewer verdict's `Audited evidence hash`";
      // without these two fields there is nothing to recompute for this one.
      expect(parity).toContain("`Reviewed revision`");
      expect(parity).toContain("`Audited evidence hash`");
      expect(lineWith(skill, "- `Spec review` —")).toContain("`Audited evidence hash`");
      expect(lineWith(skill, "- `Code quality review` —")).toContain("`Audited evidence hash`");
    });

    it(`${tree}: the gate item the recording serves is still there`, async () => {
      // The alternative fix was to drop item 9 / the field entirely. It was not
      // taken, so both must survive — otherwise this change is half-applied.
      const skill = await readSkill(tree);

      expect(skill).toContain("prototype parity PASS from `product-surface-reviewer`");
      expect(skill).toContain("- `Prototype parity` — product-surface-reviewer result");
    });
  }
});
