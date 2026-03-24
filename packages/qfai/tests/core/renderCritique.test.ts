// QFAI:SPEC-0021:TC-0021-0003
// QFAI:SPEC-0021:TC-0021-0005
// QFAI:SPEC-0021:TC-0021-0001
// QFAI:SPEC-0021:TC-0021-0002
// QFAI:SPEC-0021:TC-0021-0004
// QFAI:SPEC-0021:TC-0021-0006
// QFAI:SPEC-0021:TC-0021-0007
// QFAI:SPEC-0021:TC-0021-0008
// QFAI:SPEC-0021:TC-0021-0009
// QFAI:SPEC-0021:TC-0021-0010

import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultConfig, type QfaiConfig } from "../../src/core/config.js";
import { validateRenderCritique } from "../../src/core/validators/renderCritique.js";

function makeConfig(overrides?: Partial<QfaiConfig>): QfaiConfig {
  return { ...defaultConfig, ...overrides };
}

describe("Render Critique Loop validation (SPEC-0021)", { timeout: 15000 }, () => {
  let root: string;

  beforeEach(async () => {
    root = await createTempRoot();
    await seedDdp();
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  async function createTempRoot(): Promise<string> {
    const tmp = await import("node:fs/promises").then((fs) =>
      fs.mkdtemp(path.join(os.tmpdir(), "qfai-render-critique-")),
    );
    return tmp;
  }

  async function seedSkillPrompt(name: string, content: string): Promise<void> {
    const dir = path.join(root, ".qfai", "assistant", "skills", name);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "SKILL.md"), content, "utf-8");
  }

  async function seedEvidence(name: string, content: string): Promise<void> {
    const dir = path.join(root, ".qfai", "evidence");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), content, "utf-8");
  }

  /** Seed a minimal DDP section so the renderCritique guard activates. */
  async function seedDdp(): Promise<void> {
    const dir = path.join(root, ".qfai", "discussion", "discussion-20260101000000000");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "01_Context.md"),
      "# 01 Context\n\n## Design Direction Pack\n\nvisual_thesis: test\n",
      "utf-8",
    );
  }

  // ====================================================================
  // TDD-0001: TC-0021-0003 — Code-only rejection (QFAI-CRIT-001)
  // ====================================================================
  describe("TDD-0001: Code-only rejection", () => {
    // QFAI:SPEC-0021:TC-0021-0003
    it("should emit QFAI-CRIT-001 when skill prompt has no rendered/screenshot/HTML mention", async () => {
      await seedSkillPrompt(
        "qfai-prototyping",
        "# Prototyping Skill\n\nReview the code diff carefully.",
      );
      const issues = await validateRenderCritique(root, makeConfig());
      const crit001 = issues.filter((i) => i.code === "QFAI-CRIT-001");
      expect(crit001.length).toBeGreaterThanOrEqual(1);
      expect(crit001[0]?.severity).toBe("error");
    });

    it("should NOT emit QFAI-CRIT-001 when skill prompt mentions 'screenshot'", async () => {
      await seedSkillPrompt(
        "qfai-prototyping",
        "# Prototyping Skill\n\nTake a screenshot of the rendered page and review it.\nRefer to the DDP.",
      );
      const issues = await validateRenderCritique(root, makeConfig());
      const crit001 = issues.filter((i) => i.code === "QFAI-CRIT-001");
      expect(crit001).toHaveLength(0);
    });

    it("should NOT emit QFAI-CRIT-001 when skill prompt mentions 'HTML'", async () => {
      await seedSkillPrompt(
        "qfai-implement",
        "# Implement Skill\n\nOpen the HTML output in browser and compare with the DDP.\nRead order: DDP → Design Token → UI Contract → HTML Mock → Flow",
      );
      const issues = await validateRenderCritique(root, makeConfig());
      const crit001 = issues.filter((i) => i.code === "QFAI-CRIT-001");
      expect(crit001).toHaveLength(0);
    });
  });

  // ====================================================================
  // TDD-0001: TC-0021-0005 — DDP missing halt (QFAI-CRIT-002)
  // ====================================================================
  describe("TDD-0001: DDP missing in downstream", () => {
    // QFAI:SPEC-0021:TC-0021-0005
    it("should emit QFAI-CRIT-002 when skill prompt has no DDP reference", async () => {
      await seedSkillPrompt(
        "qfai-prototyping",
        "# Prototyping Skill\n\nTake a screenshot and review the rendered page.",
      );
      const issues = await validateRenderCritique(root, makeConfig());
      const crit002 = issues.filter((i) => i.code === "QFAI-CRIT-002");
      expect(crit002.length).toBeGreaterThanOrEqual(1);
      expect(crit002[0]?.severity).toBe("error");
    });

    it("should NOT emit QFAI-CRIT-002 when skill prompt references DDP", async () => {
      await seedSkillPrompt(
        "qfai-prototyping",
        "# Prototyping Skill\n\nRead the DDP first, then take a screenshot.\nRead order: DDP → Design Token → UI Contract → HTML Mock → Flow",
      );
      const issues = await validateRenderCritique(root, makeConfig());
      const crit002 = issues.filter((i) => i.code === "QFAI-CRIT-002");
      expect(crit002).toHaveLength(0);
    });
  });

  // ====================================================================
  // TDD-0002: TC-0021-0001, TC-0021-0002 — Desktop + Mobile critique
  // ====================================================================
  describe("TDD-0002: Desktop + mobile critique", () => {
    // QFAI:SPEC-0021:TC-0021-0001
    it("should emit QFAI-CRIT-003 when no desktop viewport critique in evidence", async () => {
      await seedEvidence(
        "critique-001.md",
        "# Critique\nviewport: mobile 480px\ndate: 2025-01-01\nverdict: PASS\nfindings: none\nrubric: standard",
      );
      const issues = await validateRenderCritique(root, makeConfig());
      const crit003 = issues.filter((i) => i.code === "QFAI-CRIT-003");
      expect(crit003.length).toBeGreaterThanOrEqual(1);
      expect(crit003[0]?.severity).toBe("error");
    });

    // QFAI:SPEC-0021:TC-0021-0002
    it("should emit QFAI-CRIT-004 when no mobile viewport critique in evidence", async () => {
      await seedEvidence(
        "critique-001.md",
        "# Critique\nviewport: desktop 1024px\ndate: 2025-01-01\nverdict: PASS\nfindings: none\nrubric: standard",
      );
      const issues = await validateRenderCritique(root, makeConfig());
      const crit004 = issues.filter((i) => i.code === "QFAI-CRIT-004");
      expect(crit004.length).toBeGreaterThanOrEqual(1);
      expect(crit004[0]?.severity).toBe("error");
    });

    it("should NOT emit QFAI-CRIT-003 or QFAI-CRIT-004 when both viewports present", async () => {
      await seedEvidence(
        "critique-001.md",
        [
          "# Critique - Desktop",
          "viewport: desktop 1024px",
          "date: 2025-01-01",
          "verdict: PASS",
          "findings: all good",
          "",
          "# Critique - Mobile",
          "viewport: mobile 480px",
          "date: 2025-01-01",
          "verdict: PASS",
          "findings: all good",
          "rubric: standard evaluation criteria",
        ].join("\n"),
      );
      const issues = await validateRenderCritique(root, makeConfig());
      const viewportIssues = issues.filter(
        (i) => i.code === "QFAI-CRIT-003" || i.code === "QFAI-CRIT-004",
      );
      expect(viewportIssues).toHaveLength(0);
    });
  });

  // ====================================================================
  // TDD-0003: TC-0021-0004 — Read order verification (QFAI-CRIT-005)
  // ====================================================================
  describe("TDD-0003: Read order verification", () => {
    // QFAI:SPEC-0021:TC-0021-0004
    it("should emit QFAI-CRIT-005 when read order not specified in skill prompt", async () => {
      await seedSkillPrompt(
        "qfai-prototyping",
        "# Prototyping Skill\n\nRead the DDP and take a screenshot of the rendered page.",
      );
      const issues = await validateRenderCritique(root, makeConfig());
      const crit005 = issues.filter((i) => i.code === "QFAI-CRIT-005");
      expect(crit005.length).toBeGreaterThanOrEqual(1);
      expect(crit005[0]?.severity).toBe("error");
    });

    it("should NOT emit QFAI-CRIT-005 when full read order is specified", async () => {
      await seedSkillPrompt(
        "qfai-prototyping",
        "# Prototyping Skill\n\nRead the DDP, then take a screenshot.\n\nRead order: DDP → Design Token → UI Contract → HTML Mock → Flow",
      );
      const issues = await validateRenderCritique(root, makeConfig());
      const crit005 = issues.filter((i) => i.code === "QFAI-CRIT-005");
      expect(crit005).toHaveLength(0);
    });
  });

  // ====================================================================
  // TDD-0004: TC-0021-0006, TC-0021-0007 — Evidence recording + reproducibility
  // ====================================================================
  describe("TDD-0004: Evidence recording", () => {
    // QFAI:SPEC-0021:TC-0021-0006
    it("should emit QFAI-CRIT-006 when evidence missing required fields", async () => {
      await seedEvidence(
        "critique-001.md",
        "# Critique\nSome findings here but no structured fields.",
      );
      const issues = await validateRenderCritique(root, makeConfig());
      const crit006 = issues.filter((i) => i.code === "QFAI-CRIT-006");
      expect(crit006.length).toBeGreaterThanOrEqual(1);
      expect(crit006[0]?.severity).toBe("error");
      expect(crit006[0]?.message).toMatch(/missing/i);
    });

    it("should NOT emit QFAI-CRIT-006 when all required fields present", async () => {
      await seedEvidence(
        "critique-001.md",
        "# Critique\ndate: 2025-01-01\nviewport: desktop 1024px\nverdict: PASS\nfindings: no issues found\nrubric: standard",
      );
      const issues = await validateRenderCritique(root, makeConfig());
      const crit006 = issues.filter((i) => i.code === "QFAI-CRIT-006");
      expect(crit006).toHaveLength(0);
    });

    // QFAI:SPEC-0021:TC-0021-0007
    it("should emit QFAI-CRIT-007 when rubric not documented", async () => {
      await seedEvidence(
        "critique-001.md",
        "# Critique\ndate: 2025-01-01\nviewport: desktop 1024px\nverdict: PASS\nfindings: ok",
      );
      const issues = await validateRenderCritique(root, makeConfig());
      const crit007 = issues.filter((i) => i.code === "QFAI-CRIT-007");
      expect(crit007.length).toBeGreaterThanOrEqual(1);
      expect(crit007[0]?.severity).toBe("warning");
    });

    it("should NOT emit QFAI-CRIT-007 when rubric is documented", async () => {
      await seedEvidence(
        "critique-001.md",
        "# Critique\ndate: 2025-01-01\nviewport: desktop 1024px\nverdict: PASS\nfindings: ok\nrubric: visual consistency check",
      );
      const issues = await validateRenderCritique(root, makeConfig());
      const crit007 = issues.filter((i) => i.code === "QFAI-CRIT-007");
      expect(crit007).toHaveLength(0);
    });
  });

  // ====================================================================
  // TDD-0005: TC-0021-0008 — Iterative loop completion (QFAI-CRIT-008)
  // ====================================================================
  describe("TDD-0005: Iterative loop completion", () => {
    // QFAI:SPEC-0021:TC-0021-0008
    it("should emit QFAI-CRIT-008 when desktop viewport is REVISE", async () => {
      await seedEvidence(
        "critique-001.md",
        [
          "# Desktop critique",
          "desktop viewport: 1024px",
          "date: 2025-01-01",
          "viewport: desktop",
          "verdict: REVISE",
          "findings: spacing issues",
          "",
          "# Mobile critique",
          "mobile viewport: 480px",
          "date: 2025-01-01",
          "viewport: mobile",
          "verdict: PASS",
          "findings: ok",
          "rubric: standard",
        ].join("\n"),
      );
      const issues = await validateRenderCritique(root, makeConfig());
      const crit008 = issues.filter((i) => i.code === "QFAI-CRIT-008");
      expect(crit008.length).toBeGreaterThanOrEqual(1);
      expect(crit008[0]?.severity).toBe("error");
    });

    it("should emit QFAI-CRIT-008 when mobile viewport is REVISE", async () => {
      await seedEvidence(
        "critique-001.md",
        [
          "# Desktop critique",
          "desktop viewport: 1024px",
          "date: 2025-01-01",
          "viewport: desktop",
          "verdict: PASS",
          "findings: ok",
          "",
          "# Mobile critique",
          "mobile viewport: 480px",
          "date: 2025-01-01",
          "viewport: mobile",
          "verdict: REVISE",
          "findings: button too small",
          "rubric: standard",
        ].join("\n"),
      );
      const issues = await validateRenderCritique(root, makeConfig());
      const crit008 = issues.filter((i) => i.code === "QFAI-CRIT-008");
      expect(crit008.length).toBeGreaterThanOrEqual(1);
    });

    it("should NOT emit QFAI-CRIT-008 when both viewports are PASS", async () => {
      await seedEvidence(
        "critique-001.md",
        [
          "# Desktop critique",
          "desktop viewport: 1024px",
          "date: 2025-01-01",
          "viewport: desktop",
          "verdict: PASS",
          "findings: ok",
          "",
          "# Mobile critique",
          "mobile viewport: 480px",
          "date: 2025-01-01",
          "viewport: mobile",
          "verdict: PASS",
          "findings: ok",
          "rubric: standard",
        ].join("\n"),
      );
      const issues = await validateRenderCritique(root, makeConfig());
      const crit008 = issues.filter((i) => i.code === "QFAI-CRIT-008");
      expect(crit008).toHaveLength(0);
    });
  });

  // ====================================================================
  // TDD-0006: TC-0021-0009, TC-0021-0010 — taskFidelity
  // ====================================================================
  describe("TDD-0006: taskFidelity evaluation", () => {
    // QFAI:SPEC-0021:TC-0021-0009
    it("should emit QFAI-CRIT-009 when taskFidelity section is missing", async () => {
      await seedEvidence(
        "critique-001.md",
        [
          "# Critique",
          "date: 2025-01-01",
          "viewport: desktop 1024px",
          "verdict: PASS",
          "findings: ok",
          "rubric: standard",
        ].join("\n"),
      );
      const issues = await validateRenderCritique(root, makeConfig());
      const crit009 = issues.filter((i) => i.code === "QFAI-CRIT-009");
      expect(crit009.length).toBeGreaterThanOrEqual(1);
      expect(crit009[0]?.severity).toBe("error");
    });

    it("should emit QFAI-CRIT-009 when taskFidelity is present but incomplete", async () => {
      await seedEvidence(
        "critique-001.md",
        [
          "# Critique",
          "date: 2025-01-01",
          "viewport: desktop 1024px",
          "verdict: PASS",
          "findings: ok",
          "rubric: standard",
          "",
          "## taskFidelity",
          "step_count: 3",
          "max_primary_steps: 5",
          // missing cta_visibility and four_state_check
        ].join("\n"),
      );
      const issues = await validateRenderCritique(root, makeConfig());
      const crit009 = issues.filter((i) => i.code === "QFAI-CRIT-009");
      expect(crit009.length).toBeGreaterThanOrEqual(1);
    });

    // QFAI:SPEC-0021:TC-0021-0010
    it("should emit QFAI-CRIT-010 when step_count exceeds max_primary_steps", async () => {
      await seedEvidence(
        "critique-001.md",
        [
          "# Critique",
          "date: 2025-01-01",
          "viewport: desktop 1024px",
          "verdict: PASS",
          "findings: ok",
          "rubric: standard",
          "",
          "## taskFidelity",
          "step_count: 8",
          "max_primary_steps: 5",
          "cta_visibility: visible",
          "four_state_check: ok",
        ].join("\n"),
      );
      const issues = await validateRenderCritique(root, makeConfig());
      const crit010 = issues.filter((i) => i.code === "QFAI-CRIT-010");
      expect(crit010.length).toBeGreaterThanOrEqual(1);
      expect(crit010[0]?.severity).toBe("error");
      expect(crit010[0]?.message).toMatch(/step_count.*8.*max_primary_steps.*5/);
    });

    it("should NOT emit QFAI-CRIT-010 when step_count is within max_primary_steps", async () => {
      await seedEvidence(
        "critique-001.md",
        [
          "# Critique",
          "date: 2025-01-01",
          "viewport: desktop 1024px",
          "verdict: PASS",
          "findings: ok",
          "rubric: standard",
          "",
          "## taskFidelity",
          "step_count: 3",
          "max_primary_steps: 5",
          "cta_visibility: visible",
          "four_state_check: ok",
        ].join("\n"),
      );
      const issues = await validateRenderCritique(root, makeConfig());
      const crit010 = issues.filter((i) => i.code === "QFAI-CRIT-010");
      expect(crit010).toHaveLength(0);
    });

    it("should NOT emit QFAI-CRIT-009 when all taskFidelity fields are present", async () => {
      await seedEvidence(
        "critique-001.md",
        [
          "# Critique",
          "date: 2025-01-01",
          "viewport: desktop 1024px",
          "verdict: PASS",
          "findings: ok",
          "rubric: standard",
          "",
          "## taskFidelity",
          "step_count: 3",
          "max_primary_steps: 5",
          "cta_visibility: visible",
          "four_state_check: ok",
        ].join("\n"),
      );
      const issues = await validateRenderCritique(root, makeConfig());
      const crit009 = issues.filter((i) => i.code === "QFAI-CRIT-009");
      expect(crit009).toHaveLength(0);
    });
  });

  // ====================================================================
  // No false positives when no files exist
  // ====================================================================
  describe("Empty project", () => {
    it("should emit no issues when there are no skill prompts or evidence files", async () => {
      const issues = await validateRenderCritique(root, makeConfig());
      expect(issues).toHaveLength(0);
    });
  });
});
