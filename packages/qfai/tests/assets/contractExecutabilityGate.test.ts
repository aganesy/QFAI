/**
 * The SDD gate covers Phase 0's own output (#384).
 *
 * `sdd-quality-gate.md` — the file `qfai-sdd/SKILL.md` calls "the full
 * checklist" — contained the string `contract` zero times, so the mandatory
 * Phase 0 output was the one artifact class the skill's own quality gate was
 * silent about.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const SDD = "assistant/skills/qfai-sdd/references";
const GATE = `${SDD}/sdd-quality-gate.md`;
const RULES = `${SDD}/contract-artifact-rules.md`;

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

describe("DB contracts carry an executability obligation", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the rule requires apply plus two traversals`, async () => {
      const rules = flat(await read(tree, RULES));

      expect(rules).toContain("## Executability (MUST)");
      expect(rules).toContain("**Apply every `db/` contract to a scratch database.**");
      expect(rules).toContain("**Drive every declared write path at least twice.**");
      // A single pass proves the first insert and nothing after it — three of
      // six known defects in the field appeared only on traversal two.
      expect(rules).toContain(
        "The second traversal is what exercises head-advance and expected-version guards",
      );
    });

    it(`${tree}: applying cleanly is stated as the floor, not the gate`, async () => {
      const rules = flat(await read(tree, RULES));

      // Eight contracts applied cleanly to a scratch database and still had
      // eight unreachable write paths — an apply-only suite is not a gate.
      expect(rules).toContain("Applying cleanly is the floor, not the gate");
      expect(rules).toContain(
        "the failure is a resolution error inside a PL/pgSQL body, not a syntax error",
      );
    });

    it(`${tree}: the record has a stated shape and a rule id`, async () => {
      const rules = await read(tree, RULES);

      expect(rules).toContain(".qfai/evidence/sdd-<spec-id>.md");
      expect(rules).toContain(
        "- Executability: CON-DB-NNNN — applied to scratch DB; every declared write path driven twice; <command> / <result>",
      );
      expect(flat(rules)).toContain(
        "`QFAI-CONTRACT-031` (`warning`) reports a `db/` contract with no such line",
      );
      expect(flat(rules)).toContain("It is a **presence check**");
    });

    it(`${tree}: the rule says when the skipped cost is paid`, async () => {
      const rules = flat(await read(tree, RULES));

      expect(rules).toContain("The cost of skipping this is not paid in Phase 0.");
      expect(rules).toContain(
        "by an implementer who is forbidden from fixing the contract and has to stop the batch",
      );
    });

    it(`${tree}: the checklist carries it`, async () => {
      const rules = flat(await read(tree, RULES));

      expect(rules).toContain(
        "Every `db/` contract has been applied to a scratch database and every declared write path driven **at least twice**",
      );
    });

    it(`${tree}: the quality gate is no longer silent about contracts`, async () => {
      const gate = await read(tree, GATE);

      expect(gate).toContain("## Contract Checks");
      expect(flat(gate)).toContain(
        "Phase 0 is a mandatory output of this skill, so its own artifacts belong on this page.",
      );
      expect(flat(gate)).toContain("**driven at least twice**");
      expect(gate).toContain("`QFAI-CONTRACT-031`");
      expect(gate).toContain("references/contract-artifact-rules.md#executability-must");
      // The original finding, restated as a guard.
      expect(gate.toLowerCase()).toContain("contract");
    });
  }
});
