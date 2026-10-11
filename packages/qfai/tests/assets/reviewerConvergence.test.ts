import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { readRule } from "../helpers/ruleWithReferences.js";

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
    pending = readRule(path.join(repoRoot, tree, rel));
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

// The one-review rule lives in its own file; the reviewer remit table and the
// response template stay on the delegation baseline.
const CONVERGENCE = "assistant/rule/review-convergence.md";
const DELEGATION = "assistant/rule/shared-skill-delegation-baseline.md";
const OPERATING = "assistant/rule/shared-skill-operating-baseline.md";

describe("reviewer convergence", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: a stage is reviewed once and the author fixes or answers each finding`, async () => {
      const content = await read(tree, CONVERGENCE);
      expectPhrase(content, "## One review");
      expectPhrase(content, "The review runs once, after the stage's last step.");
      expectPhrase(content, "The author fixes or answers every finding");
      expectPhrase(content, "There is no re-review and no `REVISE` loop.");
      expectPhrase(
        content,
        "A finding the author cannot fix is reported in the stage's final report",
      );
      const review = content.split("## One review")[1]?.split(/^## /m)[0];
      expect(review, "the one-review section is missing").toBeDefined();
      expectPhrase(review ?? "", "A critical decision requires actual user authority");
      expectPhrase(review ?? "", ".agents/rules/grilling.md#explicit-delegation-for-a-discussion");
      expectPhrase(
        review ?? "",
        "Without an actual answer or recorded applicable authorization, it goes to the user when questions are permitted",
      );
      for (const critical of [
        "contradicts a spec, a contract or a recorded decision",
        "effect cannot be taken back",
        "rests on product intent nothing written states",
      ]) {
        expectPhrase(review ?? "", critical);
      }
      expectNoPhrase(content, "round N-1");
    });

    it(`${tree}: a severe finding goes to the user, never only to the report`, async () => {
      const content = await read(tree, CONVERGENCE);
      expectPhrase(content, "security defect, data loss or corruption");
      expectPhrase(content, "it is never only reported");
    });

    it(`${tree}: the response template carries no round number`, async () => {
      const content = await read(tree, DELEGATION);
      expectNoPhrase(content, "Round: <n>");
    });

    it(`${tree}: each stage's reviewer remit is bounded`, async () => {
      const content = await read(tree, DELEGATION);
      expectPhrase(content, "### Reviewer remit (in scope per stage)");
      // Every skill that references this baseline needs a row, or the same
      // finding is blocking in one run and deferred in the next.
      for (const stage of [
        "/qfai-discussion",
        "/qfai-sdd",
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
      const skillsDir = path.join(repoRoot, tree, "assistant", "skill");
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

    it(`${tree}: the autorepair protocol leaves a REVISE to the one-review rule`, async () => {
      const content = await read(tree, OPERATING);
      expectPhrase(
        content,
        "A reviewer's `REVISE` is not a gate failure and is not rerun: the author fixes or answers each finding once",
      );
      expectNoPhrase(content, "or when a blocking reviewer returns `REVISE`");
    });
  }
});
