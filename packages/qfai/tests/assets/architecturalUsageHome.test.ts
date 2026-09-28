import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];

describe("architectural rules have one story-tree home", () => {
  for (const tree of trees) {
    it(`${tree}: technical constraints and quality commands are owned by tech.md`, async () => {
      const step = await readFile(
        path.join(root, tree, "assistant/step/sdd-flow/STEP.md"),
        "utf-8",
      );
      const skill = step.replace(/\s+/g, " ");
      const template = await readFile(
        path.join(root, tree, "assistant/skill/qfai-sdd/templates/spec/03_contract/tech.md"),
        "utf-8",
      );
      expect(skill).toContain("`03_contract/tech.md`");
      expect(skill).toContain("Standard commands section of `tech.md`");
      expect(template).toContain("## Standard commands (copy-paste)");
      expect(skill).not.toContain("templates/specs/spec/10_Plan.md");
    });

    // QFAI:EX-0001-0006-08
    it(`${tree}: architecture boundaries are the layers of tech.md`, async () => {
      const read = async (relative: string): Promise<string> =>
        (await readFile(path.join(root, tree, "assistant", relative), "utf-8")).replace(
          /\s+/g,
          " ",
        );
      const LAYERS = "`## Architecture` table of `<paths.contractsDir>/tech.md`";

      const constitution = await read("rule/constitution.md");
      expect(constitution).toContain(
        "architecture boundaries (the `## Architecture` layers of `<paths.contractsDir>/tech.md`",
      );
      expect(constitution).not.toMatch(/architecture boundaries \([^)]*constraint\.md/);

      const rules = await read("skill/qfai-sdd/references/spec-traceability-rules.md");
      expect(rules).toContain(
        "| Written from | The technical decisions the discussion pack records",
      );
      expect(rules).toContain("| Read by | `/qfai-implement`, to place new code");
      expect(rules).toContain("imports only from the layers its row lists");
      expect(await read("step/sdd-flow/STEP.md")).toContain(
        "a layer boundary never goes to `constraint.md`",
      );
      expect(await read("skill/qfai-sdd/references/sdd-execution-playbook.md")).toContain(
        "A layer boundary is a row of tech.md `## Architecture`",
      );
      expect(await read("skill/qfai-configure/SKILL.md")).toContain(
        "Fill `## Architecture` of `03_contract/tech.md` from the codebase",
      );
      expect(await read("step/implement-tdd/STEP.md")).toContain(
        "import only from the layers that layer's row lists",
      );
      for (const card of [
        "architecture-reviewer",
        "implementation-reviewer",
        "backend-engineer",
        "frontend-engineer",
      ]) {
        expect(await read(`agent/${card}.md`), card).toContain(LAYERS);
      }
    });
  }
});
