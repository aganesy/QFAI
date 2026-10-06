import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

describe("a gate the project runs in CI only is recorded as delegated", () => {
  for (const tree of TREES) {
    it(`${tree}: the gate step, the repository gate, the commit step and the contract agree`, async () => {
      const gateRun = await read(tree, "assistant/step/common-gate-run/STEP.md");
      const repoGate = await read(tree, "assistant/step/verify-repo-gate/STEP.md");
      const commit = await read(tree, "assistant/step/verify-commit/STEP.md");
      const contract = await read(
        tree,
        "assistant/skill/qfai-verify/references/verify-output-contract.md",
      );

      expect(gateRun).toContain("`CI only: <check name>`");
      expect(gateRun).toMatch(/\| `DELEGATED` \| The project runs the gate in CI only/);
      expect(repoGate).toContain("`CI only: <check name>`");
      expect(repoGate).toContain("recorded DELEGATED with its CI check");
      expect(commit).toContain("recorded `DELEGATED` does not stop the commit");
      expect(contract).toContain('recorded `"DELEGATED"` with its `check` and `ci`');
      expect(contract).toContain('A `"red"` check makes the top-level `status` `"FAIL"`');
    });
  }
});
