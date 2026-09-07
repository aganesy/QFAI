import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Anchored to this file, not to `process.cwd()`. A runner launched from the
// repo root resolves `../..` to the directory ABOVE the repo, and every read
// below then fails on a path unrelated to what is being asserted.
// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

/**
 * Each markdown file is asserted against by many cases. Read it once per
 * `<tree, rel>` and hand out the same string.
 */
const cache = new Map<string, Promise<string>>();
const read = (tree: string, rel: string): Promise<string> => {
  const key = `${tree}::${rel}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = readFile(path.join(repoRoot, tree, rel), "utf-8");
    cache.set(key, pending);
  }
  return pending;
};

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

/**
 * Assert `phrase` appears in `content`, ignoring how either side is wrapped.
 * Pinning an exact `\n  ` meant a harmless reflow of the docs failed the suite,
 * and — worse for a negative check — a rewrap could hide a phrase that came back.
 */
function expectPhrase(content: string, phrase: string): void {
  expect(unwrap(content)).toContain(unwrap(phrase));
}

function expectNoPhrase(content: string, phrase: string): void {
  expect(unwrap(content)).not.toContain(unwrap(phrase));
}

// The round-budget and convergence rules moved out of the delegation
// baseline: that file sat at exactly the 500-line shipped-asset ceiling, so
// the corrective-review path could not be added to it. The rules are
// unchanged by the move; the assertions about them follow the file, and the
// assertions about the reviewer remit table and the response template stay
// on the baseline, which still owns those.
const CONVERGENCE = "assistant/constitution/review-convergence.md";
const DELEGATION = "assistant/constitution/shared-skill-delegation-baseline.md";
const OPERATING = "assistant/constitution/shared-skill-operating-baseline.md";

describe("reviewer gates terminate", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the Reviewer Gate Baseline caps rounds and escalates`, async () => {
      const content = await read(tree, CONVERGENCE);
      expectPhrase(content, "### Round budget (MUST)");
      expectPhrase(content, "**Two rounds per reviewer per artifact.**");
      expectPhrase(content, "MUST stop and\n  escalate to the user");
      expectPhrase(content, "Escalation is not failure");
      // The stop is decided by round 2's verdict, not by predicting a third
      // review the rule forbids starting.
      expectPhrase(content, "**The budget is spent the moment round 2 returns\n  `REVISE`**");
      expectPhrase(content, "never a prediction\n  about a review that must not run");
    });

    it(`${tree}: escalation has an exit that can reach DONE`, async () => {
      const content = await read(tree, CONVERGENCE);
      expectPhrase(content, "**Completion after escalation.**");
      expectPhrase(content, 'the exception to\n  "no DONE until all blocking reviewers `PASS`"');
      expectPhrase(content, "superseded by the recorded user decision");
      expectPhrase(content, "one **verification review** of exactly that fix is");
      expectPhrase(content, "it is round 2b, not round 3");
    });

    it(`${tree}: the exit withholds accept-as-OQ for a critical finding`, async () => {
      const content = await read(tree, CONVERGENCE);
      // Without this, the general exit is a route around the severity floor
      // that needs no lateness and no reviewer consent — only a user click.
      expectPhrase(content, "**Severity floor on the exit.**");
      expectPhrase(content, "_Accept as Open Question_ is NOT available");
      expectPhrase(content, "only _apply a named fix_ or _drop the item from scope_");
      // Both directions must say it, so neither section reads as the whole rule.
      expectPhrase(
        content,
        "the escalation exit in the round budget withholds _Accept as Open Question_",
      );
    });

    it(`${tree}: round 2b may report a regression the named fix caused`, async () => {
      const content = await read(tree, CONVERGENCE);
      // The convergence rule already accepts that a fix introduces or exposes
      // findings; a 2b reviewer that may not report one can only return a
      // false PASS or break the rule.
      expectPhrase(
        content,
        "a defect the fix **introduced or exposed** is in remit and MUST be\n    reported",
      );
      expectPhrase(content, "returning `PASS` while a regression sits next to them");
      expectPhrase(content, "still does not start a round 3");
      // The old absolute wording must be gone.
      expectNoPhrase(content, "it may not raise new findings");
    });

    // A budget-free 2b plus an always-available escalation compose into a loop
    // with no guaranteed end. The cap is what makes the gate terminate.
    it(`${tree}: the verification review cannot recur without bound`, async () => {
      const content = await read(tree, CONVERGENCE);
      expectPhrase(content, "**One 2b per artifact, total.**");
      expectPhrase(content, "MUST NOT be answered with another _apply a named fix_ + 2b cycle");
      expectPhrase(
        content,
        "At the second escalation the user is offered only _accept as Open Question_ or _drop the item from scope_",
      );
      expectPhrase(
        content,
        "the intersection of the two rules leaves _drop the item from scope_ alone",
      );
      // The corrective path is the exit that state has, and it ends: a
      // `REVISE` there is terminal, so the cap's guaranteed end moved one
      // step later rather than being removed.
      expectPhrase(content, "**`REVISE` is terminal.**");
      expectPhrase(content, "No second corrective artifact, no further review");
    });

    it(`${tree}: a late high-severity finding still blocks`, async () => {
      const content = await read(tree, CONVERGENCE);
      expectPhrase(content, "**Severity overrides lateness.**");
      expectPhrase(content, "security defect, data loss or corruption");
      expectPhrase(content, "stops and escalates to the user immediately");
      expectPhrase(
        content,
        "Deferring\n  such a finding to an Open Question so a `PASS` can be returned is prohibited.",
      );
    });

    it(`${tree}: the response template carries the round number`, async () => {
      const content = await read(tree, DELEGATION);
      expectPhrase(content, "Round: 1 | 2 | 2b");
      expectPhrase(content, "`Round` is required");
    });

    it(`${tree}: a later-round finding must justify itself`, async () => {
      const content = await read(tree, CONVERGENCE);
      expectPhrase(content, "### Convergence (MUST)");
      expectPhrase(content, "MUST state why it was not raisable in\n  round N-1");
      expectPhrase(content, "out of budget");
      expectPhrase(content, "MUST NOT open a new blocking _class_");
    });

    it(`${tree}: each stage's reviewer remit is bounded`, async () => {
      const content = await read(tree, DELEGATION);
      expectPhrase(content, "### Reviewer remit (in scope per stage)");
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
        expectPhrase(content, `| \`${stage}\``);
      }
      expectPhrase(content, "Out of scope (record and defer)");
      expectPhrase(content, "**Fallback for any stage not listed.**");
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
        expectPhrase(content, `| \`/${skill}\``);
      }
    });

    it(`${tree}: the autorepair protocol covers reviewer verdicts and round count`, async () => {
      const content = await read(tree, OPERATING);
      // `REVISE` is the in-flight verdict; `FAIL` is only the serialized
      // `summary.json` status, so the trigger names REVISE and points at the
      // vocabulary rather than offering both as reviewer verdicts.
      expectPhrase(content, "or when a blocking reviewer returns `REVISE`");
      expectPhrase(content, "shared-skill-delegation-baseline.md#verdict-vocabulary");
      expectNoPhrase(content, "reviewer returns `FAIL` / `REVISE`");
      expectPhrase(content, "stop on **round count** as well as on lack of progress");
      expectPhrase(content, "review-convergence.md#round-budget-must");
    });
  }
});
