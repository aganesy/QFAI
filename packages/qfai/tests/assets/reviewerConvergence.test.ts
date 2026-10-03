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

// The convergence rules live in their own file; the reviewer remit table and
// the response template stay on the delegation baseline.
const CONVERGENCE = "assistant/rule/review-convergence.md";
const DELEGATION = "assistant/rule/shared-skill-delegation-baseline.md";
const OPERATING = "assistant/rule/shared-skill-operating-baseline.md";

describe("reviewer convergence", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: a late high-severity finding still blocks`, async () => {
      const content = await read(tree, CONVERGENCE);
      expectPhrase(content, "**Severity overrides lateness.**");
      expectPhrase(content, "security defect, data loss or corruption");
      expectPhrase(content, "puts it to the user immediately");
      expectPhrase(
        content,
        "Deferring such a finding to an Open Question so a `PASS` can be returned is prohibited",
      );
    });

    it(`${tree}: the response template carries the round number`, async () => {
      const content = await read(tree, DELEGATION);
      expectPhrase(content, "Round: <n>");
      expectPhrase(content, "`Round` is required");
    });

    it(`${tree}: a later-round finding must justify itself`, async () => {
      const content = await read(tree, CONVERGENCE);
      expectPhrase(content, "## Convergence (MUST)");
      expectPhrase(content, "MUST state why it was not raisable in\n  round N-1");
      expectPhrase(content, "is **late**");
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

    it(`${tree}: the autorepair protocol covers reviewer verdicts`, async () => {
      const content = await read(tree, OPERATING);
      // `REVISE` is the in-flight verdict; `FAIL` is only the serialized
      // `summary.json` status, so the trigger names REVISE and points at the
      // vocabulary rather than offering both as reviewer verdicts.
      expectPhrase(content, "or when a blocking reviewer returns `REVISE`");
      expectPhrase(content, "shared-skill-delegation-baseline.md#verdict-vocabulary");
      expectNoPhrase(content, "reviewer returns `FAIL` / `REVISE`");
    });
  }
});
