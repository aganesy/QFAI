import { describe, expect, it } from "vitest";

import {
  checkModeHeadings,
  hasModeSurfaceMatrix,
  hasNonUiNaDocumentation,
  isStaticFirstAligned,
  scanBannedPhrases,
} from "../../src/core/validators/skill/prototypingSkill.js";

const VALID_SKILL_CONTENT = [
  "# Prototyping Skill",
  "",
  "This workflow is static-first and file-based by default.",
  "",
  "## Low-cost",
  "Static checks only. UI-bearing projects may keep skeleton evidence.",
  "",
  "## Standard",
  "Static checks plus optional light validation.",
  "",
  "## Full-harness",
  "Explicit request only. Never full-harness by default.",
  "",
  "## Obligation Matrix",
  "| surface / mode | specs | runtimeGate | uiFidelity | render evidence | browser QA | fullHarness |",
  "| non-ui / low-cost | required | optional | n/a | n/a | n/a | absent |",
  "| ui-bearing / standard | required | optional | required | optional | optional | absent |",
  "| ui-bearing / full-harness | required | required | required | required | required | required |",
  "",
  "Non-UI projects: absent is normal success and n/a semantics apply.",
].join("\n");

describe("prototyping skill validator", () => {
  it("has all mode section headings", () => {
    const result = checkModeHeadings(VALID_SKILL_CONTENT);
    expect(result.missing).toHaveLength(0);
  });

  it("documents non-ui n/a semantics", () => {
    expect(hasNonUiNaDocumentation(VALID_SKILL_CONTENT)).toBe(true);
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
});
