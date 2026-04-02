import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const templateRoot = path.join(repoRoot, "packages", "qfai", "assets", "init");
const uiuxTemplateDir = path.join(
  templateRoot,
  ".qfai",
  "assistant",
  "skills",
  "qfai-discussion",
  "templates",
  "uiux",
);
const implementSkillPath = path.join(
  templateRoot,
  ".qfai",
  "assistant",
  "skills",
  "qfai-implement",
  "SKILL.md",
);

let content: string | undefined;

async function loadContent(): Promise<string> {
  content ??= await readFile(implementSkillPath, "utf-8");
  return content;
}

// QFAI:SPEC-0011:TC-0011-0005
describe("10-point checklist end-to-end enforcement", () => {
  it("defines a 10-point item completion checklist", async () => {
    const c = await loadContent();
    expect(c).toMatch(/10-point/i);
    // Must contain all 10 gate items
    expect(c).toMatch(/TDD-ID.*selected|selected.*TDD-ID/i);
    expect(c).toMatch(/failing test.*first|test.first/i);
    expect(c).toMatch(/RED.*observed|watch it fail/i);
    expect(c).toMatch(/minimal.*code|minimum.*code/i);
    expect(c).toMatch(/GREEN.*observed|watch it pass/i);
    expect(c).toMatch(/refactor.*GREEN|GREEN.*refactor/i);
    expect(c).toMatch(/completion-reviewer.*PASS|spec review.*PASS/i);
    expect(c).toMatch(/implementation-reviewer.*PASS|code quality review.*PASS/i);
    expect(c).toMatch(/test-list\.md.*updated|Status.*Evidence.*updated/i);
    expect(c).toMatch(/checkpoint.*verif/i);
  });
});

// QFAI:SPEC-0011:TC-0011-0006
describe("item completion blocked: no RED evidence", () => {
  it("prohibits completion without RED evidence", async () => {
    const c = await loadContent();
    expect(c).toMatch(/no RED.*evidence[\s\S]*?must not|prohibition[\s\S]*?no RED/i);
  });
});

// QFAI:SPEC-0011:TC-0011-0007
describe("item completion blocked: no GREEN evidence", () => {
  it("prohibits completion without GREEN evidence", async () => {
    const c = await loadContent();
    expect(c).toMatch(/no GREEN.*evidence[\s\S]*?must not|prohibition[\s\S]*?no GREEN/i);
  });
});

// QFAI:SPEC-0011:TC-0011-0008
describe("item completion blocked: reviewer not run", () => {
  it("prohibits completion when completion-reviewer has not been run", async () => {
    const c = await loadContent();
    expect(c).toMatch(
      /reviewer[\s\S]*?not.*run[\s\S]*?must not|prohibition[\s\S]*?reviewer[\s\S]*?not.*run/i,
    );
  });

  it("prohibits completion when implementation-reviewer has not been run", async () => {
    const c = await loadContent();
    expect(c).toMatch(/implementation-reviewer|code quality review/i);
    expect(c).toMatch(/completion-reviewer[\s\S]*?implementation-reviewer|Either reviewer/i);
  });
});

// QFAI:SPEC-0011:TC-0011-0009
describe("implementation review remains independent from the implementation agent", () => {
  it("requires implementation-reviewer evidence instead of self-approval", async () => {
    const c = await loadContent();
    expect(c).toMatch(/Code quality review.*implementation-reviewer result/i);
    expect(c).toMatch(
      /Only after all routed blocking reviewers pass may the item transition to `done`/i,
    );
  });
});

// QFAI:SPEC-0011:TC-0011-0010
describe("spec-level completion conditions", () => {
  it("defines spec completion conditions", async () => {
    const c = await loadContent();
    expect(c).toMatch(/spec completion/i);
    // All TCs must be in test-list.md
    expect(c).toMatch(/TC-\*[\s\S]*?test-list\.md|all.*TC/i);
    // 0 blocking reviewer issues
    expect(c).toMatch(/0.*blocking.*reviewer|blocking.*issue/i);
  });

  it("blocks spec completion when items are still in progress", async () => {
    const c = await loadContent();
    // Must mention that todo/red/green/refactor items block spec completion
    expect(c).toMatch(/todo.*red.*green.*refactor[\s\S]*?still|items.*still.*exist/i);
  });
});

// QFAI:SPEC-0011:TC-0011-0011
describe("reviewer rejection/re-approval cycle", () => {
  it("defines reviewer rejection and re-approval flow", async () => {
    const c = await loadContent();
    // Handoff contracts must include FAIL->fix->resubmit flow
    expect(c).toMatch(/FAIL[\s\S]*?fix|rejection[\s\S]*?resubmit|FAIL.*required fix/i);
  });
});

// ---------------------------------------------------------------------------
// spec-0001: Canonical template generation / deprecation
// ---------------------------------------------------------------------------

// QFAI:SPEC-0003:TC-0003-0052
describe("TC-0003-0052: canonical template generation", () => {
  it("verifies 6 canonical UIX evaluation templates exist after init", async () => {
    const files = await readdir(uiuxTemplateDir);
    const canonicalTemplates = files.filter(
      (f) =>
        f.startsWith("10_") ||
        f.startsWith("20_") ||
        f.startsWith("21_") ||
        f.startsWith("22_") ||
        f.startsWith("23_") ||
        f.startsWith("30_"),
    );
    expect(canonicalTemplates.length).toBeGreaterThanOrEqual(6);
    for (const tpl of canonicalTemplates) {
      await expect(access(path.join(uiuxTemplateDir, tpl))).resolves.toBeUndefined();
    }
  });
});

// QFAI:SPEC-0003:TC-0003-0053
describe("TC-0003-0053: 00_index.md references canonical family", () => {
  it("canonical family referenced in 00_index.md, no 4-axis model refs", async () => {
    const indexPath = path.join(uiuxTemplateDir, "00_index.md");
    const content = await readFile(indexPath, "utf-8");
    // References evaluation axis files
    expect(content).toMatch(/design_eval|evaluation layer|scoring axes/i);
    // No standalone 4-axis model references
    expect(content).not.toMatch(/\b4-axis model\b/i);
    expect(content).not.toMatch(/\bfour-axis model\b/i);
  });
});

// QFAI:SPEC-0003:TC-0003-0054
describe("TC-0003-0054: old template deprecation marking", () => {
  it("canonical templates use evaluation axis naming, not deprecated 4-axis", async () => {
    const files = await readdir(uiuxTemplateDir);
    const evalAxisFiles = files.filter((f) => /^2[0-3]_design_eval_/.test(f));
    expect(evalAxisFiles.length).toBeGreaterThanOrEqual(4);
    // Each eval file uses 3-layer naming
    for (const f of evalAxisFiles) {
      expect(f).toMatch(/design_eval_(invariant|trend_derived|product_specific|aggregate)/);
    }
  });
});

// ---------------------------------------------------------------------------
// spec-0002: Canonical entrypoint wiring / old aggregator deprecation
// ---------------------------------------------------------------------------

// QFAI:SPEC-0004:TC-0004-0035
describe("TC-0004-0035: canonical entrypoint wiring", () => {
  it("validateProject source calls runCanonicalUixValidators", async () => {
    const validateSrc = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validate.ts"),
      "utf-8",
    );
    expect(validateSrc).toContain("runCanonicalUixValidators");
  });
});

// QFAI:SPEC-0004:TC-0004-0036
describe("TC-0004-0036: runAllUixValidators export exists", () => {
  it("runAllUixValidators is exported from uixValidators module", async () => {
    const validatorsSrc = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "core", "validators", "uixValidators.ts"),
      "utf-8",
    );
    expect(validatorsSrc).toMatch(/export\s+(async\s+)?function\s+runAllUixValidators/);
  });
});
