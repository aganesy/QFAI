/**
 * The prototyping scope floor has exactly one home.
 *
 * Article VII grants a documented Change Request the right to shrink
 * `/qfai-prototyping` below ALL specs. `workflow.md` used to restate the same
 * rule as "scope is fixed to **ALL specs**" — unconditional, with no exception
 * and no pointer back. Two non-negotiable files, opposite answers to the same
 * request, and nothing in the directory to break the tie. The restatement is
 * now a citation, so the rule cannot drift again.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const CONSTITUTION = "assistant/constitution/constitution.md";
const WORKFLOW = "assistant/constitution/workflow.md";

const SCOPE_FLOOR_HEADING = "### Prototyping exception (scope floor)";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

describe("Article VII governs cutting above other articles and below the safety floor", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: governs both scope and the code implementing it through the ladder`, async () => {
      const constitution = await read(tree, CONSTITUTION);
      const article = flat(
        constitution.split("## Article VII —")[1]?.split("## Article VIII —")[0] ?? "",
      );
      expect(article).toContain("The least that satisfies a requirement is the right amount.");
      expect(article).toContain("Anything beyond it must be justified.");
      expect(article).toContain(
        "both the behaviours a change carries and the code that implements them",
      );
      expect(article).toContain("`.agents/rules/minimal-implementation.md`");
      expect(article).not.toContain("is a separate question");
    });

    it(`${tree}: states precedence without displacing the output-language rule or Article IV`, async () => {
      const constitution = await read(tree, CONSTITUTION);
      const article = flat(
        constitution.split("## Article VII —")[1]?.split("## Article VIII —")[0] ?? "",
      );
      expect(article).toContain(
        "Only the safety floor in `.agents/rules/minimal-implementation.md` § 2 and the unnumbered Absolute Rule — Output Language outrank this article.",
      );
      expect(article).toContain("takes precedence over every other article");
      expect(article).toContain("conflicting instructions in other constitution documents");
      expect(article).toContain("The floor's specification clause preserves Article IV.");
    });

    it(`${tree}: references rather than duplicates the floor and protects traceability and gates there`, async () => {
      const constitution = await read(tree, CONSTITUTION);
      const article = flat(
        constitution.split("## Article VII —")[1]?.split("## Article VIII —")[0] ?? "",
      );
      const rule = await readFile(
        path.join(
          repoRoot,
          tree === ".qfai"
            ? ".agents/rules/minimal-implementation.md"
            : "packages/qfai/assets/init/root/.agents/rules/minimal-implementation.md",
        ),
        "utf-8",
      );
      const floor = rule.split("## 2. What the ladder never removes")[1]?.split("## 3.")[0] ?? "";
      expect(floor).toContain("- Required traceability annotations.");
      expect(floor).toContain("- Anything the spec asks for.");
      expect(floor).toContain("- Repository quality gates and their verification evidence.");
      const items = [...floor.matchAll(/^- (.+)$/gm)].map((match) => match[1] ?? "");
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) expect(article).not.toContain(item.trim());
    });
  }
});

describe("the prototyping scope floor lives in Article VII only", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: constitution.md keeps the floor and its Change Request exception`, async () => {
      const constitution = await read(tree, CONSTITUTION);

      expect(constitution).toContain(SCOPE_FLOOR_HEADING);
      expect(flat(constitution)).toContain(
        "the minimum allowed scope is **ALL specs** in `.qfai/specs/spec-*`",
      );
      expect(flat(constitution)).toContain(
        "prohibited unless explicitly approved as a documented Change Request",
      );
    });

    it(`${tree}: workflow.md cites the article instead of restating the floor`, async () => {
      const workflow = flat(await read(tree, WORKFLOW));

      expect(workflow).toContain(
        "`/qfai-prototyping` scope is governed by Article VII § Prototyping exception (scope floor) in `.qfai/assistant/constitution/constitution.md`",
      );
      // A citation with no precedence rule still leaves a stage-4 agent guessing
      // which non-negotiable file wins when they overlap.
      expect(workflow).toContain(
        "on any overlap between this file and the constitution, the constitution wins",
      );
    });

    it(`${tree}: workflow.md carries no second copy of the floor to drift`, async () => {
      const workflow = await read(tree, WORKFLOW);

      // The exact wording that made the two files disagree.
      expect(workflow).not.toMatch(/scope is fixed to/);
      // Any restatement of the floor's substance is a second home by definition.
      expect(workflow).not.toMatch(/ALL specs/);
    });

    it(`${tree}: the cited heading exists verbatim in constitution.md`, async () => {
      const [constitution, workflow] = await Promise.all([
        read(tree, CONSTITUTION),
        read(tree, WORKFLOW),
      ]);

      const cited = /Article VII § (Prototyping exception \(scope floor\))/.exec(flat(workflow));
      expect(cited).not.toBeNull();
      expect(constitution).toContain(`### ${cited?.[1] ?? ""}`);
    });
  }
});
