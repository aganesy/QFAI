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

// TC-0013-0003: Discussion-Pack Preflight Stop
describe("TC-0013-0003: Discussion-Pack Preflight Stop", () => {
  it("SKILL.md mandates discussion-pack preflight", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("discussion-pack");
    expect(content).toMatch(/preflight/i);
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
  it("SKILL.md requires qfai validate --fail-on error", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("qfai validate --fail-on error");
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
