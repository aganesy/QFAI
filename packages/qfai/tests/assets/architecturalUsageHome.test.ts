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
      expect(plan).toContain("Shared code still waits for its third actual caller");
      expect(plan).toContain("documentation references do not prove three callers");
    });

    it(`${tree}: SDD reports failed document checks before implementation`, async () => {
      const skill = await read(tree, `${SKILL}/SKILL.md`);
      expect(skill).toContain("templates/specs/spec/10_Plan.md#implementation-approach");
      expect(skill).toContain("Report missing or insufficient usage references as findings");
      expect(skill).toContain("stop before implementation");
    });

    it(`${tree}: the required completion reviewer reads and enforces the check`, async () => {
      const card = await read(tree, "assistant/agents/completion-reviewer.md");
      expect(card).toContain("10_Plan.md#implementation-approach");
      expect(card).toContain("return REVISE for missing or insufficient usage references");
      expect(card).toContain("unless the documented safety-floor exception applies");
      expect(card).toContain(
        "On SDD cycles, read `.qfai/specs/spec-*/10_Plan.md` and its referenced usages",
      );
      const profile = await read(tree, "assistant/manifest/review-profiles.yml");
      expect(profile).toContain("always_required: [completion-reviewer]");
    });
  }
});
