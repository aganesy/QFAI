import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(root, tree, rel), "utf-8");
const template = "assistant/skill/qfai-sdd/templates/spec";

describe.each(trees)("%s story-tree required files", (tree) => {
  it("ships the flow, story, acceptance criterion and example templates", async () => {
    const files = [
      "02_business-flow/business-flows.md",
      "02_business-flow/business-flow-NNNN/business-flow.md",
      "02_business-flow/business-flow-NNNN/user-stories.md",
      "02_business-flow/business-flow-NNNN/user-story-NNNN-NNNN/01_User-story.md",
      "02_business-flow/business-flow-NNNN/user-story-NNNN-NNNN/02_Acceptance-Criteria.md",
      "02_business-flow/business-flow-NNNN/user-story-NNNN-NNNN/03_Example.md",
    ];
    for (const file of files) {
      expect((await read(tree, `${template}/${file}`)).trim().length, file).toBeGreaterThan(0);
    }
  });

  it("keeps the decision and question registers in the same template tree", async () => {
    for (const file of ["decisions.md", "open-questions.md"]) {
      const content = await read(tree, `${template}/${file}`);
      expect(content).toContain("ID");
      expect(content).toContain("Content");
      expect(content).toContain("Approach");
      expect(content).toContain("Status");
    }
  });

  it("makes the SDD skill point to the shipped story templates", async () => {
    const skill = await read(tree, "assistant/skill/qfai-sdd/SKILL.md");
    expect(skill).toContain("business-flow-NNNN/business-flow.md");
    expect(skill).toContain("01_User-story.md");
    expect(skill).toContain("02_Acceptance-Criteria.md");
    expect(skill).toContain("03_Example.md");
    expect(skill).toContain("Use the paired template under `templates/spec/`");
    expect(skill).toContain("Do not create another document inside a story directory");
  });
});
