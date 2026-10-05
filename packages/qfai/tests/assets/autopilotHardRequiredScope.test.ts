import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { parseContractRules } from "../../src/core/storyTree/contractRules.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, file: string): Promise<string> =>
  readFile(path.join(root, tree, file), "utf-8");

describe("autopilot inputs follow story-tree and UI-contract scope", () => {
  for (const tree of trees) {
    it(tree + ": SDD requires a usable source and an affected flow", async () => {
      const skill = await read(tree, "assistant/skill/qfai-sdd/SKILL.md");
      const triage = await read(tree, "assistant/step/sdd-triage/STEP.md");
      expect(triage).toContain("With no argument, triage all incoming requirements");
      expect(skill).toContain("hard-required: a usable requirement source");
      expect(skill).toContain(
        "an identifiable affected flow or an explicit decision to create one",
      );
      expect(skill).toContain("product brand intent when a root `DESIGN.md` is required");
      // `--auto` answers no approval: the shared baseline states it for every skill.
      const baseline = await read(tree, "assistant/rule/shared-skill-operating-baseline.md");
      expect(baseline).toContain("`--auto` satisfies nothing");
    });

    it(tree + ": prototyping selects a full UI contract identity", async () => {
      const skill = await read(tree, "assistant/skill/qfai-prototyping/SKILL.md");
      expect(skill).toContain("prototyping.primaryUiContract");
      expect(skill).toContain("UI-NNNN");
      expect(skill).not.toContain("primarySpecId");
    });

    it(tree + ": verify asks only for the scope inputs it consumes", async () => {
      const skill = await read(tree, "assistant/skill/qfai-verify/SKILL.md");
      expect(skill).toContain("a full `UI-NNNN` when a prototyping-scoped run");
      expect(skill).toContain("a usable story source when a flow-scoped run");
      expect(skill).toContain("an affected `BF-NNNN` when a flow-scoped run");
      expect(skill).not.toContain("primarySpecId");
    });
  }

  it("the prototyping contract accepts only a full primary UI contract ID", async () => {
    const file = path.join(root, ".qfai/spec/03_contract/cli/cli-0011-qfai-prototyping.md");
    const { rules } = parseContractRules(file, await readFile(file, "utf-8"));
    const pin = rules.find(({ statement }) =>
      statement.includes("The primary UI contract is pinned by `prototyping.primaryUiContract`"),
    );
    expect(pin?.statement).toContain("Both accept only the full `UI-NNNN` form");
    expect(pin?.statement).toContain("no value is normalised");
  });
});
