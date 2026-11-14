/**
 * A reviewer's card is its checklist, and the request that dispatches it can
 * add a focus but never drop a check.
 *
 * The session agent writes the request. A request that said "check against the
 * UI contracts" and "do not flag" a missing screen turned the screen review into
 * a contract-conformance check, and every review passed a bare app. The review
 * step forbids that narrowing, each reviewer accounts for every responsibility
 * on its card, and the stage report records which ones each review covered.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

const ASSISTANT_ROOTS = [
  path.join(repoRoot, "packages/qfai/assets/init/.qfai/assistant"),
  path.join(repoRoot, ".qfai/assistant"),
];

const REVIEWERS = [
  "implementation-reviewer",
  "requirements-reviewer",
  "architecture-reviewer",
  "product-surface-reviewer",
];

const SIGN_OFF =
  "- [ ] Every Domain Responsibility on this card was checked, or named as not applicable to the target, whatever the request's focus";

const flat = (text: string): string => text.replace(/\s+/g, " ");

describe("a review request cannot narrow a reviewer's checklist", () => {
  for (const root of ASSISTANT_ROOTS) {
    const tree = path.relative(repoRoot, root);

    it(`${tree}: the review step lets a focus add checks but not remove one`, async () => {
      const step = flat(
        await readFile(path.join(root, "step/common-review-cycle/STEP.md"), "utf-8"),
      );

      expect(step).toContain("The reviewer's card is its checklist");
      expect(step).toContain("A focus adds to them and never removes one.");
      expect(step).toContain("not to flag a gap a responsibility covers");
      expect(step).toContain(
        "the Domain Responsibilities of its card it checked, naming each one it found not applicable",
      );
      expect(step).toContain(
        "the responsibilities it checked and the ones it named not applicable",
      );
      expect(step).toContain(
        "Each response accounted for every Domain Responsibility of the reviewer's card.",
      );
    });

    it(`${tree}: every reviewer card signs off on its whole checklist`, async () => {
      const missing: string[] = [];
      for (const reviewer of REVIEWERS) {
        const card = await readFile(path.join(root, "agent", `${reviewer}.md`), "utf-8");
        const signOff = card.slice(card.indexOf("## Sign-off"), card.indexOf("## When to use"));
        if (!signOff.includes(SIGN_OFF)) missing.push(reviewer);
      }
      expect(missing).toEqual([]);
    });
  }
});
