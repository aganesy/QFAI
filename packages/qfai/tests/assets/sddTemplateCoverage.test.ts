import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const roots = ["packages/qfai/assets/init/.qfai", ".qfai"];
const relative = "assistant/skill/qfai-sdd/templates/spec";

const read = (root: string, file: string): Promise<string> =>
  readFile(path.join(repoRoot, root, relative, file), "utf8");

describe("qfai-sdd story-tree templates", () => {
  for (const root of roots) {
    it(`${root}: carries the policy, flow, contract, and decision homes`, async () => {
      for (const file of [
        "decisions.md",
        "open-questions.md",
        "01_policy/objective.md",
        "01_policy/initiative.md",
        "01_policy/principle.md",
        "01_policy/glossary.md",
        "01_policy/constraint.md",
        "02_business-flow/business-flows.md",
        "02_business-flow/business-flow-NNNN/business-flow.md",
        "02_business-flow/business-flow-NNNN/user-stories.md",
        "03_contract/contracts.md",
        "03_contract/tech.md",
        "03_contract/structure.md",
      ]) {
        expect(await read(root, file), file).not.toBe("");
      }
    });

    it(`${root}: a story directory has exactly the three authorized files`, async () => {
      const storyDir = path.join(
        repoRoot,
        root,
        relative,
        "02_business-flow/business-flow-NNNN/user-story-NNNN-NNNN",
      );
      expect((await readdir(storyDir)).sort()).toEqual([
        "01_User-story.md",
        "02_Acceptance-Criteria.md",
        "03_Example.md",
      ]);
      expect(await read(root, "02_business-flow/business-flow-NNNN/business-flow.md")).toMatch(
        /\b(?:flowchart|sequenceDiagram)\b/,
      );
    });

    it(`${root}: decision tables use four cells and reserve status changes`, async () => {
      for (const file of ["decisions.md", "open-questions.md"]) {
        const template = await read(root, file);
        expect(template).toMatch(/^\| ID\s*\| Content\s*\| Approach\s*\| Status\s*\|$/m);
      }
    });
  }
});
