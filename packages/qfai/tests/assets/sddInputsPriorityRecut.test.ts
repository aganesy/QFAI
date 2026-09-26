import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];

describe("qfai-sdd reads the current assistant tree", () => {
  for (const tree of trees) {
    it(`${tree}: the classification and decomposition references resolve`, async () => {
      const assistant = path.join(repoRoot, tree, "assistant");
      const skill = await readFile(path.join(assistant, "skill", "qfai-sdd", "SKILL.md"), "utf-8");
      expect(skill).toContain(".qfai/assistant/rule/change-classification.md");
      expect(skill).toContain("references/requirements-decomposition.md");
      await access(path.join(assistant, "rule", "change-classification.md"));
      await access(
        path.join(assistant, "skill", "qfai-sdd", "references", "requirements-decomposition.md"),
      );
      expect(skill).not.toContain(".qfai/assistant/constitution/change-classification.md");
      expect(skill).not.toContain("assistant/skills/");
    });
  }
});
