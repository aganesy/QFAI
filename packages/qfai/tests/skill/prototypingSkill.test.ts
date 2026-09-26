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
  hasMandatoryEvidencePaths,
  hasEnvironmentPreconditions,
  hasPreflightGuidance,
  hasPlaywrightCliFallback,
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

const VALID_SKILL_CONTENT = [
  "# Prototyping Skill",
  "",
  "This workflow is static-first and file-based by default.",
  "",
  "Supported UI prototyping surfaces are: web, mobile, desktop, mixed.",
  "cli is not a prototyping execution target and is rejected.",
  "Only UI contracts with a full CON-UI-NNNN ID and non-empty screens[] enter prototyping execution.",
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
  "| Generation and implementation | product-experience-architect |",
  "| Live Playwright review and evaluation scoring | product-surface-reviewer |",
  "| Build | devops-ci-engineer, backend-engineer |",
  "| Optional Playwright CLI execution & capture | devops-ci-engineer |",
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

  it("limits prototyping to UI contracts with declared screens", () => {
    expect(hasUiContractScope(VALID_SKILL_CONTENT)).toBe(true);
    expect(hasUiContractScope("ui_bearing: false specs are excluded.")).toBe(false);
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

  // QFAI:EX-0001-0042-01
  it("reports a missing required section and missing canonical evidence paths", () => {
    const withoutSection = VALID_SKILL_CONTENT.replace("## Required References\n", "");
    expect(checkRequiredSections(withoutSection).missing).toEqual(["## Required References"]);
    const withoutPaths = VALID_SKILL_CONTENT.replace(
      "Screenshot evidence path: .qfai/evidence/prototyping/iter-NN/<screen>.png\n",
      "",
    ).replace("HTML snapshot path: .qfai/evidence/prototyping/iter-NN/<screen>.html", "");
    expect(hasMandatoryEvidencePaths(withoutPaths)).toBe(false);
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
    expect(skillContent).toContain("CON-UI-NNNN");
    expect(skillContent).toContain("screens[]");
    expect(skillContent).toContain("primaryUiContract");
    expect(skillContent).not.toContain("primarySpecId");
    expect(skillContent).not.toMatch(/select (?:a|the) primary spec/i);
  });

  it("places review evidence under full UI contract IDs", async () => {
    const loop = await readPrototypingAsset("references/iteration-loop.md");
    expect(loop).toContain("CON-UI-NNNN");
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

  it("the reviewer prompt requires live operation and treats capture inputs as optional", async () => {
    const inputs = section(await readPrototypingAsset("references/reviewer-prompt.md"), "Inputs");
    for (const input of [
      "live prototype URL",
      "your own Playwright session",
      "When `iterate --capture` is selected",
      "They are absent by default",
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

  it("SKILL.md delegates generation and evaluation to two different sub-agents", async () => {
    const skill = await readPrototypingAsset("SKILL.md");
    expect(skill).toMatch(
      /^\|\s*Generation and implementation\s*\|\s*product-experience-architect\s*\|/m,
    );
    expect(skill).toMatch(
      /^\|\s*Live Playwright review and evaluation scoring\s*\|\s*product-surface-reviewer\s*\|/m,
    );
    expect(skill).toContain("does not require a third sub-agent identity");
    expect(skill).toContain("optional `iterate --capture` CLI operation");
    expect(skill).toContain("The reviewer operates Playwright live");
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

  it("assigns review evidence conversion and screen coverage to the skill writer", async () => {
    const [skill, loop, prompt] = await Promise.all([
      readPrototypingAsset("SKILL.md"),
      readPrototypingAsset("references/iteration-loop.md"),
      readPrototypingAsset("references/reviewer-prompt.md"),
    ]);
    expect(skill).toContain("The CLI writes a seed iteration");
    expect(skill).toContain("Check the summary's `evidenceRefs[]` array");
    expect(skill).toContain("reject duplicate screen/kind pairs, missing screens");
    expect(skill).toMatch(/With `--capture`, require a screenshot and HTML\s+path/);
    expect(skill).toContain("Without `--capture`, store `evidenceRefs: []`");
    expect(skill).toContain("`buildEvidenceRefs()` is a pure helper, not an automatic");
    expect(loop).toMatch(/each declared screen must have exactly one entry per required kind/);
    expect(loop).toContain("The closed");
    expect(prompt).toContain('evidenceRefs: { kind: "screenshot" | "html"; path: string }[]');
  });
});
