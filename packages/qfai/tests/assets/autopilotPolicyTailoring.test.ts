import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, file: string): Promise<string> =>
  readFile(path.join(root, tree, file), "utf-8");

describe("autopilot choices cannot supply missing approval", () => {
  for (const tree of trees) {
    it(tree + ": SDD classifies its own decisions and stops for pending approval", async () => {
      const skill = await read(tree, "assistant/skill/qfai-sdd/SKILL.md");
      expect(skill).toContain("## Default Autopilot Policy");
      for (const bucket of ["auto-decide:", "ask-user:", "hard-required:"]) {
        expect(skill).toContain(bucket);
      }
      expect(skill).toContain("approval-required change operations");
      expect(skill).toContain("`--auto` asks no questions and never supplies its own approval");
      expect(skill).toContain("stop before the dependent write and report pending approvals");
    });

    it(tree + ": the shared rule keeps mandatory approvals outside the prompt budget", async () => {
      const baseline = await read(tree, "assistant/rule/shared-skill-operating-baseline.md");
      expect(baseline).toContain(
        "Mandatory approval questions and `hard-required` inputs are exempt from the budget",
      );
      expect(baseline).toContain("a missing `hard-required` input");
      expect(baseline).toContain("stop instead of guessing");
    });
  }
});
