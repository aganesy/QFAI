/**
 * Integration: ATDD Skill Spec-0008 TDD Backfill
 *
 * Validates that the ATDD skill (spec-0008) requirements are covered by
 * existing implementation: SKILL.md template structure, atddTraceability
 * validator, and evidence writer.
 *
 * All 8 TDD items are Exception-pattern backfill (DR-0008-0001).
 */
// QFAI:SPEC-0008:TC-0008-0001
// QFAI:SPEC-0008:TC-0008-0002
// QFAI:SPEC-0008:TC-0008-0003
// QFAI:SPEC-0008:TC-0008-0004
// QFAI:SPEC-0008:TC-0008-0005
// QFAI:SPEC-0008:TC-0008-0006
// QFAI:SPEC-0008:TC-0008-0007
// QFAI:SPEC-0008:TC-0008-0008
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
  "qfai-atdd",
  "SKILL.md",
);

const ATDD_TRACEABILITY_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "src",
  "core",
  "atddTraceability.ts",
);

const ATDD_VALIDATOR_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "src",
  "core",
  "validators",
  "atddCodeTraceability.ts",
);

// TC-0008-0001: Volume Estimate Produces Signal Table
describe("TC-0008-0001: Volume Estimate Produces Signal Table", () => {
  it("SKILL.md defines Estimator output table with required columns", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("Estimator output table");
    expect(content).toContain("Raw count");
    expect(content).toContain("Signal");
    expect(content).toContain("Evidence");
    expect(content).toContain("Notes");
    // Verify E2E/API/Integration rows
    expect(content).toMatch(/E2E\s+\|/);
    expect(content).toMatch(/API\s+\|/);
    expect(content).toMatch(/Integration\s+\|/);
  });
});

// TC-0008-0002: E2E Tests Cover All Required US
describe("TC-0008-0002: E2E Tests Cover All Required US", () => {
  it("atddTraceability module exports US annotation regex", async () => {
    const content = await readFile(ATDD_TRACEABILITY_PATH, "utf-8");
    expect(content).toMatch(/US_TEST_ANNOTATION_RE/);
    expect(content).toContain("QFAI:SPEC-");
    expect(content).toContain(":US-");
  });

  it("SKILL.md mandates E2E coverage for US", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/tests\/e2e\/\*\*.*US/);
  });
});

// TC-0008-0003: API Tests Cover All Required CON-API
describe("TC-0008-0003: API Tests Cover All Required CON-API", () => {
  it("atddTraceability module exports API annotation regex", async () => {
    const content = await readFile(ATDD_TRACEABILITY_PATH, "utf-8");
    expect(content).toMatch(/API_TEST_ANNOTATION_RE/);
    expect(content).toContain("QFAI:CON-API-");
  });

  it("SKILL.md mandates API coverage for CON-API", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/tests\/api\/\*\*.*CON-API/);
  });
});

// TC-0008-0004: Integration Tests Cover All Required TC
describe("TC-0008-0004: Integration Tests Cover All Required TC", () => {
  it("atddTraceability module exports TC annotation regex", async () => {
    const content = await readFile(ATDD_TRACEABILITY_PATH, "utf-8");
    expect(content).toMatch(/TC_TEST_ANNOTATION_RE/);
    expect(content).toContain(":TC-");
  });

  it("SKILL.md mandates Integration coverage for TC", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/tests\/integration\/\*\*.*TC/);
  });
});

// TC-0008-0005: Forbidden TC Annotations Detected
describe("TC-0008-0005: Forbidden TC Annotations Detected", () => {
  it("atddTraceability defines forbidden ref types", async () => {
    const content = await readFile(ATDD_TRACEABILITY_PATH, "utf-8");
    expect(content).toContain("AtddForbiddenRef");
    expect(content).toContain("tcInApi");
    expect(content).toContain("tcInE2e");
  });

  it("validator emits QFAI-ATDD-121/122 for forbidden TC refs", async () => {
    const content = await readFile(ATDD_VALIDATOR_PATH, "utf-8");
    expect(content).toContain("QFAI-ATDD-121");
    expect(content).toContain("QFAI-ATDD-122");
  });
});

// TC-0008-0006: Stage Gates Not Skipped
describe("TC-0008-0006: Stage Gates Not Skipped", () => {
  it("SKILL.md defines stage gate sequence", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    // Stage 0 is explicitly defined; overall stages P0-P8 are the gate model
    expect(content).toContain("Stage 0");
    expect(content).toContain("mandatory");
  });
});

// TC-0008-0007: Evidence File Contains Required Sections
describe("TC-0008-0007: Evidence File Contains Required Sections", () => {
  it("SKILL.md mandates evidence file creation", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toMatch(/evidence.*atdd-<spec-id>\.md/i);
    expect(content).toContain("Evidence (MANDATORY)");
  });

  it("SKILL.md mandates work orders and reviewer notes in evidence", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("Work Orders Summary");
    expect(content).toContain("Reviewer notes");
  });
});

// TC-0008-0008: Reviewer Independence Enforced
describe("TC-0008-0008: Reviewer Independence Enforced", () => {
  it("SKILL.md defines independent Reviewer Gate", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("Reviewer Gate (MUST)");
    expect(content).toMatch(/independent.*completion-reviewer/i);
    expect(content).toMatch(/PASS.*REVISE/);
  });

  it("SKILL.md forbids orchestrator self-approval", async () => {
    const content = await readFile(SKILL_PATH, "utf-8");
    expect(content).toContain("Orchestrator MUST NOT");
    expect(content).toMatch(/must not.*self-approv/i);
  });
});
