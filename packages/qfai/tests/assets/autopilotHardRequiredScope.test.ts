import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, file: string): Promise<string> =>
  readFile(path.join(root, tree, file), "utf-8");

describe("autopilot inputs follow story-tree and UI-contract scope", () => {
  for (const tree of trees) {
    it(tree + ": SDD requires a usable source and an affected flow", async () => {
      const skill = await read(tree, "assistant/skill/qfai-sdd/SKILL.md");
      expect(skill).toContain("With no argument, triage all incoming requirements");
      expect(skill).toContain("hard-required: a usable requirement source");
      expect(skill).toContain(
        "an identifiable affected flow or an explicit decision to create one",
      );
      expect(skill).toContain("product brand intent when a visual design lock is required");
      expect(skill).toContain("In `--auto`, leave these pending without asking or self-approving");
    });

    it(tree + ": prototyping selects a full UI contract identity", async () => {
      const skill = await read(tree, "assistant/skill/qfai-prototyping/SKILL.md");
      expect(skill).toContain("--primary-ui-contract <CON-UI-NNNN>");
      expect(skill).toContain("CON-UI-NNNN");
      expect(skill).not.toContain("primarySpecId");
    });

    it(tree + ": verify asks only for the scope inputs it consumes", async () => {
      const skill = await read(tree, "assistant/skill/qfai-verify/SKILL.md");
      expect(skill).toContain("a full `CON-UI-NNNN` when a prototyping-scoped run");
      expect(skill).toContain("a usable story source when a flow-scoped run");
      expect(skill).toContain("an affected `BF-NNNN` when a flow-scoped run");
      expect(skill).not.toContain("primarySpecId");
    });
  }

  it("the CLI contract rejects a bare primary UI contract ID", async () => {
    const contract = await readFile(
      path.join(root, ".qfai/spec/03_contract/cli/qfai-prototyping.md"),
      "utf-8",
    );
    expect(contract).toContain("`--primary-ui-contract` flag");
    expect(contract).toContain("Both MUST accept only the full `CON-UI-NNNN` form");
    expect(contract).toContain("a bare `NNNN` included");
    expect(contract).toContain("No input is normalised");
  });
});
