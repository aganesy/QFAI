import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROTOTYPING_SKILL_ASSET_DIR = path.resolve(
  __dirname,
  "../..",
  "assets/init/.qfai/assistant/skills/qfai-prototyping",
);

async function readPrototypingAsset(relativePath: string): Promise<string> {
  return readFile(path.join(PROTOTYPING_SKILL_ASSET_DIR, relativePath), "utf-8");
}

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
  "Prefer npx --no-install playwright whenever PATH reachability is not guaranteed.",
  "",
  "## Evaluator Inputs (Mandatory)",
  "screenshots, HTML snapshots, axisDefs, previousScore, designSystemChecklist",
  "",
  "## Delegation Scope Table",
  "| Playwright CLI execution & capture | devops-ci-engineer |",
  "| Evaluation scoring | product-surface-reviewer, product-experience-architect |",
  "",
  "Screenshot evidence path: .qfai/evidence/prototyping/iter-NN/<screen>.png",
  "HTML snapshot path: .qfai/evidence/prototyping/iter-NN/<screen>.html",
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

  it("documents a safe Playwright invocation path", () => {
    expect(hasPlaywrightCliFallback(VALID_SKILL_CONTENT)).toBe(true);
  });

  it("rejects unsafe bare npx playwright guidance", () => {
    // What the rule guards is the --no-install shape: a bare `npx playwright`
    // reaches the network and can install a package mid-run.
    const invalid = VALID_SKILL_CONTENT.replace("npx --no-install playwright", "npx playwright");
    expect(hasPlaywrightCliFallback(invalid)).toBe(false);
  });

  it("flags banned phrases when v1.x mode wording is reintroduced", () => {
    // v2.0 (spec-0012 absorbed): mode (recommended_mode / low-cost / standard) and
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

describe("prototyping skill asset — multi-spec wiring (spec-0012 CHG-002)", () => {
  // TC-0012-0356: SKILL.md and the iteration-loop reference must no
  // longer prompt for a per-invocation primary spec; instead they must
  // reference the multi-spec resolver `resolveAllUiBearingSpecs`.
  it("SKILL.md does not contain a per-invocation primary-spec selection prompt", async () => {
    const skillContent = await readPrototypingAsset("SKILL.md");

    // Literal absence checks for prior single-spec selection phrasing.
    // These were the exact prompts the v2.0 / UX-loop SKILL.md used to
    // ask the operator to pick one spec per invocation; under the
    // multi-spec rewrite there must be no such prompt anywhere in the
    // asset. The `## Default Autopilot Policy` block is excluded from
    // this scan because it MAY (and does) list `primarySpecId` as a
    // hard-required field name; that listing is a contract reference,
    // not a per-invocation selection prompt.
    const policyHeadingRe = /^##\s+Default Autopilot Policy\s*$/m;
    const nextHeadingRe = /^##\s+/m;
    let scannableContent = skillContent;
    const headingMatch = policyHeadingRe.exec(skillContent);
    if (headingMatch) {
      const start = headingMatch.index;
      const afterStart = start + headingMatch[0].length;
      const next = nextHeadingRe.exec(skillContent.slice(afterStart));
      const end = next ? afterStart + next.index : skillContent.length;
      scannableContent = skillContent.slice(0, start) + skillContent.slice(end);
    }

    const forbiddenPhrases = [
      "selected spec is UI-bearing",
      "select a primary spec",
      "select the primary spec",
      "select primary spec",
      "primary spec id",
      "primary_spec_id",
      "primarySpecId",
      "プライマリ spec",
      "プライマリスペック",
    ];
    const lower = scannableContent.toLowerCase();
    for (const phrase of forbiddenPhrases) {
      expect(lower.includes(phrase.toLowerCase()), `SKILL.md should not contain '${phrase}'`).toBe(
        false,
      );
    }
  });

  it("SKILL.md references the multi-spec resolver resolveAllUiBearingSpecs", async () => {
    const skillContent = await readPrototypingAsset("SKILL.md");
    expect(skillContent).toContain("resolveAllUiBearingSpecs");
    // The wording must be unambiguous about "one invocation / multi-spec"
    // semantics so downstream operators do not re-introduce a per-spec
    // selection step.
    expect(skillContent.toLowerCase()).toMatch(/every ui-bearing spec[\s\S]{0,80}one invocation/i);
  });
});
