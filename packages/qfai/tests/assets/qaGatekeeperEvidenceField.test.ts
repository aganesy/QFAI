/**
 * The completion gate requires a row-level `qa-gatekeeper` verdict, and the
 * shipped evidence contract said nothing about it.
 *
 * `missingCompletedEvidenceFields` puts the field among a completed row's
 * required ones, so an entry written to the contract as it stood failed
 * `QFAI-TDDLIST-008` with no way to read what the gate wanted. The two halves
 * are held together here: the gate asks for the field, and the contract the
 * author writes against defines it.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const SKILL = path.join(
  repoRoot,
  "packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/SKILL.md",
);
const VALIDATOR = path.join(repoRoot, "packages/qfai/src/core/validators/tddList.ts");

const GATE_COMPLETED_HEADING = "**Gate-completed (appended after items 7-8 return PASS):**";

describe("the qa-gatekeeper verdict the completion gate reads", () => {
  it("is defined where the author writes the entry", async () => {
    const skill = await readFile(SKILL, "utf-8");
    const start = skill.indexOf(GATE_COMPLETED_HEADING);
    expect(start, "the gate-completed half must exist to be checked").toBeGreaterThan(-1);
    const gateCompleted = skill.slice(start, skill.indexOf("### Evidence hard rules", start));

    // Where it is defined is the point: a field named only in the
    // phase-authored half would be owed before the reviews, and the gate
    // appends this one after them.
    expect(gateCompleted, "the contract must define the field").toContain("- `qa-gatekeeper` —");
    expect(gateCompleted, "and the one value it takes").toContain("`PASS` is the only value");
    expect(gateCompleted, "and that it answers for the row rather than a round").toContain(
      "takes no `Round N:` prefix",
    );
  });

  it("is still a field the gate requires", async () => {
    // The other half of the agreement. Without this the contract could keep
    // describing a field nothing asks for, which reads the same to an author
    // and is the opposite defect.
    const validator = await readFile(VALIDATOR, "utf-8");

    expect(validator, "the gate must still require the field").toMatch(
      /requiredRowFields[\s\S]{0,600}"qa-gatekeeper"/,
    );
  });
});
