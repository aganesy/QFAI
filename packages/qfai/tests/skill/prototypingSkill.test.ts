import { describe, expect, it } from "vitest";

import {
  checkModeHeadings,
  hasModeSurfaceMatrix,
  hasCanonicalSurfaceDocumentation,
  hasCliSurfaceDocumentation,
  hasUiBearingFalseExclusion,
  isStaticFirstAligned,
  scanBannedPhrases,
} from "../../src/core/validators/skill/prototypingSkill.js";

const VALID_SKILL_CONTENT = [
  "# Prototyping Skill",
  "",
  "This workflow is static-first and file-based by default.",
  "",
  "Canonical prototyping surfaces are: web, mobile, desktop, cli, mixed.",
  "cli surface: uiFidelity is n/a, render evidence is not required, browser QA is not required.",
  "ui_bearing: false specs are not prototyping execution targets.",
  "",
  "## Low-cost",
  "Static checks only. web, mobile, desktop, mixed surfaces may keep skeleton evidence.",
  "",
  "## Standard",
  "Static checks plus optional light validation.",
  "",
  "## Full-harness",
  "Explicit request only. Never full-harness by default.",
  "",
  "## Obligation Matrix",
  "| surface / mode | specs | runtimeGate | uiFidelity | render evidence | browser QA | fullHarness |",
  "| web / low-cost | required | optional | optional | optional | optional | absent |",
  "| web / standard | required | optional | required | optional | optional | absent |",
  "| web / full-harness | required | required | required | required | required | required |",
  "| mobile / low-cost | required | optional | optional | optional | optional | absent |",
  "| desktop / standard | required | optional | required | optional | optional | absent |",
  "| cli / low-cost | required | optional | n/a | n/a | n/a | absent |",
  "| cli / standard | required | optional | n/a | n/a | n/a | absent |",
  "| mixed / standard | required | optional | required | optional | optional | absent |",
].join("\n");

describe("prototyping skill validator", () => {
  it("has all mode section headings", () => {
    const result = checkModeHeadings(VALID_SKILL_CONTENT);
    expect(result.missing).toHaveLength(0);
  });

  it("documents canonical 5 surfaces", () => {
    expect(hasCanonicalSurfaceDocumentation(VALID_SKILL_CONTENT)).toBe(true);
  });

  it("documents cli surface obligations", () => {
    expect(hasCliSurfaceDocumentation(VALID_SKILL_CONTENT)).toBe(true);
  });

  it("documents ui_bearing: false exclusion", () => {
    expect(hasUiBearingFalseExclusion(VALID_SKILL_CONTENT)).toBe(true);
  });

  it("documents static-first semantics", () => {
    expect(isStaticFirstAligned(VALID_SKILL_CONTENT)).toBe(true);
  });

  it("documents mode/surface obligation matrix", () => {
    expect(hasModeSurfaceMatrix(VALID_SKILL_CONTENT)).toBe(true);
  });

  it("flags banned phrases when full-harness is defaulted", () => {
    const invalid = `${VALID_SKILL_CONTENT}\nfull-harness by default`;
    expect(scanBannedPhrases(invalid)).toContain("full-harness by default");
  });

  it("rejects content missing canonical surface in obligation matrix", () => {
    const invalid = VALID_SKILL_CONTENT.replaceAll("cli", "non-ui");
    expect(hasModeSurfaceMatrix(invalid)).toBe(false);
  });
});
