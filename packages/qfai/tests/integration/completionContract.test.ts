import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const templateRoot = path.join(repoRoot, "packages", "qfai", "assets", "init");
const implementSkillPath = path.join(
  templateRoot,
  ".qfai",
  "assistant",
  "skills",
  "qfai-implement",
  "SKILL.md",
);

let content: string;

async function loadContent(): Promise<string> {
  content ??= await readFile(implementSkillPath, "utf-8");
  return content;
}

// QFAI:SPEC-0016:TC-0016-0005
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
    expect(c).toMatch(/TDDSpecReviewer.*PASS|spec review.*PASS/i);
    expect(c).toMatch(/TDDCodeQualityReviewer.*PASS|code quality review.*PASS/i);
    expect(c).toMatch(/test-list\.md.*updated|Status.*Evidence.*updated/i);
    expect(c).toMatch(/checkpoint.*verif/i);
  });
});

// QFAI:SPEC-0016:TC-0016-0006
describe("item completion blocked: no RED evidence", () => {
  it("prohibits completion without RED evidence", async () => {
    const c = await loadContent();
    expect(c).toMatch(/no RED.*evidence[\s\S]*?must not|prohibition[\s\S]*?no RED/i);
  });
});

// QFAI:SPEC-0016:TC-0016-0007
describe("item completion blocked: no GREEN evidence", () => {
  it("prohibits completion without GREEN evidence", async () => {
    const c = await loadContent();
    expect(c).toMatch(/no GREEN.*evidence[\s\S]*?must not|prohibition[\s\S]*?no GREEN/i);
  });
});

// QFAI:SPEC-0016:TC-0016-0008
describe("item completion blocked: reviewer not run", () => {
  it("prohibits completion when TDDSpecReviewer has not been run", async () => {
    const c = await loadContent();
    expect(c).toMatch(
      /reviewer[\s\S]*?not.*run[\s\S]*?must not|prohibition[\s\S]*?reviewer[\s\S]*?not.*run/i,
    );
  });

  it("prohibits completion when TDDCodeQualityReviewer has not been run", async () => {
    const c = await loadContent();
    expect(c).toMatch(/TDDCodeQualityReviewer|code quality review/i);
    // Both reviewers must be mentioned in prohibition
    expect(c).toMatch(/TDDSpecReviewer.*TDDCodeQualityReviewer|both.*reviewer/i);
  });
});

// QFAI:SPEC-0016:TC-0016-0009
describe("TDDImplementer cannot self-approve code quality", () => {
  it("prohibits TDDImplementer from acting as TDDCodeQualityReviewer", async () => {
    const c = await loadContent();
    expect(c).toMatch(
      /TDDImplementer[\s\S]*?cannot[\s\S]*?TDDCodeQualityReviewer|self.approv[\s\S]*?prohibit/i,
    );
  });
});

// QFAI:SPEC-0016:TC-0016-0010
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

// QFAI:SPEC-0016:TC-0016-0011
describe("reviewer rejection/re-approval cycle", () => {
  it("defines reviewer rejection and re-approval flow", async () => {
    const c = await loadContent();
    // Handoff contracts must include FAIL->fix->resubmit flow
    expect(c).toMatch(/FAIL[\s\S]*?fix|rejection[\s\S]*?resubmit|FAIL.*required fix/i);
  });
});
