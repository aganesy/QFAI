import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { readImplementFlowSteps } from "../helpers/implementSteps.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const templateRoot = path.join(repoRoot, "packages", "qfai", "assets", "init");
const uiuxTemplateDir = path.join(
  templateRoot,
  ".qfai",
  "assistant",
  "skill",
  "qfai-discussion",
  "templates",
  "uiux",
);
const implementSkillPath = path.join(
  templateRoot,
  ".qfai",
  "assistant",
  "skill",
  "qfai-implement",
  "SKILL.md",
);
const implementAssistantDir = path.join(templateRoot, ".qfai", "assistant");

let content: string | undefined;

async function loadContent(): Promise<string> {
  content ??= await readImplementFlowSteps(implementAssistantDir);
  return content;
}

describe("BF completion gate", () => {
  it("requires a fresh BF-scoped validator result with no owed EX tests", async () => {
    const c = await loadContent();
    expect(c).toMatch(/## Select the next example/);
    expect(c).toMatch(/qfai validate --profile tdd --flow BF-NNNN/);
    expect(c).toMatch(/generatedAt.*no earlier than this run start/);
    expect(c).toMatch(/lowest EX ID.*test-obligation EX findings/);
  });

  it("requires observed RED, GREEN, and Refactor results for every implemented EX", async () => {
    const c = await loadContent();
    expect(c).toMatch(/Observe the assertion fail for the intended behavior before changing/);
    expect(c).toMatch(
      /load error, missing dependency, or broken fixture is\s+not an admissible RED/,
    );
    expect(c).toMatch(/Run the same selector and record\s+command, outcome, and revision/);
    expect(c).toMatch(/A failing or unrun gate cannot be reported as PASS/);
  });

  it("reports nothing to do only after a current scoped TDD gate finds no owed EX", async () => {
    // QFAI:EX-0001-0094-02
    const c = await loadContent();
    const skill = (await readFile(implementSkillPath, "utf8")).replace(/\s+/g, " ");
    expect(c).toContain("including decision exceptions");
    expect(skill).toContain("fresh validate result has no test-obligation EX finding for this BF");
    expect(skill).toContain('the invocation reports "nothing to do"');
    expect(skill).toContain("reads or writes no ledger status");
    expect(c).not.toContain("test-list.md");
  });

  it("stops selection when the scoped result is missing, stale or from another profile", async () => {
    const c = await loadContent();
    expect(c).toContain("Read its `validate.flow-<ids>.json` result even when the command exits");
    expect(c).toContain("the file exists, `profile` is");
    expect(c).toContain("`tdd`, and `generatedAt` is no earlier than this run start");
    expect(c).toContain("stop and report the command, exit result, and missing or stale field");
    expect(c).toContain("never infer that the flow has no remaining work");
  });
});
// ---------------------------------------------------------------------------
// spec-0010: Canonical template generation / deprecation
// ---------------------------------------------------------------------------

describe("canonical templates ship with the UI-bearing family", () => {
  it("verifies UI-bearing UIX templates exist after init", async () => {
    const files = await readdir(uiuxTemplateDir);
    // Brand-level inputs moved to root DESIGN.md; only screen-level
    // sidecars remain.
    const canonicalTemplates = files.filter((f) =>
      ["40_screen_contracts.md", "50_review_input_bundle.md"].includes(f),
    );
    expect(canonicalTemplates.length).toBeGreaterThanOrEqual(2);
    for (const tpl of canonicalTemplates) {
      await expect(access(path.join(uiuxTemplateDir, tpl))).resolves.toBeUndefined();
    }
  });
});

describe("00_index.md references canonical family", () => {
  it("canonical family referenced in 00_index.md, no legacy evaluation family refs", async () => {
    const indexPath = path.join(uiuxTemplateDir, "00_index.md");
    const content = await readFile(indexPath, "utf-8");
    expect(content).toMatch(/exploration brief|reference pool|exploration rubric/i);
    expect(content).toMatch(/forbidden legacy files/i);
  });
});

describe("old template deprecation marking", () => {
  it("canonical templates use exploration-first naming, not deprecated evaluation-axis files", async () => {
    const files = await readdir(uiuxTemplateDir);
    expect(files).not.toContain("30_option_comparison.md");
    expect(files).not.toContain("31_selected_anchor_screen.md");
    expect(files).not.toContain("20_design_eval_invariant.md");
    expect(files).not.toContain("23_design_eval_aggregate.md");
    // v2.0: 33/34 also removed (replaced by global anti-slop in reviewer-prompt).
    expect(files).not.toContain("33_exploration_rubric.md");
    expect(files).not.toContain("34_evaluator_calibration.md");
  });
});

// ---------------------------------------------------------------------------
// spec-0002: Canonical entrypoint wiring / old aggregator deprecation
// ---------------------------------------------------------------------------

describe("canonical entrypoint wiring", () => {
  it("validateProject source calls runCanonicalUixValidators", async () => {
    const validateSrc = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validate.ts"),
      "utf-8",
    );
    expect(validateSrc).toContain("runCanonicalUixValidators");
  });
});
