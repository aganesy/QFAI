import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { readRule } from "../helpers/ruleWithReferences.js";
import { useTempDirPool } from "../helpers/shippedWorkflowFixtures.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const DELEGATION = "assistant/rule/shared-skill-delegation-baseline.md";
const DRIFT = "assistant/rule/drift-protocol.md";
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
  unwrap(await readRule(path.join(repoRoot, tree, rel)));

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

    it(`${tree}: the drift protocol routes new scope and every reviewer card reads the rule`, async () => {
      expect(await read(tree, DRIFT)).toContain("New scope adds product behavior");
      for (const card of REVIEWER_CARDS) {
        expect(await read(tree, `assistant/agent/${card}.md`), card).toContain(
          "shared-skill-delegation-baseline.md",
        );
      }
    });
  }
});

describe("referenced rule reads", () => {
  const createTempDir = useTempDirPool("qfai-rule-reference-read-");

  it("keeps the baseline when optional references are absent", async () => {
    const root = await createTempDir();
    const file = path.join(root, "shared-skill-baseline.md");
    await writeFile(file, "baseline", "utf-8");
    await expect(readRule(file)).resolves.toBe("baseline");
  });

  it("appends sorted markdown bodies after the baseline and ignores other files", async () => {
    const root = await createTempDir();
    const file = path.join(root, "shared-skill-baseline.md");
    const references = path.join(root, "references");
    await writeFile(file, "baseline", "utf-8");
    await mkdir(references);
    await writeFile(path.join(references, "z.md"), "last", "utf-8");
    await writeFile(path.join(references, "a.md"), "first", "utf-8");
    await writeFile(path.join(references, "ignored.txt"), "not a rule", "utf-8");
    await expect(readRule(file)).resolves.toBe("baseline\nfirst\nlast");
  });

  it("rejects references stored as a file with the full path and original read cause", async () => {
    const root = await createTempDir();
    const file = path.join(root, "shared-skill-baseline.md");
    const references = path.join(root, "references");
    await writeFile(file, "baseline", "utf-8");
    await writeFile(references, "not a directory", "utf-8");
    await expect(readRule(path.relative(process.cwd(), file))).rejects.toMatchObject({
      message: `Cannot read rule references: ${references}`,
      cause: expect.objectContaining({ code: "ENOTDIR" }),
    });
  });

  it("returns an ordinary rule without reading neighboring references", async () => {
    const root = await createTempDir();
    const file = path.join(root, "ordinary-rule.md");
    await writeFile(file, "ordinary rule", "utf-8");
    await writeFile(path.join(root, "references"), "not a directory", "utf-8");
    await expect(readRule(file)).resolves.toBe("ordinary rule");
  });
});
