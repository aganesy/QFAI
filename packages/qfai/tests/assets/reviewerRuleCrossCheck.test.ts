import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { readRule } from "../helpers/ruleWithReferences.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const CARD = "assistant/agent/requirements-reviewer.md";

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

describe("the spec review of a rule change cross-checks the rules it links to", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the requirements reviewer reads linked rules both ways and reports conflicts`, async () => {
      const card = unwrap(await readRule(path.join(repoRoot, tree, CARD)));
      expect(card).toContain(
        "When the change adds or edits a rule master under `.agents/rules/`, read every rule it points to and every rule that points to it",
      );
      expect(card).toContain(
        "report as a finding each clause that gives a different answer to the same situation",
      );
    });
  }
});
