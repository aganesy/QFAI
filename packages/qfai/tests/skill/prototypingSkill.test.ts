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
  hasEnvironmentPreconditions,
  hasPreflightGuidance,
  hasPlaywrightCliFallback,
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
  "### Step 2-A — Verify Contract Preconditions",
  "classification is UI-bearing",
  "",
  "### Step 2-B — Verify Environment Preconditions",
  "Run qfai prototyping preflight --target-url <url> or qfai doctor --profile prototyping.",
  "Prefer npx --no-install playwright-cli whenever PATH reachability is not guaranteed.",
  "",
  "## Evaluator Inputs (Mandatory)",
  "screenshots, HTML snapshots, axisDefs, previousScore, designSystemChecklist",
  "",
  "## Delegation Scope Table",
  "| Playwright CLI execution & capture | devops-ci-engineer |",
  "| Evaluation scoring | product-surface-reviewer, product-experience-architect |",
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

  it("documents environment preconditions as a separate step", () => {
    expect(hasEnvironmentPreconditions(VALID_SKILL_CONTENT)).toBe(true);
  });

  it("rejects content missing Step 2-A even when Step 2-B is present", () => {
    const invalid = VALID_SKILL_CONTENT.replace(
      "### Step 2-A — Verify Contract Preconditions\nclassification is UI-bearing\n\n",
      "",
    );
    expect(hasEnvironmentPreconditions(invalid)).toBe(false);
  });

  it("documents preflight guidance", () => {
    expect(hasPreflightGuidance(VALID_SKILL_CONTENT)).toBe(true);
  });

  it("documents Playwright CLI fallback guidance", () => {
    expect(hasPlaywrightCliFallback(VALID_SKILL_CONTENT)).toBe(true);
  });

  it("rejects unsafe bare npx playwright-cli fallback guidance", () => {
    const invalid = VALID_SKILL_CONTENT.replace(
      "npx --no-install playwright-cli",
      "npx playwright-cli",
    );
    expect(hasPlaywrightCliFallback(invalid)).toBe(false);
  });

  it("flags banned phrases when v1.x mode wording is reintroduced", () => {
    // v2.0 (spec-0017): mode (recommended_mode / low-cost / standard) and
    // L1/L2 reviewer separation are removed. The banned-phrase scanner
    // still flags re-introductions.
    const invalid = `${VALID_SKILL_CONTENT}\nl1 and l2 must run runtime checks\nrecommended_mode: standard-tier`;
    expect(scanBannedPhrases(invalid)).toEqual(
      expect.arrayContaining(["must run runtime checks", "recommended_mode", "l1 and l2"]),
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
