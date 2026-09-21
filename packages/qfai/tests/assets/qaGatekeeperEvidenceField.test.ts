/**
 * The completion gate requires a row-level `qa-gatekeeper` verdict, and no
 * shipped text defined it.
 *
 * `missingCompletedEvidenceFields` puts the field among a completed row's
 * required ones, so an entry written to the contract as it stood failed
 * `QFAI-TDDLIST-008` with no way to read what the gate wanted. The two halves
 * are held together here: the gate asks for the field, and the reference an
 * author is sent to defines it.
 *
 * The definition is in `round-evidence.md` rather than in the skill's own
 * contract list because that file is at its line budget — `qfai-implement`
 * ships at the ceiling `ASSISTANT_ASSET_MAX_LINES` sets, so a new bullet there
 * fails the budget rather than the reader. The reference is where round versus
 * row scope is already settled, which is the question this field raises.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const SKILL_DIR = "packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement";
const SKILL = path.join(repoRoot, SKILL_DIR, "SKILL.md");
const ROUND_EVIDENCE = path.join(repoRoot, SKILL_DIR, "references/round-evidence.md");
const VALIDATOR = path.join(repoRoot, "packages/qfai/src/core/validators/tddList.ts");

describe("the qa-gatekeeper verdict the completion gate reads", () => {
  it("is defined where round and row scope are settled", async () => {
    const reference = await readFile(ROUND_EVIDENCE, "utf-8");

    expect(reference, "the reference must define the field").toContain(
      "## The row-level `qa-gatekeeper` verdict",
    );
    expect(reference, "and the one value it takes").toContain("`PASS` is the only value it takes");
    expect(reference, "and that it carries no round prefix").toContain(
      "takes no `Round N:` prefix",
    );
    expect(reference, "and the two gates it summarises").toContain("items 3 and 5 of the twelve");
  });

  it("is named where an author reads the row-level fields", async () => {
    // The contract lists the fields; a field it does not name is one an author
    // has no reason to look for.
    const skill = await readFile(SKILL, "utf-8");

    expect(skill, "the contract must name it among the row-level fields").toMatch(
      /The \*\*row-level\*\* fields do not: `TDD-ID`, `TC-ref` and the `qa-gatekeeper` verdict/,
    );
  });

  it("is still a field the gate requires", async () => {
    // The other half of the agreement. Without this the reference could keep
    // describing a field nothing asks for, which reads the same to an author
    // and is the opposite defect.
    const validator = await readFile(VALIDATOR, "utf-8");

    expect(validator, "the gate must still require the field").toMatch(
      /requiredRowFields[\s\S]{0,600}"qa-gatekeeper"/,
    );
  });
});
