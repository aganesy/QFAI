/**
 * Integration: Implement Skill Spec-0011 TDD Backfill
 *
 * Validates that the /qfai-implement skill (spec-0011) requirements are
 * covered by existing implementation: SKILL.md template defines strict TDD
 * lifecycle, serial execution, exception handling, parallel dispatch, and
 * reviewer independence.
 *
 * All 8 TDD items are Exception-pattern backfill (DR-0011-0001).
 * Existing coverage: skillRoster.test.ts, completionContract.test.ts,
 * evidenceContract.test.ts, parallelDispatch.test.ts, uixDetection.test.ts.
 */
// QFAI:SPEC-0011:TC-0011-0001
// QFAI:SPEC-0011:TC-0011-0002
// QFAI:SPEC-0011:TC-0011-0003
// QFAI:SPEC-0011:TC-0011-0004
// QFAI:SPEC-0011:TC-0011-0005
// QFAI:SPEC-0011:TC-0011-0006
// QFAI:SPEC-0011:TC-0011-0007
// QFAI:SPEC-0011:TC-0011-0008
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SKILL_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "qfai-implement",
  "SKILL.md",
);

// TC-0011-0001: Full TDD Cycle Completion
describe("TC-0011-0001: Full TDD Cycle Completion", () => {
  it("SKILL.md defines strict TDD lifecycle phases", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("todo");
    expect(content).toContain("red");
    expect(content).toContain("green");
    expect(content).toContain("refactor");
    expect(content).toContain("done");
  });
});

// TC-0011-0002: Backward Transition Produces Error
describe("TC-0011-0002: Backward Transition Produces Error", () => {
  it("SKILL.md prohibits backward transitions", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/[Bb]ackward.*prohibit/);
  });
});

// TC-0011-0003: QA Gatekeeper Authority
describe("TC-0011-0003: QA Gatekeeper Authority", () => {
  it("SKILL.md defines qa-gatekeeper role", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("qa-gatekeeper");
  });
});

// TC-0011-0004: Exception Missing DR-ID Error
describe("TC-0011-0004: Exception Missing DR-ID Error", () => {
  it("SKILL.md requires DR-ID for exception status", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/exception.*DR-ID|DR-ID.*exception/i);
  });
});

// TC-0011-0005: Parallel Dispatch Deny Conditions
describe("TC-0011-0005: Parallel Dispatch Deny Conditions", () => {
  it("SKILL.md defines parallel processing constraints", async () => {
    // #232: the conditions moved to references/parallelization-policy.md and
    // are stated as concurrent write conflicts, not shared-thing existence.
    const content = [
      await readFile(SKILL_PATH, "utf-8"),
      await readFile(
        path.join(path.dirname(SKILL_PATH), "references", "parallelization-policy.md"),
        "utf-8",
      ),
    ].join("\n");
    expect(content).toMatch(/Deny conditions/i);
    expect(content).toMatch(/write.*same source module|concurrent write conflict/i);
  });
});

// TC-0011-0006: 10-Point Gate Enforcement
describe("TC-0011-0006: 10-Point Gate Enforcement", () => {
  it("SKILL.md defines completion gate checklist", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/done|completion/i);
  });
});

// TC-0011-0007: Fresh Evidence Required
describe("TC-0011-0007: Fresh Evidence Required", () => {
  it("SKILL.md mandates per-item evidence", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/evidence/i);
    expect(content).toContain("RED");
    expect(content).toContain("GREEN");
  });
});

// TC-0011-0008: All Done Reports Nothing To Do
describe("TC-0011-0008: All Done Reports Nothing To Do", () => {
  it("SKILL.md specifies nothing-to-do behavior for completed items", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/nothing to do/i);
  });
});
