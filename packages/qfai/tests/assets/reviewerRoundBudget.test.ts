import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

const DELEGATION = "assistant/constitution/shared-skill-delegation-baseline.md";
const OPERATING = "assistant/constitution/shared-skill-operating-baseline.md";

describe("reviewer gates terminate", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the Reviewer Gate Baseline caps rounds and escalates`, async () => {
      const content = await read(tree, DELEGATION);
      expect(content).toContain("### Round budget (MUST)");
      expect(content).toContain("**Two rounds per reviewer per artifact.**");
      expect(content).toContain("MUST stop and\n  escalate to the user");
      expect(content).toContain("Escalation is not failure");
      // The stop is decided by round 2's verdict, not by predicting a third
      // review the rule forbids starting.
      expect(content).toContain("**The budget is spent the moment round 2 returns\n  `REVISE`**");
      expect(content).toContain("never a prediction\n  about a review that must not run");
    });

    it(`${tree}: escalation has an exit that can reach DONE`, async () => {
      const content = await read(tree, DELEGATION);
      expect(content).toContain("**Completion after escalation.**");
      expect(content).toContain(
        'the exception to\n  "no DONE until all blocking reviewers `PASS`"',
      );
      expect(content).toContain("superseded by the recorded user decision");
      expect(content).toContain("one **verification review** of exactly that fix is");
      expect(content).toContain("it is round 2b, not round 3");
    });

    it(`${tree}: a late high-severity finding still blocks`, async () => {
      const content = await read(tree, DELEGATION);
      expect(content).toContain("**Severity overrides lateness.**");
      expect(content).toContain("security defect, data loss or corruption");
      expect(content).toContain("stops and escalates to the user immediately");
      expect(content).toContain(
        "Deferring\n  such a finding to an Open Question so a `PASS` can be returned is prohibited.",
      );
    });

    it(`${tree}: the response template carries the round number`, async () => {
      const content = await read(tree, DELEGATION);
      expect(content).toContain("Round: 1 | 2 | 2b");
      expect(content).toContain("`Round` is required");
    });

    it(`${tree}: a later-round finding must justify itself`, async () => {
      const content = await read(tree, DELEGATION);
      expect(content).toContain("### Convergence (MUST)");
      expect(content).toContain("MUST state why it was not raisable in\n  round N-1");
      expect(content).toContain("out of budget");
      expect(content).toContain("MUST NOT open a new blocking _class_");
    });

    it(`${tree}: each stage's reviewer remit is bounded`, async () => {
      const content = await read(tree, DELEGATION);
      expect(content).toContain("### Reviewer remit (in scope per stage)");
      // Every skill that references this baseline needs a row, or the same
      // finding is blocking in one run and deferred in the next.
      for (const stage of [
        "/qfai-discussion",
        "/qfai-sdd",
        "/qfai-atdd",
        "/qfai-implement",
        "/qfai-configure",
        "/qfai-verify",
      ]) {
        expect(content).toContain(`| \`${stage}\``);
      }
      expect(content).toContain("Out of scope (record and defer)");
      expect(content).toContain("**Fallback for any stage not listed.**");
    });

    it(`${tree}: every skill referencing the baseline has a remit row`, async () => {
      const content = await read(tree, DELEGATION);
      const skillsDir = path.join(repoRoot, tree, "assistant", "skills");
      const skills = (await readdir(skillsDir, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
      for (const skill of skills) {
        let body: string;
        try {
          body = await readFile(path.join(skillsDir, skill, "SKILL.md"), "utf-8");
        } catch {
          continue;
        }
        if (!body.includes("shared-skill-delegation-baseline")) continue;
        expect(content).toContain(`| \`/${skill}\``);
      }
    });

    it(`${tree}: the autorepair protocol covers reviewer verdicts and round count`, async () => {
      const content = await read(tree, OPERATING);
      expect(content).toContain("or when a blocking reviewer returns `FAIL` / `REVISE`");
      expect(content).toContain("stop on **round count** as well as on lack of progress");
      expect(content).toContain("shared-skill-delegation-baseline.md#round-budget-must");
    });
  }
});
