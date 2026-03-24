// QFAI:SPEC-0022:TC-0022-0001
// QFAI:SPEC-0022:TC-0022-0002
// QFAI:SPEC-0022:TC-0022-0003
// QFAI:SPEC-0022:TC-0022-0004
// QFAI:SPEC-0022:TC-0022-0005
// QFAI:SPEC-0022:TC-0022-0006
// QFAI:SPEC-0022:TC-0022-0007
// QFAI:SPEC-0022:TC-0022-0008
// QFAI:SPEC-0022:TC-0022-0009
// QFAI:SPEC-0022:TC-0022-0010
// QFAI:SPEC-0022:TC-0022-0011
// QFAI:SPEC-0022:TC-0022-0012

import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultConfig, type QfaiConfig } from "../../src/core/config.js";
import { validateDesignFidelity } from "../../src/core/validators/designFidelity.js";

describe("Design Fidelity Scorecard validation", { timeout: 10000 }, () => {
  let root: string;

  beforeEach(async () => {
    root = path.join(os.tmpdir(), `qfai-fidelity-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(path.join(root, ".qfai", "evidence"), { recursive: true });
    await mkdir(path.join(root, ".qfai", "review"), { recursive: true });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  function config(overrides?: Partial<QfaiConfig>): QfaiConfig {
    return { ...defaultConfig, ...overrides };
  }

  async function writeEvidence(name: string, content: string): Promise<void> {
    await writeFile(path.join(root, ".qfai", "evidence", name), content, "utf-8");
  }

  async function writeReview(name: string, content: string): Promise<void> {
    await writeFile(path.join(root, ".qfai", "review", name), content, "utf-8");
  }

  // ── Helper: build a complete valid scorecard ─────────────────────────────

  function buildCompleteScorecard(opts: {
    hierarchy?: number;
    clarity?: number;
    accessibility?: number;
    responsive?: number;
    taskFidelity?: number | null;
    includeTaskFidelityRequirement?: boolean;
    includeRubric?: boolean;
    includeDelta?: boolean;
    includeDesktopMobile?: boolean;
    includeImprovementsForFailing?: boolean;
    antiPatterns?: string[];
  } = {}): string {
    const {
      hierarchy = 85,
      clarity = 78,
      accessibility = 72,
      responsive = 80,
      taskFidelity = null,
      includeTaskFidelityRequirement = false,
      includeRubric = true,
      includeDelta = false,
      includeDesktopMobile = true,
      includeImprovementsForFailing = true,
      antiPatterns = [],
    } = opts;

    const lines: string[] = [];
    if (includeTaskFidelityRequirement) {
      lines.push("taskFidelity: required", "");
    }
    lines.push("## Fidelity Scorecard", "");

    // hierarchy
    lines.push("hierarchy:");
    lines.push(`  score: ${hierarchy}`);
    lines.push("  comment: Clear visual hierarchy with proper heading levels");
    if (hierarchy < 70 && includeImprovementsForFailing) {
      lines.push("  improvement: Increase heading contrast ratios");
      lines.push("  alternative: Use larger font sizes for primary headings");
    }

    // clarity
    lines.push("clarity:");
    lines.push(`  score: ${clarity}`);
    lines.push("  comment: Good information density");
    if (clarity < 70 && includeImprovementsForFailing) {
      lines.push("  improvement: Reduce label ambiguity");
      lines.push("  alternative: Use icon+text labels");
    }

    // accessibility
    lines.push("accessibility:");
    lines.push(`  score: ${accessibility}`);
    lines.push("  comment: Contrast ratios meet WCAG AA");
    if (accessibility < 70 && includeImprovementsForFailing) {
      lines.push("  improvement: Add ARIA labels to interactive elements");
      lines.push("  alternative: Use semantic HTML elements");
    }

    // responsive
    lines.push("responsive:");
    lines.push(`  score: ${responsive}`);
    lines.push("  comment: Desktop layout solid");
    if (includeDesktopMobile) {
      lines.push("  desktop: Layout maintains hierarchy at 1280px");
      lines.push("  mobile: Cards stack properly at 375px");
    }
    if (responsive < 70 && includeImprovementsForFailing) {
      lines.push("  improvement: Optimize scroll behavior on mobile");
      lines.push("  alternative: Use CSS grid for responsive layouts");
    }

    // taskFidelity
    if (taskFidelity !== null) {
      lines.push("taskFidelity:");
      lines.push(`  score: ${taskFidelity}`);
      lines.push("  step_count: 3");
      lines.push("  cta_visibility: true");
      lines.push("  empty_state: defined");
      lines.push("  error_state: defined");
      lines.push("  primary_flow_clicks: 3");
      lines.push("  comment: Primary task completes in 3 clicks");
    }

    // Anti-patterns
    for (const ap of antiPatterns) {
      lines.push(`${ap}: detected`);
    }

    lines.push("");
    lines.push("verdict: PASS");

    if (includeRubric) {
      lines.push("rubric: QFAI Design Fidelity Rubric v1.0");
    }

    if (includeDelta) {
      lines.push("breaking_delta:");
      lines.push("  content: Changed primary color scheme");
      lines.push("  impact: Affects all themed components");
      lines.push("  migration: Update theme tokens to new palette");
    }

    return lines.join("\n");
  }

  // ── TDD-0001: TC-0022-0001, TC-0022-0002 ────────────────────────────────

  describe("TDD-0001: Scorecard 4-dim + score/prose", () => {
    // ATDD: QFAI:SPEC-0022:TC-0022-0001
    it("passes when all 4 dimensions with score and prose are present", async () => {
      await writeEvidence("review-001.md", buildCompleteScorecard());
      const issues = await validateDesignFidelity(root, config());
      const fidIssues = issues.filter((i) => i.code === "QFAI-FID-001" || i.code === "QFAI-FID-002");
      expect(fidIssues).toHaveLength(0);
    });

    // ATDD: QFAI:SPEC-0022:TC-0022-0001
    it("flags missing dimensions", async () => {
      const scorecard = [
        "## Fidelity Scorecard",
        "",
        "hierarchy:",
        "  score: 85",
        "  comment: Good hierarchy",
        "clarity:",
        "  score: 78",
        "  comment: Good clarity",
        "",
        "verdict: PASS",
        "rubric: QFAI Design Fidelity Rubric v1.0",
      ].join("\n");
      await writeEvidence("review-001.md", scorecard);
      const issues = await validateDesignFidelity(root, config());
      const missing = issues.filter((i) => i.code === "QFAI-FID-001");
      expect(missing.length).toBe(2);
      expect(missing.map((i) => i.message)).toEqual(
        expect.arrayContaining([
          expect.stringContaining("accessibility"),
          expect.stringContaining("responsive"),
        ]),
      );
    });

    // ATDD: QFAI:SPEC-0022:TC-0022-0002
    it("flags dimension missing score", async () => {
      const scorecard = [
        "## Fidelity Scorecard",
        "",
        "hierarchy:",
        "  comment: Good hierarchy",
        "clarity:",
        "  score: 78",
        "  comment: Good clarity",
        "accessibility:",
        "  score: 72",
        "  comment: Meets WCAG AA",
        "responsive:",
        "  score: 80",
        "  comment: Layout solid",
        "  desktop: 1280px ok",
        "  mobile: 375px ok",
        "",
        "verdict: PASS",
        "rubric: QFAI Design Fidelity Rubric v1.0",
      ].join("\n");
      await writeEvidence("review-001.md", scorecard);
      const issues = await validateDesignFidelity(root, config());
      const scoreMissing = issues.filter((i) => i.code === "QFAI-FID-002");
      expect(scoreMissing.length).toBe(1);
      expect(scoreMissing[0]?.message).toContain("hierarchy");
      expect(scoreMissing[0]?.message).toContain("score");
    });

    // ATDD: QFAI:SPEC-0022:TC-0022-0002
    it("flags dimension missing prose comment", async () => {
      const scorecard = [
        "## Fidelity Scorecard",
        "",
        "hierarchy:",
        "  score: 85",
        "clarity:",
        "  score: 78",
        "  comment: Good clarity",
        "accessibility:",
        "  score: 72",
        "  comment: Meets WCAG AA",
        "responsive:",
        "  score: 80",
        "  comment: Layout solid",
        "  desktop: 1280px ok",
        "  mobile: 375px ok",
        "",
        "verdict: PASS",
        "rubric: QFAI Design Fidelity Rubric v1.0",
      ].join("\n");
      await writeEvidence("review-001.md", scorecard);
      const issues = await validateDesignFidelity(root, config());
      const proseMissing = issues.filter((i) => i.code === "QFAI-FID-002");
      expect(proseMissing.length).toBe(1);
      expect(proseMissing[0]?.message).toContain("hierarchy");
      expect(proseMissing[0]?.message).toContain("prose");
    });
  });

  // ── TDD-0002: TC-0022-0003, TC-0022-0007 ────────────────────────────────

  describe("TDD-0002: PASS/FAIL threshold + boundary", () => {
    // ATDD: QFAI:SPEC-0022:TC-0022-0003
    it("no threshold violations when all scores >= 70", async () => {
      await writeEvidence("review-001.md", buildCompleteScorecard());
      const issues = await validateDesignFidelity(root, config());
      const threshold = issues.filter((i) => i.code === "QFAI-FID-003");
      expect(threshold).toHaveLength(0);
    });

    // ATDD: QFAI:SPEC-0022:TC-0022-0007
    it("flags accessibility at 60 even when others are high", async () => {
      await writeEvidence(
        "review-001.md",
        buildCompleteScorecard({ accessibility: 60 }),
      );
      const issues = await validateDesignFidelity(root, config());
      const threshold = issues.filter((i) => i.code === "QFAI-FID-003");
      expect(threshold.length).toBeGreaterThanOrEqual(1);
      expect(threshold.some((i) => i.message.includes("accessibility"))).toBe(true);
    });

    // ATDD: QFAI:SPEC-0022:TC-0022-0003
    it("flags when overall average is below 70", async () => {
      await writeEvidence(
        "review-001.md",
        buildCompleteScorecard({
          hierarchy: 65,
          clarity: 65,
          accessibility: 65,
          responsive: 65,
        }),
      );
      const issues = await validateDesignFidelity(root, config());
      const threshold = issues.filter((i) => i.code === "QFAI-FID-003");
      expect(threshold.some((i) => i.message.includes("average"))).toBe(true);
    });

    it("boundary: score exactly 70 passes", async () => {
      await writeEvidence(
        "review-001.md",
        buildCompleteScorecard({
          hierarchy: 70,
          clarity: 70,
          accessibility: 70,
          responsive: 70,
        }),
      );
      const issues = await validateDesignFidelity(root, config());
      const threshold = issues.filter((i) => i.code === "QFAI-FID-003");
      expect(threshold).toHaveLength(0);
    });

    it("boundary: score 69 fails", async () => {
      await writeEvidence(
        "review-001.md",
        buildCompleteScorecard({ hierarchy: 69 }),
      );
      const issues = await validateDesignFidelity(root, config());
      const threshold = issues.filter((i) => i.code === "QFAI-FID-003");
      expect(threshold.some((i) => i.message.includes("hierarchy"))).toBe(true);
    });
  });

  // ── TDD-0003: TC-0022-0004, TC-0022-0008 ────────────────────────────────

  describe("TDD-0003: FAIL improvement guidance + responsive viewport", () => {
    // ATDD: QFAI:SPEC-0022:TC-0022-0004
    it("flags FAIL dimension without improvement instructions", async () => {
      const scorecard = [
        "## Fidelity Scorecard",
        "",
        "hierarchy:",
        "  score: 60",
        "  comment: Poor hierarchy",
        "clarity:",
        "  score: 78",
        "  comment: Good clarity",
        "accessibility:",
        "  score: 72",
        "  comment: Meets WCAG AA",
        "responsive:",
        "  score: 80",
        "  comment: Layout solid",
        "  desktop: 1280px ok",
        "  mobile: 375px ok",
        "",
        "verdict: FAIL",
        "rubric: QFAI Design Fidelity Rubric v1.0",
      ].join("\n");
      await writeEvidence("review-001.md", scorecard);
      const issues = await validateDesignFidelity(root, config());
      const improvement = issues.filter((i) => i.code === "QFAI-FID-004");
      expect(improvement.length).toBeGreaterThanOrEqual(1);
      expect(improvement[0]?.message).toContain("hierarchy");
    });

    // ATDD: QFAI:SPEC-0022:TC-0022-0004
    it("no improvement issue when FAIL dimension has improvement + alternative", async () => {
      await writeEvidence(
        "review-001.md",
        buildCompleteScorecard({ hierarchy: 60 }),
      );
      const issues = await validateDesignFidelity(root, config());
      const improvement = issues.filter((i) => i.code === "QFAI-FID-004");
      expect(improvement).toHaveLength(0);
    });

    // ATDD: QFAI:SPEC-0022:TC-0022-0008
    it("flags responsive dimension missing desktop viewport", async () => {
      await writeEvidence(
        "review-001.md",
        buildCompleteScorecard({ includeDesktopMobile: false }),
      );
      const issues = await validateDesignFidelity(root, config());
      const viewport = issues.filter((i) => i.code === "QFAI-FID-005");
      expect(viewport.length).toBeGreaterThanOrEqual(1);
      expect(viewport[0]?.message).toContain("desktop");
    });

    // ATDD: QFAI:SPEC-0022:TC-0022-0008
    it("no viewport issue when both desktop and mobile are present", async () => {
      await writeEvidence("review-001.md", buildCompleteScorecard());
      const issues = await validateDesignFidelity(root, config());
      const viewport = issues.filter((i) => i.code === "QFAI-FID-005");
      expect(viewport).toHaveLength(0);
    });
  });

  // ── TDD-0004: TC-0022-0005, TC-0022-0006 ────────────────────────────────

  describe("TDD-0004: Breaking delta + reproducibility", () => {
    // ATDD: QFAI:SPEC-0022:TC-0022-0005
    it("flags breaking delta with missing fields", async () => {
      const scorecard = [
        "## Fidelity Scorecard",
        "",
        "hierarchy:",
        "  score: 85",
        "  comment: Good hierarchy",
        "clarity:",
        "  score: 78",
        "  comment: Good clarity",
        "accessibility:",
        "  score: 72",
        "  comment: Meets WCAG AA",
        "responsive:",
        "  score: 80",
        "  comment: Layout solid",
        "  desktop: 1280px ok",
        "  mobile: 375px ok",
        "",
        "verdict: PASS",
        "rubric: QFAI Design Fidelity Rubric v1.0",
        "breaking_delta:",
        "  content: Changed color scheme",
      ].join("\n");
      await writeEvidence("review-001.md", scorecard);
      const issues = await validateDesignFidelity(root, config());
      const delta = issues.filter((i) => i.code === "QFAI-FID-006");
      expect(delta.length).toBe(1);
      expect(delta[0]?.message).toContain("impact");
      expect(delta[0]?.message).toContain("migration");
    });

    // ATDD: QFAI:SPEC-0022:TC-0022-0005
    it("no delta issue when all breaking delta fields present", async () => {
      await writeEvidence(
        "review-001.md",
        buildCompleteScorecard({ includeDelta: true }),
      );
      const issues = await validateDesignFidelity(root, config());
      const delta = issues.filter((i) => i.code === "QFAI-FID-006");
      expect(delta).toHaveLength(0);
    });

    // ATDD: QFAI:SPEC-0022:TC-0022-0006
    it("flags missing rubric", async () => {
      await writeEvidence(
        "review-001.md",
        buildCompleteScorecard({ includeRubric: false }),
      );
      const issues = await validateDesignFidelity(root, config());
      const rubric = issues.filter((i) => i.code === "QFAI-FID-007");
      expect(rubric.length).toBe(1);
      expect(rubric[0]?.message).toContain("rubric");
    });

    // ATDD: QFAI:SPEC-0022:TC-0022-0006
    it("no rubric issue when rubric is documented", async () => {
      await writeEvidence("review-001.md", buildCompleteScorecard());
      const issues = await validateDesignFidelity(root, config());
      const rubric = issues.filter((i) => i.code === "QFAI-FID-007");
      expect(rubric).toHaveLength(0);
    });
  });

  // ── TDD-0005: TC-0022-0009, TC-0022-0010 ────────────────────────────────

  describe("TDD-0005: taskFidelity 5th dimension", () => {
    // ATDD: QFAI:SPEC-0022:TC-0022-0009
    it("flags missing taskFidelity when spec requires it", async () => {
      const scorecard = [
        "taskFidelity: required",
        "",
        "## Fidelity Scorecard",
        "",
        "hierarchy:",
        "  score: 85",
        "  comment: Good hierarchy",
        "clarity:",
        "  score: 78",
        "  comment: Good clarity",
        "accessibility:",
        "  score: 72",
        "  comment: Meets WCAG AA",
        "responsive:",
        "  score: 80",
        "  comment: Layout solid",
        "  desktop: 1280px ok",
        "  mobile: 375px ok",
        "",
        "verdict: PASS",
        "rubric: QFAI Design Fidelity Rubric v1.0",
      ].join("\n");
      await writeEvidence("review-001.md", scorecard);
      const issues = await validateDesignFidelity(root, config());
      const tf = issues.filter((i) => i.code === "QFAI-FID-008");
      expect(tf.length).toBe(1);
      expect(tf[0]?.message).toContain("taskFidelity");
    });

    // ATDD: QFAI:SPEC-0022:TC-0022-0009
    it("no issue when taskFidelity not required and not present", async () => {
      await writeEvidence("review-001.md", buildCompleteScorecard());
      const issues = await validateDesignFidelity(root, config());
      const tf = issues.filter((i) => i.code === "QFAI-FID-008");
      expect(tf).toHaveLength(0);
    });

    // ATDD: QFAI:SPEC-0022:TC-0022-0010
    it("flags missing taskFidelity fields", async () => {
      const scorecard = [
        "taskFidelity: required",
        "",
        "## Fidelity Scorecard",
        "",
        "hierarchy:",
        "  score: 85",
        "  comment: Good hierarchy",
        "clarity:",
        "  score: 78",
        "  comment: Good clarity",
        "accessibility:",
        "  score: 72",
        "  comment: Meets WCAG AA",
        "responsive:",
        "  score: 80",
        "  comment: Layout solid",
        "  desktop: 1280px ok",
        "  mobile: 375px ok",
        "taskFidelity:",
        "  score: 90",
        "  step_count: 3",
        "  comment: Primary task completes in 3 clicks",
        "",
        "verdict: PASS",
        "rubric: QFAI Design Fidelity Rubric v1.0",
      ].join("\n");
      await writeEvidence("review-001.md", scorecard);
      const issues = await validateDesignFidelity(root, config());
      const tf = issues.filter((i) => i.code === "QFAI-FID-009");
      expect(tf.length).toBe(4); // missing: cta_visibility, empty_state, error_state, primary_flow_clicks
      const messages = tf.map((i) => i.message);
      expect(messages).toEqual(
        expect.arrayContaining([
          expect.stringContaining("cta_visibility"),
          expect.stringContaining("empty_state"),
          expect.stringContaining("error_state"),
          expect.stringContaining("primary_flow_clicks"),
        ]),
      );
    });

    // ATDD: QFAI:SPEC-0022:TC-0022-0010
    it("no field issues when all taskFidelity fields present", async () => {
      await writeEvidence(
        "review-001.md",
        buildCompleteScorecard({
          taskFidelity: 90,
          includeTaskFidelityRequirement: true,
        }),
      );
      const issues = await validateDesignFidelity(root, config());
      const tf = issues.filter((i) => i.code === "QFAI-FID-009");
      expect(tf).toHaveLength(0);
    });
  });

  // ── TDD-0006: TC-0022-0011, TC-0022-0012 ────────────────────────────────

  describe("TDD-0006: Warning->error escalation + config override", () => {
    // ATDD: QFAI:SPEC-0022:TC-0022-0011
    it("escalates known anti-pattern to error by default", async () => {
      await writeEvidence(
        "review-001.md",
        buildCompleteScorecard({ antiPatterns: ["dual_primary_cta"] }),
      );
      const issues = await validateDesignFidelity(root, config());
      const escalated = issues.filter((i) => i.code === "QFAI-FID-010");
      expect(escalated.length).toBe(1);
      expect(escalated[0]?.severity).toBe("error");
      expect(escalated[0]?.message).toContain("dual_primary_cta");
    });

    // ATDD: QFAI:SPEC-0022:TC-0022-0011
    it("escalates multiple anti-patterns", async () => {
      await writeEvidence(
        "review-001.md",
        buildCompleteScorecard({
          antiPatterns: ["placeholder_or_lorem", "empty_state_without_action"],
        }),
      );
      const issues = await validateDesignFidelity(root, config());
      const escalated = issues.filter((i) => i.code === "QFAI-FID-010");
      expect(escalated.length).toBe(2);
      for (const iss of escalated) {
        expect(iss.severity).toBe("error");
      }
    });

    // ATDD: QFAI:SPEC-0022:TC-0022-0012
    it("config override downgrades escalation back to warning", async () => {
      await writeEvidence(
        "review-001.md",
        buildCompleteScorecard({ antiPatterns: ["dual_primary_cta"] }),
      );
      const cfg = config({
        uiux: { warning_as_error_override: ["dual_primary_cta"] },
      });
      const issues = await validateDesignFidelity(root, cfg);
      const overridden = issues.filter((i) => i.code === "QFAI-FID-011");
      expect(overridden.length).toBe(1);
      expect(overridden[0]?.severity).toBe("warning");
      expect(overridden[0]?.message).toContain("overridden");
    });

    // ATDD: QFAI:SPEC-0022:TC-0022-0012
    it("override only affects specified codes", async () => {
      await writeEvidence(
        "review-001.md",
        buildCompleteScorecard({
          antiPatterns: ["dual_primary_cta", "placeholder_or_lorem"],
        }),
      );
      const cfg = config({
        uiux: { warning_as_error_override: ["dual_primary_cta"] },
      });
      const issues = await validateDesignFidelity(root, cfg);
      const overridden = issues.filter((i) => i.code === "QFAI-FID-011");
      const escalated = issues.filter((i) => i.code === "QFAI-FID-010");
      expect(overridden.length).toBe(1);
      expect(overridden[0]?.severity).toBe("warning");
      expect(escalated.length).toBe(1);
      expect(escalated[0]?.severity).toBe("error");
      expect(escalated[0]?.message).toContain("placeholder_or_lorem");
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────────────

  describe("Edge cases", () => {
    it("returns no issues when no scorecard files exist", async () => {
      const issues = await validateDesignFidelity(root, config());
      expect(issues).toHaveLength(0);
    });

    it("ignores markdown files without scorecard heading", async () => {
      await writeEvidence("notes.md", "# Just some notes\n\nNo scorecard here.");
      const issues = await validateDesignFidelity(root, config());
      expect(issues).toHaveLength(0);
    });

    it("scans both evidence and review directories", async () => {
      await writeReview(
        "review-001.md",
        buildCompleteScorecard({ includeRubric: false }),
      );
      const issues = await validateDesignFidelity(root, config());
      const rubric = issues.filter((i) => i.code === "QFAI-FID-007");
      expect(rubric.length).toBe(1);
    });
  });
});
