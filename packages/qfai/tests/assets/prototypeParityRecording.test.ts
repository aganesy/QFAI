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
 *
 * Three follow-ons, each a place where the same contract was stated with a
 * count of two: `references/execution-ledger.md` still told the runner to
 * append "the two reviewer verdicts"; the canonical audit-hash procedure in
 * `shared-skill-delegation-baseline.md` defined the _Completion review_
 * subject for `completion-reviewer` / `implementation-reviewer` only, leaving
 * the parity hash with no defined extent to recompute; and the same-revision
 * rule (`references/evidence-revision.md`) covered the GREEN and "the two
 * reviews", so a parity PASS taken before the UI moved stayed fresh.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL_REL = "assistant/skills/qfai-implement/SKILL.md";
const LEDGER_REL = "assistant/skills/qfai-implement/references/execution-ledger.md";
const REVISION_REL = "assistant/skills/qfai-implement/references/evidence-revision.md";
const DELEGATION_REL = "assistant/constitution/shared-skill-delegation-baseline.md";

const readAsset = (tree: string, relativePath: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, relativePath), "utf-8");

const readSkill = (tree: string): Promise<string> => readAsset(tree, SKILL_REL);

/** Soft-wrapped prose joined back into one line, so a phrase can be matched. */
const flat = (text: string): string => text.replace(/\r?\n\s*/g, " ");

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

    it(`${tree}: the ledger reference states the same count as gate item 11`, async () => {
      // The detailed procedure item 11 points at carried the old contract:
      // "append the two reviewer verdicts to that file". Two files disagreeing
      // about how many verdicts a `done` row must hold makes the verdict
      // depend on which one the runner read.
      const ledger = flat(await readAsset(tree, LEDGER_REL));

      expect(ledger).not.toContain("append the two reviewer verdicts");
      expect(ledger).toContain("append **every routed reviewer's** verdict");
      expect(ledger).toContain("`Prototype parity`");
      expect(ledger).toContain("`product-surface-reviewer`");
    });

    it(`${tree}: the audit-hash procedure defines the parity subject`, async () => {
      // Requiring an `Audited evidence hash` from a third reviewer without
      // naming its subject leaves the reviewer and gate item 10 free to hash
      // different extents — two honest parties then fail the row exactly as
      // tampering would.
      const delegation = flat(await readAsset(tree, DELEGATION_REL));

      expect(delegation).toContain(
        "**Completion review** (`completion-reviewer` / `implementation-reviewer` / `product-surface-reviewer`",
      );
      expect(delegation).toContain("`product-surface-reviewer` takes that same subject");
      // What it adds is named: the surface evidence the revision excludes.
      expect(delegation).toContain("`.qfai/evidence/**`");
      expect(delegation).toContain("contribute no record");
      // And the skill points at that procedure rather than at its siblings.
      expect(flat(await readSkill(tree))).toContain(
        "_Completion review_ subject lists `product-surface-reviewer` beside the other two",
      );
    });

    it(`${tree}: item 9's revision is inside the freshness rule`, async () => {
      // A hash that recomputes proves the evidence did not move; it says
      // nothing about the UI. Without item 9 in the same-revision set, a parity
      // PASS taken before the surface changed still carries the row to `done`.
      const skill = flat(await readSkill(tree));
      const revision = flat(await readAsset(tree, REVISION_REL));

      expect(skill).toContain("on a UI-affecting row item 9's `Reviewed revision` shares it too");
      expect(revision).toContain("**A UI-affecting row has a fifth: gate item 9**");
      expect(revision).toContain("must equal `Revision`");
      expect(revision).not.toContain("leaves `Revision` for the GREEN and the two reviews");
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
