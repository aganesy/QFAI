/**
 * Integration: SDD Skill Spec-0013 TDD Backfill
 *
 * Validates that the /qfai-sdd skill (spec-0013) requirements are covered
 * by existing implementation: SKILL.md template and validator modules.
 *
 * All 10 TDD items are Exception-pattern backfill (DR-0013-0001).
 */
// QFAI:SPEC-0013:TC-0013-0001
// QFAI:SPEC-0013:TC-0013-0002
// QFAI:SPEC-0013:TC-0013-0003
// QFAI:SPEC-0013:TC-0013-0004
// QFAI:SPEC-0013:TC-0013-0005
// QFAI:SPEC-0013:TC-0013-0006
// QFAI:SPEC-0013:TC-0013-0007
// QFAI:SPEC-0013:TC-0013-0008
// QFAI:SPEC-0013:TC-0013-0009
// QFAI:SPEC-0013:TC-0013-0010
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
  "qfai-sdd",
  "SKILL.md",
);

// TC-0013-0001: Phase Order Enforcement
describe("TC-0013-0001: Phase Order Enforcement", () => {
  it("SKILL.md enforces Contracts-first -> Outline -> Slice -> Plan -> Delta", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/phase order/i);
    expect(content).toContain("Contracts-first");
    expect(content).toContain("Outline");
    expect(content).toContain("Slice");
    expect(content).toContain("Plan");
    expect(content).toContain("Delta");
  });
});

// TC-0013-0002: Contract Index Alignment
describe("TC-0013-0002: Contract Index Alignment", () => {
  it("SKILL.md requires Contract Index in _policies/05_Contracts.md", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("Contract Index");
    expect(content).toContain("05_Contracts.md");
  });
});

// TC-0013-0003: Usable-Source Preflight Stop
//
// Restated under CR-20260903-0001 (#1070). The old assertion was that SKILL.md
// contains the token `discussion-pack` and mentions preflight, which was true of
// a stage that stopped on any thin pack. The obligation is now the narrower one:
// an incomplete or contradictory pack continues, and only the absence of every
// source stops the stage. Both directions are asserted, because the token check
// would pass on a stage that had lost either half.
describe("TC-0013-0003: Usable-Source Preflight Stop", () => {
  it("SKILL.md stops Stage 0 only when no usable source exists", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/preflight/i);
    expect(content).toContain("Stop only when there is no usable source at all");
  });

  it("SKILL.md does not stop on an incomplete, contradictory or OQ-carrying pack", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain(
      "an incomplete pack, a contradictory one, or a blocking discussion OQ does not by itself stop this stage",
    );
    // And the pack is not the thing to repair when it is the source of the gap.
    expect(content).toContain("Do NOT edit, repair or re-run a pack");
  });
});

// TC-0013-0004: Slice Gate US->AC->BR->EX->TC
describe("TC-0013-0004: Slice Gate US->AC->BR->EX->TC", () => {
  it("SKILL.md defines slice gate with required edges", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/[Ss]lice gate/);
  });
});

// TC-0013-0005: Plan After Slice Gate
describe("TC-0013-0005: Plan After Slice Gate", () => {
  it("SKILL.md requires plan after slice gate pass", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/slice.*plan|Plan.*finalize/i);
  });
});

// TC-0013-0006: Reference Direction Enforcement
describe("TC-0013-0006: Reference Direction Enforcement", () => {
  it("SKILL.md enforces reference direction rules", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/[Rr]eference direction/);
    expect(content).toMatch(/lower-to-upper/);
  });
});

// TC-0013-0007: Validate Gate error=0
describe("TC-0013-0007: Validate Gate error=0", () => {
  it("SKILL.md requires qfai validate --profile sdd --fail-on error", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("qfai validate --profile sdd --fail-on error");
  });
});

// TC-0013-0008: Business Flow Mermaid
describe("TC-0013-0008: Business Flow Mermaid", () => {
  it("SKILL.md requires Mermaid in _policies/04_Business-Flow.md", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("04_Business-Flow.md");
    expect(content).toMatch(/[Mm]ermaid/);
  });
});

// TC-0013-0009: Delta Rejected Guardrails
describe("TC-0013-0009: Delta Rejected Guardrails", () => {
  it("SKILL.md defines Delta Rejected Guard", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("Delta Rejected Guard");
    expect(content).toMatch(/rejected/i);
  });
});

// TC-0013-0010: Coverage Placeholder for EX-0013-0005
describe("TC-0013-0010: Coverage Placeholder for EX-0013-0005", () => {
  it("SKILL.md is importable and defines SDD workflow", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("qfai-sdd");
  });
});
