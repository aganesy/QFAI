import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const roots = ["packages/qfai/assets/init/.qfai/assistant", ".qfai/assistant"];
const sdd = "skill/qfai-sdd";

const read = (root: string, relative: string): Promise<string> =>
  readFile(path.join(repoRoot, root, sdd, relative), "utf8");

describe("per-flow SDD evidence", () => {
  for (const root of roots) {
    it(`${root}: the skill, evidence, and DB rule agree on the BF scope`, async () => {
      const [skill, evidence, contractRules] = await Promise.all([
        read(root, "SKILL.md"),
        read(root, "templates/evidence/sdd-flow.md"),
        read(root, "references/contract-artifact-rules.md"),
      ]);

      expect(skill).toContain(".qfai/evidence/sdd-BF-NNNN.md");
      expect(skill).toContain("--flow BF-NNNN");
      expect(evidence).toContain(".qfai/evidence/sdd-BF-NNNN.md");
      expect(evidence).toContain("## Contract executability");
      expect(evidence).toContain("## Reviewer results");
      expect(evidence).toContain("--flow BF-NNNN");
      expect(contractRules).toContain(
        "`## Contract executability` heading of `templates/evidence/sdd-flow.md`",
      );
      expect(contractRules).toContain(".qfai/evidence/sdd-BF-NNNN.md");
      expect(contractRules).toContain("every declared write path driven twice");
      expect(skill + evidence + contractRules).not.toContain("sdd-spec.md");
      expect(skill + evidence + contractRules).not.toContain("sdd-batch.md");
    });
  }
});
