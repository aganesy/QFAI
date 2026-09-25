import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];

describe("architectural rules have one story-tree home", () => {
  for (const tree of trees) {
    it(`${tree}: technical constraints and quality commands are owned by tech.md`, async () => {
      const skill = await readFile(
        path.join(root, tree, "assistant/skill/qfai-sdd/SKILL.md"),
        "utf-8",
      );
      const template = await readFile(
        path.join(root, tree, "assistant/skill/qfai-sdd/templates/spec/03_contract/tech.md"),
        "utf-8",
      );
      expect(skill).toContain("`03_contract/tech.md`");
      expect(skill).toContain("Standard commands section of `tech.md`");
      expect(template).toContain("## Standard commands (copy-paste)");
      expect(skill).not.toContain("templates/specs/spec/10_Plan.md");
    });
  }
});
