/**
 * qfai-prototyping SKILL.md v1.7.16 unit tests — spec-0012
 *
 * QFAI:SPEC-0012:TC-0012-0285
 * QFAI:SPEC-0012:TC-0012-0289
 * QFAI:SPEC-0012:TC-0012-0292
 * QFAI:SPEC-0012:TC-0012-0293
 * QFAI:SPEC-0012:TC-0012-0296
 * QFAI:SPEC-0012:TC-0012-0297
 * QFAI:SPEC-0012:TC-0012-0298
 *
 * All tests are documentation-layer assertions: they verify that the
 * SKILL.md asset declares the required structural content.
 */

import path from "node:path";
import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const SKILL_BASE = path.resolve(
  import.meta.dirname,
  "../../assets/init/.qfai/assistant/skills/qfai-prototyping",
);

async function readSkillMd(): Promise<string> {
  return readFile(path.join(SKILL_BASE, "SKILL.md"), "utf-8");
}

// ─── TC-0012-0285: Delegation Scope Table 4 categories ───────────────────────

describe("TC-0012-0285 — Delegation Scope Table has 4 categories", () => {
  // QFAI:SPEC-0012:TC-0012-0285
  it("SKILL.md Delegation Scope Table contains 4 required categories with correct roles", async () => {
    const content = await readSkillMd();

    // Table header present
    expect(content).toMatch(/Delegation Scope Table/i);

    // 4 required categories
    expect(content).toContain("UI implementation");
    expect(content).toContain("Screenshot capture");
    expect(content).toContain("Evaluation L1-L2");
    expect(content).toContain("Build");

    // Required roles present in the table
    expect(content).toContain("frontend-engineer");
    expect(content).toContain("devops-ci-engineer");
    expect(content).toContain("product-surface-reviewer");
    expect(content).toContain("product-experience-architect");

    // Violation detection narrative present
    expect(content).toMatch(/violation|undefined.*role/i);
  });
});

// ─── TC-0012-0289: Step 0 executionPlan documented ───────────────────────────

describe("TC-0012-0289 — Step 0 executionPlan documented in SKILL.md", () => {
  // QFAI:SPEC-0012:TC-0012-0289
  it("SKILL.md Required Process declares Step 0 with executionPlan fields", async () => {
    const content = await readSkillMd();

    // Step 0 header present
    expect(content).toMatch(/Step 0/i);

    // executionPlan fields enumerated
    expect(content).toContain("targetIterations");
    expect(content).toContain("evaluationAxesSource");
    expect(content).toContain("delegationMap");
    expect(content).toContain("plannedAt");
  });
});

// ─── TC-0012-0292: capture-screenshots.js reference ──────────────────────────

describe("TC-0012-0292 — SKILL.md references capture-screenshots.js", () => {
  // QFAI:SPEC-0012:TC-0012-0292
  it("SKILL.md Capture step references capture-screenshots.js", async () => {
    const content = await readSkillMd();
    expect(content).toContain("capture-screenshots.js");
  });
});

// ─── TC-0012-0293: 5-step iteration cycle documented ─────────────────────────

describe("TC-0012-0293 — 5-Step Iteration Cycle documented in SKILL.md", () => {
  // QFAI:SPEC-0012:TC-0012-0293
  it("SKILL.md iteration section contains all 5 steps in correct order", async () => {
    const content = await readSkillMd();

    const captureIdx = content.indexOf("Capture");
    const evaluateIdx = content.indexOf("Evaluate");
    const identifyIdx = content.indexOf("Identify");
    const fixIdx = content.indexOf("Fix");
    const reevaluateIdx = content.indexOf("Re-evaluate");

    // All steps present
    expect(captureIdx, "Capture step missing").toBeGreaterThan(-1);
    expect(evaluateIdx, "Evaluate step missing").toBeGreaterThan(-1);
    expect(identifyIdx, "Identify step missing").toBeGreaterThan(-1);
    expect(fixIdx, "Fix step missing").toBeGreaterThan(-1);
    expect(reevaluateIdx, "Re-evaluate step missing").toBeGreaterThan(-1);

    // Correct order: Capture → Evaluate → Identify → Fix → Re-evaluate
    expect(captureIdx).toBeLessThan(evaluateIdx);
    expect(evaluateIdx).toBeLessThan(identifyIdx);
    expect(identifyIdx).toBeLessThan(fixIdx);
    expect(fixIdx).toBeLessThan(reevaluateIdx);
  });
});

// ─── TC-0012-0296: Evaluator input 4 elements documented ─────────────────────

describe("TC-0012-0296 — Evaluator input 4 elements documented in SKILL.md", () => {
  // QFAI:SPEC-0012:TC-0012-0296
  it("SKILL.md Evaluate step documents all 4 required input elements", async () => {
    const content = await readSkillMd();

    // 4 elements: (a) screenshots, (b) axisDefs, (c) previousScore, (d) designSystemChecklist
    expect(content).toContain("screenshots");
    expect(content).toContain("axisDefs");
    expect(content).toContain("previousScore");
    expect(content).toContain("designSystemChecklist");
  });
});

// ─── TC-0012-0297: Evaluator input missing element detection ─────────────────

describe("TC-0012-0297 — SKILL.md documents missing evaluator input detection", () => {
  // QFAI:SPEC-0012:TC-0012-0297
  it("SKILL.md describes reviewer check for missing evaluator input elements", async () => {
    const content = await readSkillMd();

    // Reviewer check narrative: names missing element (d) specifically
    expect(content).toMatch(/missing.*element|element.*missing/i);
    // References element (d) — designSystemChecklist / 12_design_system.md
    expect(content).toContain("12_design_system.md");
  });
});

// ─── TC-0012-0298: Visual Quality Structural Checklist 6 categories ──────────

describe("TC-0012-0298 — Visual Quality Structural Checklist has 6 categories", () => {
  // QFAI:SPEC-0012:TC-0012-0298
  it("SKILL.md Visual Quality Structural Checklist enumerates all 6 categories", async () => {
    const content = await readSkillMd();

    // Checklist section present
    expect(content).toMatch(/Visual Quality Structural Checklist/i);

    // 6 required categories
    expect(content).toContain("Color");
    expect(content).toContain("Typography");
    expect(content).toContain("Spacing");
    expect(content).toContain("Border radius");
    expect(content).toContain("Shadow");
    expect(content).toMatch(/Do'?s.*Don'?ts|Don'?ts.*Do'?s/i);
  });
});
