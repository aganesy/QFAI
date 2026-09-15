import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-sdd";
const PLAN = `${SKILL}/templates/specs/spec/10_Plan.md`;
const read = async (tree: string, relative: string): Promise<string> =>
  (await readFile(path.join(ROOT, tree, relative), "utf-8")).replace(/\s+/g, " ");

describe("architectural elements have concrete usage references before implementation", () => {
  for (const tree of TREES) {
    it(`${tree}: Plan owns the count, floor exception and actual-caller limit`, async () => {
      const plan = await read(tree, PLAN);
      expect(plan).toContain("at least three distinct concrete usages");
      expect(plan).toContain("case, example, contract or interaction references");
      expect(plan).toContain("three links to one usage do not count");
      expect(plan).toContain(".agents/rules/minimal-implementation.md");
      expect(plan).toContain("§ 2");
      expect(plan).toContain(
        "cite the necessary usages and the obligation that requires that element",
      );
      expect(plan).toContain("never cut the obligation to clear the count");
      expect(plan).toContain(
        "Subject to the same floor, shared code still waits for its third actual caller",
      );
      expect(plan).toContain("documentation references do not prove three callers");
      // What the count is of, and what an element is, so a reviewer blocking on
      // it reads the same rule the author did.
      expect(plan).toContain("a thing this plan introduces for other things to");
      expect(plan).toContain("The count is of call sites that exist when the element does");
    });

    it(`${tree}: SDD reports failed document checks before implementation`, async () => {
      const skill = await read(tree, `${SKILL}/SKILL.md`);
      expect(skill).toContain("templates/specs/spec/10_Plan.md#implementation-approach");
      expect(skill).toContain("Report missing or insufficient usage references as findings");
      expect(skill).toContain("stop before implementation");
      // Every run that finalizes a Plan, which is one named spec or each target
      // of a no-argument batch. A batch finalizes them too.
      expect(skill.includes("in any run that finalizes a `10_Plan.md`")).toBe(true);
      expect(skill.includes("or every capability under a no-argument batch")).toBe(true);
      expect(skill.includes("Contract-scoped runs do not apply this Plan gate")).toBe(true);
      expect(
        skill.includes(
          "halt to widen the Change Request to a spec-scoped run; do not write the Plan",
        ),
      ).toBe(true);
    });

    it(`${tree}: the implementation reviewer counts the callers that exist`, async () => {
      // The Plan's usages are cited before implementation, so nothing downstream
      // would have re-read them against the tree the element lands in.
      const card = await read(tree, "assistant/agents/implementation-reviewer.md");
      expect(card).toContain("Count the call sites of an architectural element");
      expect(card).toContain("as they exist in the tree");
      expect(card).toContain("10_Plan.md#implementation-approach");
    });

    it(`${tree}: the required completion reviewer reads and enforces the check`, async () => {
      const card = await read(tree, "assistant/agents/completion-reviewer.md");
      expect(card).toContain("10_Plan.md#implementation-approach");
      expect(card).toContain("return REVISE for missing or insufficient usage references");
      expect(card).toContain("unless the documented safety-floor exception applies");
      // The targets of this cycle, not every pack in the tree.
      expect(card).toContain("read the `10_Plan.md` of each spec that");
      expect(card).toContain("A Plan no target of this run finalizes is not this");
      expect(card.includes("In contract-scoped SDD, do not apply this Plan gate")).toBe(true);
      expect(
        card.includes(
          "halt to widen the Change Request to a spec-scoped run; do not authorize Plan writes",
        ),
      ).toBe(true);
      const profile = await read(tree, "assistant/manifest/review-profiles.yml");
      expect(profile).toContain("always_required: [completion-reviewer]");
    });
  }
});
