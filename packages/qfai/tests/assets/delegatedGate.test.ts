import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { flat, sectionOf } from "../helpers/shippedAssistant.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

describe("a gate the project runs in CI only is recorded as delegated", () => {
  for (const tree of TREES) {
    // QFAI:EX-0001-0091-03
    it(`${tree}: determines applicability before commands and retains UNRUN for a missing required command`, async () => {
      const [gateRun, repoGate] = await Promise.all([
        read(tree, "assistant/step/common-gate-run/STEP.md"),
        read(tree, "assistant/step/verify-repo-gate/STEP.md"),
      ]);
      const instructions = flat(gateRun);
      const firstProcedureStep = flat(sectionOf(repoGate, "## Procedure").split(/\n2\. /)[0] ?? "");

      expect(instructions).toMatch(
        /\b(?:determine|select|decide|establish)\b.*\b(?:applicable gates|gate applicability|gates apply)\b.*\bbefore\b.*\bcommands?\b/i,
      );
      expect(instructions).toMatch(/\bstage\b.*\bscope\b/i);
      expect(instructions).toMatch(/\bproject(?:'s)? declared scope\b/i);
      expect(instructions).toMatch(/\b(?:not|never|do not)\b.*\b(?:diff|changed files)\b/i);
      expect(firstProcedureStep).toMatch(/\b(?:applicable|applicability)\b/i);
      expect(gateRun).toContain("Build");
      expect(gateRun).toContain("Pack / distribution");
      expect(instructions).toMatch(
        /\b(?:false|not applicable)\b.*\b(?:omit|exclude|leave out|do not add)\b.*\bgates\b/i,
      );
      expect(instructions).toMatch(/\breason\b.*\bstage report\b|\bstage report\b.*\breason\b/i);
      expect(instructions).toMatch(
        /\b(?:required gate|gate is required)\b.*\b(?:missing|absent)\b.*\bUNRUN\b|\b(?:missing|absent)\b.*\brequired\b.*\bUNRUN\b/i,
      );
    });

    // QFAI:EX-0001-0225-07
    // QFAI:EX-0001-0225-08
    it(`${tree}: writes the contract's verdict while reporting pending CI without a completion claim`, async () => {
      const [repoGate, contract] = await Promise.all([
        read(tree, "assistant/step/verify-repo-gate/STEP.md"),
        read(tree, "assistant/skill/qfai-verify/references/verify-output-contract.md"),
      ]);
      const verdict = flat(sectionOf(repoGate, "## Verdict"));
      const report = flat(sectionOf(repoGate, "## Report"));

      expect(verdict).toMatch(/\b(?:passed|PASS)\b.*\bDELEGATED\b.*\b(?:not red|non-red)\b/i);
      expect(report).toMatch(/\bDELEGATED\b.*`check`.*`ci`/i);
      expect(report).toMatch(/\bpending\b.*\bsummary\b|\bsummary\b.*\bpending\b/i);
      expect(report).toMatch(/\b(?:not|never|do not)\b.*\b(?:complete|completed|completion)\b/i);
      expect(flat(contract)).toMatch(/\bdelegated\b.*\bCI check\b.*\bnot red\b/i);
      expect(flat(contract)).toMatch(/"red".*`status`.*"FAIL"/);
      expect(flat(contract)).toMatch(/"pending".*\bdoes not\b.*`summary`/);
      expect(flat(contract)).toMatch(/\bdid not run\b.*\bnot delegated\b.*"FAIL"/);
      const gateStatusRow = contract
        .split("\n")
        .find((line) => line.startsWith("| `status`") && line.includes('"UNRUN"'));
      expect(
        gateStatusRow
          ?.split("|")[3]
          ?.split(".")[0]
          ?.match(/"[A-Z]+"/g),
      ).toEqual(['"PASS"', '"FAIL"', '"UNRUN"', '"DELEGATED"']);
    });

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
