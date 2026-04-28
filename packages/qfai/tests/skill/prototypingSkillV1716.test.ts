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
  // QFAI:SPEC-0012:TC-0012-0285 (superseded by spec-0017 REQ-0002)
  it("SKILL.md Delegation Scope Table contains required categories with correct roles", async () => {
    const content = await readSkillMd();

    // Table header present
    expect(content).toMatch(/Delegation Scope Table/i);

    // Required categories (spec-0017 renames "Screenshot capture" → "Playwright CLI execution & capture")
    expect(content).toContain("UI implementation");
    expect(content).toMatch(/Playwright CLI execution|Screenshot capture/);
    expect(content).toMatch(/Evaluation (L1-L2|review|scoring)/);
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
    expect(content).toContain("targetRounds");
    expect(content).toContain("evaluationAxesSource");
    expect(content).toContain("delegationMap");
    expect(content).toContain("plannedAt");
  });
});

describe("TC-0012-0289b — preflight and environment preconditions documented in SKILL.md", () => {
  it("SKILL.md separates contract/environment preconditions and documents preflight guidance", async () => {
    const content = await readSkillMd();

    expect(content).toContain("Step 2-A — Verify Contract Preconditions");
    expect(content).toContain("Step 2-B — Verify Environment Preconditions");
    expect(content).toMatch(/qfai prototyping preflight|qfai doctor --profile prototyping/i);
    expect(content).toMatch(/npx --no-install playwright-cli|node_modules\/\.bin\/playwright-cli/i);
  });
});

// ─── TC-0012-0292: canonical evidence capture instructions ───────────────────

describe("TC-0012-0292 — SKILL.md documents canonical evidence capture", () => {
  // QFAI:SPEC-0012:TC-0012-0292
  it("SKILL.md Capture step references canonical screenshot and HTML evidence paths", async () => {
    const content = await readSkillMd();
    expect(content).toContain(".qfai/evidence/prototyping/screenshots/<screen-id>.png");
    expect(content).toContain(".qfai/evidence/prototyping/html/<screen-id>.html");
  });
});

// ─── TC-0012-0293: 5-step iteration cycle documented ─────────────────────────

describe("TC-0012-0293 — round loop documented in SKILL.md", () => {
  // QFAI:SPEC-0012:TC-0012-0293 (superseded by spec-0017 REQ-0002 — step rename)
  it("SKILL.md cycle section contains round-start/capture, evaluator launch, funnel, breakthrough, and validate phases in order", async () => {
    const content = await readSkillMd();

    // spec-0017 round v2 uses round-start while keeping evaluator / funnel / validate ordering.
    const captureIdx = Math.max(
      content.indexOf("Round Start"),
      content.indexOf("Prepare Candidate Review Bundle"),
    );
    const evaluateIdx = Math.max(
      content.indexOf("Launch L1 and L2 Evaluators"),
      content.indexOf("Launch Evaluation Reviewers"),
    );
    const funnelIdx = content.indexOf("Direction Funnel");
    const breakthroughIdx = content.indexOf("Breakthrough Detection");
    const validateIdx = content.indexOf("Validate and Verify");

    expect(captureIdx, "Prepare/Capture step missing").toBeGreaterThan(-1);
    expect(evaluateIdx, "Evaluator launch step missing").toBeGreaterThan(-1);
    expect(funnelIdx, "Direction funnel step missing").toBeGreaterThan(-1);
    expect(breakthroughIdx, "Breakthrough step missing").toBeGreaterThan(-1);
    expect(validateIdx, "Validate step missing").toBeGreaterThan(-1);

    expect(captureIdx).toBeLessThan(evaluateIdx);
    expect(evaluateIdx).toBeLessThan(funnelIdx);
    expect(funnelIdx).toBeLessThan(breakthroughIdx);
    expect(breakthroughIdx).toBeLessThan(validateIdx);
  });
});

// ─── TC-0012-0296: Evaluator input 4 elements documented ─────────────────────

describe("TC-0012-0296 — Evaluator input elements documented in SKILL.md", () => {
  // QFAI:SPEC-0012:TC-0012-0296
  it("SKILL.md Evaluate step documents all required input elements", async () => {
    const content = await readSkillMd();

    // Current skill requires 5 elements including HTML snapshots.
    expect(content).toContain("screenshots");
    expect(content).toContain("HTML snapshots");
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

    expect(content).toMatch(
      /required input is missing|missing evidence|missing mandatory evidence/i,
    );
    expect(content).toContain(".qfai/contracts/design/design-system.yaml");
  });
});

// ─── TC-0012-0298: Visual Quality Structural Checklist 6 categories ──────────

describe("TC-0012-0298 — Visual Quality Structural Checklist has 6 categories", () => {
  // QFAI:SPEC-0012:TC-0012-0298
  it("SKILL.md Visual Quality Structural Checklist enumerates all 6 categories", async () => {
    const content = await readSkillMd();

    // Checklist section present
    expect(content).toMatch(/Visual Quality Structural Checklist/i);

    expect(content).toContain("Design quality");
    expect(content).toContain("Originality");
    expect(content).toContain("Craft");
    expect(content).toContain("Functionality");
    expect(content).toContain("Accessibility risk");
    expect(content).toContain("Implementation plausibility");
  });
});
