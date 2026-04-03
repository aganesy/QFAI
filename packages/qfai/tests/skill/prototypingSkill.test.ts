/**
 * Prototyping skill validator tests — spec-0035 TDD-0007..TDD-0009, TDD-0015
 *
 * QFAI:SPEC-0012:TC-0012-0007
 * QFAI:SPEC-0012:TC-0012-0008
 * QFAI:SPEC-0012:TC-0012-0009
 * QFAI:SPEC-0012:TC-0012-0015
 */
import { describe, expect, it } from "vitest";

import {
  checkModeHeadings,
  hasNonUiNaDocumentation,
  isStaticFirstAligned,
  scanBannedPhrases,
} from "../../src/core/validators/skill/prototypingSkill.js";

const VALID_SKILL_CONTENT = [
  "# Prototyping Skill",
  "",
  "Static-first architecture ensures prototyping completes without browser or backend.",
  "Static checks are the default obligation set. No runtime infrastructure needed.",
  "",
  "## Low-cost Mode",
  "",
  "Obligations: static checks only, no evidence loop.",
  "Non-UI projects: visual-review steps are n/a for non-ui surface type.",
  "",
  "## Standard Mode",
  "",
  "Obligations: static checks + basic evidence, single iteration.",
  "Non-UI projects: UI-specific steps are n/a for non-ui surface type.",
  "",
  "## Full-harness Mode",
  "",
  "Obligations: evidence loop + reviewer + calibration, multi-iteration.",
  "Use /qfai-prototyping with mode=full-harness.",
  "Must be explicitly opted in by the user.",
  "Non-UI projects: visual-review and UI calibration are n/a for non-ui surface type.",
].join("\n");

describe("skill rewrite", () => {
  it("banned phrase scan zero matches", () => {
    const matches = scanBannedPhrases(VALID_SKILL_CONTENT);

    expect(matches).toHaveLength(0);
  });

  it("mode section headings present", () => {
    const result = checkModeHeadings(VALID_SKILL_CONTENT);

    expect(result.present).toContain("low-cost");
    expect(result.present).toContain("standard");
    expect(result.present).toContain("full-harness");
    expect(result.missing).toHaveLength(0);
  });

  it("non-UI steps marked n/a", () => {
    const result = hasNonUiNaDocumentation(VALID_SKILL_CONTENT);

    expect(result).toBe(true);
  });

  it("static-first alignment", () => {
    const result = isStaticFirstAligned(VALID_SKILL_CONTENT);

    expect(result).toBe(true);
  });
});
