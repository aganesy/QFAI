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

    it(`${tree}: the gate steps run the project's Validate entry and accept a recorded backlog`, async () => {
      const qfaiGate = await read(tree, "assistant/step/verify-qfai-gate/STEP.md");
      const repoGate = await read(tree, "assistant/step/verify-repo-gate/STEP.md");
      const flat = (text: string): string => text.replace(/\s+/g, " ");
      expect(flat(qfaiGate)).toContain("the project's `Validate` entry, where it has one");
      expect(qfaiGate).toContain("## A recorded backlog");
      expect(flat(qfaiGate)).toContain("The ratchet is not a waiver");
      expect(flat(repoGate)).toContain("errors only within the project's recorded backlog");
    });
  }

  it("this repository's Validate entry runs the dogfood ratchet", async () => {
    const tech = await readFile(path.join(repoRoot, ".qfai/spec/03_contract/tech.md"), "utf-8");
    expect(tech).toContain("- Validate: `pnpm build && node scripts/check-dogfood-backlog.mjs");
  });
});
