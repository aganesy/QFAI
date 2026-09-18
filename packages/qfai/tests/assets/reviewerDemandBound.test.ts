import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const DELEGATION = "assistant/constitution/shared-skill-delegation-baseline.md";
const DRIFT = "assistant/constitution/drift-protocol.md";
const ANCHOR = "shared-skill-delegation-baseline.md#what-a-reviewer-may-demand-more-of-must";
const REVIEWER_CARDS = [
  "architecture-reviewer",
  "completion-reviewer",
  "implementation-reviewer",
  "product-surface-reviewer",
  "qa-gatekeeper",
  "requirements-reviewer",
];

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  unwrap(await readFile(path.join(repoRoot, tree, rel), "utf-8"));

describe("a reviewer's demand for more work is bounded by the artifact", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the concrete artifacts admit it and the abstract ones do not`, async () => {
      // The whole row, both columns. A reviewer who can ask for another
      // business rule without limit is what makes a review cycle grow.
      const content = await read(tree, DELEGATION);
      expect(content).toContain("### What a reviewer may demand more of (MUST)");
      expect(content).toMatch(
        /\|\s*business flows, user stories, acceptance criteria, examples, test cases\s*\|\s*business rules, non-functional requirements, policies and decisions, architecture\s*\|/,
      );
    });

    it(`${tree}: a missing pair and a safety-floor item stay demandable anywhere`, async () => {
      const content = await read(tree, DELEGATION);
      expect(content).toContain("an abstract item already recorded carry its mandatory pair");
      expect(content).toContain(
        "security, accessibility, data-loss handling, or validation at a trust boundary",
      );
      // What is bounded is the requirement, not the report.
      expect(content).toContain("never what a reviewer may report");
      expect(content).toContain("is recorded as `advisory` and cannot force `REVISE`");
    });

    it(`${tree}: the drift protocol and every reviewer card point at the rule`, async () => {
      expect(await read(tree, DRIFT)).toContain(ANCHOR);
      for (const card of REVIEWER_CARDS) {
        expect(await read(tree, `assistant/agents/${card}.md`), card).toContain(ANCHOR);
      }
    });
  }
});
