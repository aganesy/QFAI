import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  checkRequiredSections,
  hasCanonicalSurfaceDocumentation,
  hasCliSurfaceDocumentation,
  hasUiContractScope,
  isStaticFirstAligned,
  scanBannedPhrases,
  hasDelegationScopeTable,
  hasEnvironmentPreconditions,
  hasPreflightGuidance,
  hasPlaywrightCliFallback,
  validatePrototypingSkillContent,
} from "../../src/core/validators/skill/prototypingSkill.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROTOTYPING_SKILL_ASSET_DIR = path.resolve(
  __dirname,
  "../..",
  "assets/init/.qfai/assistant/skill/qfai-prototyping",
);

async function readPrototypingAsset(relativePath: string): Promise<string> {
  return readFile(path.join(PROTOTYPING_SKILL_ASSET_DIR, relativePath), "utf-8");
}

/** The loop step, which carries the delegation table and the transcription rules. */
async function readLoopStep(): Promise<string> {
  return readFile(
    path.resolve(__dirname, "../..", "assets/init/.qfai/assistant/step/prototyping-loop/STEP.md"),
    "utf-8",
  );
}

const VALID_SKILL_CONTENT = [
  "# Prototyping Skill",
  "",
  "This workflow is static-first and file-based by default.",
  "",
  "Supported UI prototyping surfaces are: web, mobile, desktop, mixed.",
  "cli is not a prototyping execution target and is rejected.",
  "Only UI contracts with a full UI-NNNN ID and non-empty screens[] enter prototyping execution.",
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
  "Run qfai doctor --profile prototyping --target-url <url>.",
  "Prefer npx --no-install playwright whenever PATH reachability is not guaranteed.",
  "",
  "## Evaluator Inputs (Mandatory)",
  "screenshots, HTML snapshots, axisDefs, previousScore, designSystemChecklist",
  "",
  "## Delegation Scope Table",
  "| Generation and implementation | product-experience-architect |",
  "| Live Playwright review and evaluation scoring | product-surface-reviewer |",
  "| Build | devops-ci-engineer, backend-engineer |",
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

  it("limits prototyping to UI contracts with declared screens", () => {
    expect(hasUiContractScope(VALID_SKILL_CONTENT)).toBe(true);
    expect(hasUiContractScope("ui_bearing: false specs are excluded.")).toBe(false);
  });

  // QFAI:EX-0001-0042-15
  it("does not read the retired CON-UI-NNNN form as the UI contract scope", () => {
    const retired = VALID_SKILL_CONTENT.replace("full UI-NNNN ID", "full CON-UI-NNNN ID");

    expect(hasUiContractScope(retired)).toBe(false);
    expect(validatePrototypingSkillContent(retired).issues.map((item) => item.code)).toContain(
      "UIX-VAL-SKILL-UI-BEARING-FALSE",
    );
    expect(
      validatePrototypingSkillContent(VALID_SKILL_CONTENT).issues.map((item) => item.code),
    ).not.toContain("UIX-VAL-SKILL-UI-BEARING-FALSE");
  });

  it("documents static-first semantics", () => {
    expect(isStaticFirstAligned(VALID_SKILL_CONTENT)).toBe(true);
  });

  it("documents delegation scope table", () => {
    expect(hasDelegationScopeTable(VALID_SKILL_CONTENT)).toBe(true);
  });

  // QFAI:EX-0001-0042-01
  it("reports a missing required section", () => {
    const withoutSection = VALID_SKILL_CONTENT.replace("## Required References\n", "");
    expect(checkRequiredSections(withoutSection).missing).toEqual(["## Required References"]);
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

  it.each(["playwright-does-not-exist", "playwright-wrapper", "playwrightx"])(
    "rejects %s, which only starts with the launcher name",
    (impostor) => {
      // A substring test accepted any command whose name merely begins with
      // `playwright`, so a skill could satisfy the rule while documenting a
      // launcher that does not exist. The match is anchored at the end of the
      // name.
      const invalid = VALID_SKILL_CONTENT.split("npx --no-install playwright").join(
        `npx --no-install ${impostor}`,
      );
      expect(hasPlaywrightCliFallback(invalid)).toBe(false);
    },
  );

  it.each([
    "npx --no-install playwright",
    "npx --no-install playwright-cli",
    "node_modules/.bin/playwright",
  ])("accepts %s", (form) => {
    // `playwright-cli` stays accepted: a project that has not migrated its
    // docs still documents a real, non-installing launcher.
    expect(hasPlaywrightCliFallback(`Run \`${form} --version\` first.`)).toBe(true);
  });

  // QFAI:EX-0001-0042-01
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

describe("prototyping skill asset — UI contract scope", () => {
  it("requires canonical UI contracts with screens and no spec-pack primary pin", async () => {
    const skillContent = await readPrototypingAsset("SKILL.md");
    expect(skillContent).toContain("UI-NNNN");
    expect(skillContent).toContain("screens[]");
    expect(skillContent).toContain("primaryUiContract");
    expect(skillContent).not.toContain("primarySpecId");
    expect(skillContent).not.toMatch(/select (?:a|the) primary spec/i);
  });

  it("places review evidence under full UI contract IDs", async () => {
    const loop = await readPrototypingAsset("references/iteration-loop.md");
    expect(loop).toContain("UI-NNNN");
    expect(loop).not.toContain("iter-NN/spec-NNNN/");
  });
});

describe("prototyping skill asset — the reviewer and its inputs", () => {
  /** One level-2 section of a Markdown asset, heading excluded. */
  function section(markdown: string, heading: string): string {
    const start = markdown.indexOf(`\n## ${heading}\n`);
    if (start < 0) throw new Error(`no "## ${heading}" section`);
    const body = markdown.slice(start + heading.length + 5);
    const next = body.search(/\n## /);
    return next < 0 ? body : body.slice(0, next);
  }

  it("the reviewer prompt requires live operation and treats screenshots as optional", async () => {
    const inputs = section(await readPrototypingAsset("references/reviewer-prompt.md"), "Inputs");
    for (const input of [
      "live prototype URL",
      "your own Playwright session",
      "A screenshot or HTML snapshot, only when one was taken",
      "Prior reviews:",
      "Root `DESIGN.md`",
    ]) {
      expect(inputs, `the Inputs section names ${input}`).toContain(input);
    }
  });

  it("the reviewer prompt leaves brand identity to root DESIGN.md and carries the lap-* catalog", async () => {
    const prompt = await readPrototypingAsset("references/reviewer-prompt.md");
    expect(prompt).toMatch(/Brand identity \([^)]*\) is\s+locked by root `DESIGN\.md`/);
    expect(prompt).toMatch(/^## Layout anti-pattern matching \(`lap-\*`\)$/m);
  });

  it("the loop step delegates generation and evaluation to two different sub-agents", async () => {
    const skill = await readLoopStep();
    expect(skill).toMatch(
      /^\|\s*Generation and implementation\s*\|\s*product-experience-architect\s*\|/m,
    );
    expect(skill).toMatch(
      /^\|\s*Live Playwright review and evaluation scoring\s*\|\s*product-surface-reviewer\s*\|/m,
    );
    expect(skill).toMatch(/Generation and review use two distinct sub-agent\s+identities\./);
    expect(skill).toMatch(/There is\s+no fixed capture identity/);
    expect(skill).toMatch(/operates\s+Playwright live/);
  });

  it("requires the reviewer to score four ordinal axes while retaining six per-screen Feel fields", async () => {
    const prompt = await readPrototypingAsset("references/reviewer-prompt.md");
    for (const axis of [
      "informationArchitecture",
      "navigationFlow",
      "usability",
      "functionality",
    ]) {
      expect(prompt).toContain(`${axis}: "weak" | "acceptable" | "strong" | "exceptional"`);
    }
    expect(prompt).toContain("six bounded `impressions.*Feel` fields");
    expect(prompt).toContain("A favorable");
    expect(prompt).toContain("numeric AC-pass or");
    expect(prompt).toContain("Good: on `checkout`");
    expect(prompt).toContain("Bad: record only");
    expect(prompt).not.toContain("No axis, no rating, no aggregate");
  });
});
