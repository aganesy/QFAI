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
  "Supported UI prototyping surfaces are: web, mobile, desktop, mixed.",
  "cli is not a prototyping execution target and is rejected.",
  "ui_bearing: false specs are not prototyping execution targets.",
  "",
  "## Full-harness",
  "Full-harness is the package default when prototyping execution is valid.",
  "",
  "## Obligation Matrix",
  "| surface / mode | specs | runtimeGate | uiFidelity | render evidence | browser QA | fullHarness |",
  "| web / full-harness | required | required | required | required | required | required |",
  "| mobile / full-harness | required | required | required | required | required | required |",
  "| desktop / full-harness | required | required | required | required | required | required |",
  "| mixed / full-harness | required | required | required | required | required | required |",
].join("\n");

describe("prototyping skill validator", () => {
  it("has the full-harness section heading", () => {
    const result = checkModeHeadings(VALID_SKILL_CONTENT);
    expect(result.present).toEqual(["full-harness"]);
    expect(result.missing).toHaveLength(0);
  });

  it("documents supported UI prototyping surfaces", () => {
    expect(hasCanonicalSurfaceDocumentation(VALID_SKILL_CONTENT)).toBe(true);
  });

  it("documents cli rejection", () => {
    expect(hasCliSurfaceDocumentation(VALID_SKILL_CONTENT)).toBe(true);
  });

  it("documents ui_bearing: false exclusion", () => {
    expect(hasUiBearingFalseExclusion(VALID_SKILL_CONTENT)).toBe(true);
  });

  it("documents static-first semantics", () => {
    expect(isStaticFirstAligned(VALID_SKILL_CONTENT)).toBe(true);
  });

  it("documents full-harness-only obligation matrix", () => {
    expect(hasModeSurfaceMatrix(VALID_SKILL_CONTENT)).toBe(true);
  });

  it("flags banned phrases when low-cost or standard are reintroduced", () => {
    const invalid = `${VALID_SKILL_CONTENT}\nmode=low-cost\nmode=standard`;
    expect(scanBannedPhrases(invalid)).toEqual(
      expect.arrayContaining(["mode=low-cost", "mode=standard"]),
    );
  });

  it("rejects content missing supported UI surface in obligation matrix", () => {
    const invalid = VALID_SKILL_CONTENT.replace(
      "Supported UI prototyping surfaces are: web, mobile, desktop, mixed.",
      "Supported UI prototyping surfaces are: web, mobile, desktop.",
    ).replace(
      "| mixed / full-harness | required | required | required | required | required | required |",
      "",
    );
    expect(hasModeSurfaceMatrix(invalid)).toBe(false);
  });
});
