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
    // QFAI:EX-0001-0205-04
    it(tree + ": SDD classifies its own decisions and stops for pending approval", async () => {
      const skill = await read(tree, "assistant/skill/qfai-sdd/SKILL.md");
      const triage = await read(tree, "assistant/skill/qfai-sdd/references/sdd-triage.md");
      // The skill adds its own inputs; the three buckets are the shared prototype's.
      const baseline = await read(tree, "assistant/rule/shared-skill-operating-baseline.md");
      expect(skill).toContain("## Default Autopilot Policy");
      expect(skill).toContain("hard-required:");
      expect(baseline).toContain("## Default Autopilot Policy (Shared)");
      for (const bucket of ["| `auto-decide`", "| `ask-user`", "| `hard-required`"]) {
        expect(baseline).toContain(bucket);
      }
      const step = await read(tree, "assistant/step/sdd-triage/STEP.md");
      expect(step).toContain("sdd-triage.md");
      expect(triage).toContain("CREATE, DELETE, SPLIT, MERGE, SUPERSEDE, and UPDATE:REMOVE");
      expect(triage).toContain("Do not self-approve");
      expect(triage).toContain("In --auto, ask no question, append no row");
      expect(triage).toContain("stop before the dependent writes");
      expect(triage).toContain("report every pending operation with its target");
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
