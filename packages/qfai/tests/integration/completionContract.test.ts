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
describe("item completion checklist end-to-end enforcement", () => {
  it("defines a numbered item completion checklist", async () => {
    const c = await loadContent();
    // #251 split the evidence write into its own gate point, so the count in
    // the heading is not fixed at 11. The obligation is that the checklist
    // exists and covers every gate item below.
    const heading = /Item completion checklist \((\d+)-point gate\)/i.exec(c);
    // Thrown rather than only asserted so the type is narrowed for the lines
    // below. With optional chaining, a heading that stopped matching would
    // slice from index 0 and make `declared` NaN, and the failure would surface
    // as an opaque length mismatch instead of "the heading is missing".
    if (!heading) {
      throw new Error("the checklist heading must declare its point count");
    }

    // Pin the declared count to the list itself: a heading and a list that
    // disagree is how "12-point gate" shipped over an 11-item list, and a
    // count-agnostic regex alone cannot see that.
    const listSection = c.slice(heading.index);
    const items = Array.from(listSection.matchAll(/^(\d+)\. /gm), (match) => Number(match[1]));
    const declared = Number(heading[1]);
    const numbered: number[] = [];
    for (const item of items) {
      if (item !== numbered.length + 1) break;
      numbered.push(item);
    }
    expect(numbered).toHaveLength(declared);
    // Must contain every gate item
    expect(c).toMatch(/TDD-ID.*selected|selected.*TDD-ID/i);
    expect(c).toMatch(/failing test.*first|test.first/i);
    expect(c).toMatch(/RED.*observed|watch it fail/i);
    expect(c).toMatch(/minimal.*code|minimum.*code/i);
    expect(c).toMatch(/GREEN.*observed|watch it pass/i);
    expect(c).toMatch(/refactor.*GREEN|GREEN.*refactor/i);
    expect(c).toMatch(/completion-reviewer.*PASS|spec review.*PASS/i);
    expect(c).toMatch(/implementation-reviewer.*PASS|code quality review.*PASS/i);
    expect(c).toMatch(
      /prototype parity.*product-surface-reviewer|product-surface-reviewer.*prototype parity/i,
    );
    // The gate item was restated against the Evidence *anchor* (#358): the cell
    // is a pointer, because a GFM cell cannot hold a command's output.
    expect(c).toMatch(
      /test-list\.md.*updated|Status.*Evidence.*updated|Evidence cell's anchor resolves to a fresh per-item entry/i,
    );
    // The gate point #251 added: the verdict half of the evidence file is
    // appended only after both reviewers have returned PASS.
    // The file is named by item 10, not hard-coded here: an `E2E` / `API` /
    // `Integration` row's evidence lives in `atdd-<spec-id>.md`, because that is
    // the stage that ran its RED. Pinning `implement-<spec-id>.md` in this gate
    // is what made a correctly evidenced ATDD-owned row unable to reach `done`,
    // and naming only two of the three layers here re-pinned the same defect for
    // the `Integration` row.
    expect(c).toMatch(
      /The item's evidence file \(item 10\) is appended with both reviewer verdicts after items 7-8 returned PASS/,
    );
    expect(c).toMatch(
      /`\.qfai\/evidence\/atdd-<spec-id>\.md` for an `E2E` \/ `API` \/ `Integration` row/,
    );
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
      /Only after every required reviewer passes may the item transition to `done`/i,
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

// QFAI:SPEC-0003:TC-0003-0053
describe("TC-0003-0053: 00_index.md references canonical family", () => {
  it("canonical family referenced in 00_index.md, no legacy evaluation family refs", async () => {
    const indexPath = path.join(uiuxTemplateDir, "00_index.md");
    const content = await readFile(indexPath, "utf-8");
    expect(content).toMatch(/exploration brief|reference pool|exploration rubric/i);
    expect(content).toMatch(/forbidden legacy files/i);
  });
});

// QFAI:SPEC-0003:TC-0003-0054
describe("TC-0003-0054: old template deprecation marking", () => {
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
