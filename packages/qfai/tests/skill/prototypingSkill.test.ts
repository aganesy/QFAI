import { describe, expect, it } from "vitest";

import {
  checkRequiredSections,
  hasCanonicalSurfaceDocumentation,
  hasCliSurfaceDocumentation,
  hasUiBearingFalseExclusion,
  isStaticFirstAligned,
  scanBannedPhrases,
  hasDelegationScopeTable,
  hasMandatoryEvidencePaths,
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
  "## Required References",
  "Read the reference documents before execution.",
  "",
  "## Required Process",
  "Follow the skill-orchestrated process.",
  "",
  "## Evaluator Inputs (Mandatory)",
  "screenshots, HTML snapshots, axisDefs, previousScore, designSystemChecklist",
  "",
  "## Delegation Scope Table",
  "| Screenshot capture | devops-ci-engineer |",
  "| Evaluation L1-L2 | product-surface-reviewer, product-experience-architect |",
  "",
  "Screenshot evidence path: .qfai/evidence/prototyping/screenshots/<screen-id>.png",
  "HTML snapshot path: .qfai/evidence/prototyping/html/<screen-id>.html",
].join("\n");

describe("prototyping skill validator", () => {
  it("has the required section headings", () => {
    const result = checkRequiredSections(VALID_SKILL_CONTENT);
    expect(result.present).toEqual([
      "## Required References",
      "## Required Process",
      "## Evaluator Inputs (Mandatory)",
    ]);
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

  it("documents delegation scope table", () => {
    expect(hasDelegationScopeTable(VALID_SKILL_CONTENT)).toBe(true);
  });

  it("documents canonical mandatory evidence paths", () => {
    expect(hasMandatoryEvidencePaths(VALID_SKILL_CONTENT)).toBe(true);
  });

  it("flags banned phrases when low-cost or standard are reintroduced", () => {
    const invalid = `${VALID_SKILL_CONTENT}\nmode=low-cost\nmode=standard`;
    expect(scanBannedPhrases(invalid)).toEqual(
      expect.arrayContaining(["mode=low-cost", "mode=standard"]),
    );
  });

  it("rejects content missing supported UI surface documentation", () => {
    const invalid = VALID_SKILL_CONTENT.replace(
      "Supported UI prototyping surfaces are: web, mobile, desktop, mixed.",
      "Supported UI prototyping surfaces are: web, mobile, desktop.",
    );
    expect(hasCanonicalSurfaceDocumentation(invalid)).toBe(false);
  });
});
