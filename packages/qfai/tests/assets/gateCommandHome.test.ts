import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

describe("the story-tree contract owns quality-gate commands", () => {
  for (const tree of TREES) {
    it(`${tree}: configure, the shared rule and the gate step name the same Standard commands home`, async () => {
      const configure = await read(tree, "assistant/skill/qfai-configure/SKILL.md");
      const baseline = await read(tree, "assistant/rule/shared-skill-operating-baseline.md");
      const gateRun = await read(tree, "assistant/step/common-gate-run/STEP.md");
      const quality = await read(tree, "assistant/rule/quality.md");
      expect(configure).toContain("03_contract/tech.md#standard-commands-copy-paste");
      expect(baseline).toContain(
        "`<paths.contractsDir>/tech.md#standard-commands-copy-paste`. The directory comes",
      );
      expect(baseline).toContain("**A capability with no entry is UNRUN, not passed.**");
      expect(gateRun).toContain("`<paths.contractsDir>/tech.md#standard-commands-copy-paste`");
      expect(gateRun).toContain("shared-skill-operating-baseline.md#standard-commands-mandatory");
      expect(quality).toContain("<paths.specsDir>/03_contract/tech.md");
      for (const content of [configure, baseline, gateRun, quality]) {
        expect(content).not.toContain(".qfai/assistant/catalog/tech.md");
      }
    });

    // QFAI:EX-0001-0156-01
    // QFAI:EX-0001-0156-03
    it(`${tree}: custom Validate commands keep the full scan and cannot pass validation errors`, async () => {
      const qfaiGate = await read(tree, "assistant/step/verify-qfai-gate/STEP.md");
      const repoGate = await read(tree, "assistant/step/verify-repo-gate/STEP.md");
      const flat = (text: string): string => text.replace(/\s+/g, " ");
      expect(flat(qfaiGate)).toContain("the project's `Validate` entry, where it has one");
      expect(flat(qfaiGate)).toMatch(/full scan in the declared profile/i);
      expect(flat(qfaiGate)).toMatch(/any validation error prevents a pass/i);
      expect(flat(qfaiGate)).toMatch(/successful wrapper exit does not waive a validation error/i);
      expect(flat(repoGate)).toMatch(/a PASS needs zero errors in the declared profile/i);
      expect(flat(repoGate)).toMatch(
        /wrapper does not waive validation errors or replace a full scan/i,
      );
      for (const step of [qfaiGate, repoGate]) {
        expect(step).not.toMatch(/ratchet|recorded backlog/i);
      }
    });
  }

  it("this repository's Validate entry fails on any error of the full profile", async () => {
    const tech = await readFile(path.join(repoRoot, ".qfai/spec/03_contract/tech.md"), "utf-8");
    expect(tech).toContain(
      "- Validate: `pnpm build && node packages/qfai/dist/cli/index.mjs validate --profile full --fail-on error",
    );
  });
});
