import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { VISUAL_BROWSER_SURFACES } from "../../src/core/detection/surfaceType.js";
import { FORBIDDEN_LEGACY_PATTERNS } from "../../src/core/validators/uix/threeLayer.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const templateBase = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "qfai-discussion",
);
const skillPath = path.join(templateBase, "SKILL.md");
const uiuxTemplateDir = path.join(templateBase, "templates", "uiux");
const completionMatrixPath = path.join(
  templateBase,
  "references",
  "discussion-completion-matrix.md",
);
const uiBearingPlaybookPath = path.join(templateBase, "references", "ui-bearing-playbook.md");

// Shared vocabulary between the matrix and the Reviewer Gate templates. The
// matrix wraps the phrase across two lines, so match on whitespace not a space.
const EXPLORATION_REFERENCE_PHRASE =
  /exploration references\s+framed as \*\*deviate-from\*\* inputs/i;

// The retired completion conditions the matrix used to carry. The matrix body
// still names these sidecars to declare them forbidden, so their presence is
// only a regression when they come back as numbered completion conditions.
const RETIRED_COMPLETION_CONDITIONS = [
  /Strategy selected/i,
  /taste interview/i,
  /3-layer scoring/i,
  /Dynamic overrides/i,
  /Option comparison/i,
  /Selected anchor/i,
];

/** Extract the ordered list that follows the first `1. ` line of a section. */
function collectOrderedList(section: string): string {
  const lines = section.split("\n");
  const start = lines.findIndex((line) => /^1\. /.test(line));
  if (start === -1) {
    return "";
  }
  const collected: string[] = [];
  for (const line of lines.slice(start)) {
    if (!/^\d+\. /.test(line) && !/^\s{2,}\S/.test(line)) {
      break;
    }
    collected.push(line);
  }
  return collected.join("\n");
}

// `FORBIDDEN_LEGACY_PATTERNS` is a regex list, so it cannot be searched for in
// prose; these are the concrete filenames that stand in for it. The coverage
// case below fails if the validator grows a pattern with no representative
// here, which is what previously let the sweep fall behind the SSOT.
const FORBIDDEN_SIDECAR_NAMES = [
  "10_implementation_strategy.md",
  "11_design_taste_interview.md",
  "12_design_system.md",
  "20_design_eval_invariant.md",
  "30_option_comparison.md",
  "31_selected_anchor_screen.md",
  "33_exploration_rubric.md",
  "34_evaluator_calibration.md",
  "40_contracts.md",
  "50_review_bundle.md",
  "60_critique_loop.md",
];

// Prose shorthand the templates used to carry for the retired 20–24 family.
// Not a filename, so it is deliberately outside the coverage check.
const FORBIDDEN_RANGE_MENTIONS = ["uiux/20-24"];

describe("discussion skill template integration", () => {
  it("uiux template directory が screen-level sidecars を持つ", async () => {
    const files = await readdir(uiuxTemplateDir);
    expect(files).toContain("40_screen_contracts.md");
    expect(files).toContain("50_review_input_bundle.md");
    // Brand-level inputs moved to root DESIGN.md; rubric/calibration
    // sidecars previously removed.
    expect(files).not.toContain("33_exploration_rubric.md");
    expect(files).not.toContain("34_evaluator_calibration.md");
  });

  it("SKILL.md の UI-bearing completion が brand SSOT を要求している", async () => {
    const content = await readFile(skillPath, "utf-8");
    expect(content).toMatch(/DESIGN\.md/);
    expect(content).toMatch(/40_screen_contracts\.md/);
    expect(content).toMatch(/50_review_input_bundle\.md/);
  });

  it("forbidden sidecar 名の一覧が validator の SSOT を網羅している", () => {
    // Ties the list above to the validator: a pattern added to
    // FORBIDDEN_LEGACY_PATTERNS without a representative filename here would
    // otherwise leave the sweep below blind to that whole family.
    for (const pattern of FORBIDDEN_LEGACY_PATTERNS) {
      expect(
        FORBIDDEN_SIDECAR_NAMES.some((name) => pattern.test(name)),
        `no representative filename covers ${pattern}`,
      ).toBe(true);
    }
  });

  // The shipped skill must not tell an agent to produce a sidecar that
  // `validators/uix/threeLayer.ts#FORBIDDEN_LEGACY_PATTERNS` rejects.
  // Following such guidance creates the file and then fails validation,
  // so a stale instruction anywhere in the tree is a live trap — the
  // sweep therefore covers references/ and templates/, not just SKILL.md.
  it("配布 skill が forbidden legacy sidecar の生成を指示していない", async () => {
    const forbiddenMentions = [...FORBIDDEN_SIDECAR_NAMES, ...FORBIDDEN_RANGE_MENTIONS];
    // Three files name them on purpose: `00_index.md` is the
    // forbidden-legacy manifest, `ui_ux_best_practices.md` carries the
    // explicit "do NOT create" warning, and `ui-bearing-playbook.md`
    // records the removal. Everywhere else a mention is an instruction
    // to generate.
    const allowNamingFiles = new Set([
      "00_index.md",
      "ui_ux_best_practices.md",
      "ui-bearing-playbook.md",
    ]);
    const offenders: string[] = [];
    for (const file of await collectMarkdownFiles(templateBase)) {
      if (allowNamingFiles.has(path.basename(file))) continue;
      const content = await readFile(file, "utf-8");
      for (const mention of forbiddenMentions) {
        if (content.includes(mention)) {
          offenders.push(`${path.relative(templateBase, file).replace(/\\/g, "/")} → ${mention}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  // `cli` is discussion UI-bearing, but `/qfai-prototyping` rejects it, and the
  // prototyping loop's DESIGN.md drift scanner is the only reader of the
  // `visual.*` token values. Requiring a `cli` pack to author the token tree
  // therefore blocks completion on an artifact nothing downstream reads.
  it("cli pack が root DESIGN.md の visual token tree で完了をブロックされない", async () => {
    const playbook = await readFile(uiBearingPlaybookPath, "utf-8");
    const surfaceRow = (surface: string): string =>
      playbook.split("\n").find((line) => new RegExp(`^\\|\\s*${surface}\\s+\\|`).test(line)) ?? "";

    // The surfaces prototyping actually executes keep the full family. Tied to
    // the code SSOT so a surface added there cannot silently skip this doc.
    for (const surface of VISUAL_BROWSER_SURFACES) {
      expect(surfaceRow(surface), `no Surface Mapping row for '${surface}'`).toMatch(
        /Generate full uiux sidecar family/,
      );
    }

    // `cli` stays UI-bearing but gets its own outcome.
    const cliRow = surfaceRow("cli");
    expect(cliRow).toMatch(/\|\s*Yes\s*\|/);
    expect(cliRow).not.toMatch(/Generate full uiux sidecar family/);
    expect(cliRow).toMatch(/no root `DESIGN\.md`/i);

    // The completion matrix must carry the matching carve-out, or the pack is
    // still blocked by condition 1 no matter what the playbook says.
    const matrix = await readFile(completionMatrixPath, "utf-8");
    const cliSection = matrix.split(/^## /m).find((section) => section.startsWith("CLI Packs"));
    expect(cliSection).toBeDefined();
    expect(cliSection).toMatch(/No root `DESIGN\.md` required/i);
    const uiBearingConditions = collectOrderedList(
      matrix.split(/^## /m).find((section) => section.startsWith("UI-bearing Packs")) ?? "",
    );
    expect(uiBearingConditions).toMatch(/Visual-prototyping surfaces/i);

    // SKILL.md states the same requirement independently; if it still demands
    // root DESIGN.md for every UI-bearing pack the carve-out is unreachable.
    const skill = await readFile(skillPath, "utf-8");
    expect(skill).toMatch(/Root `DESIGN\.md` is required only on the visual-prototyping surfaces/);
    expect(skill).toMatch(/skip for `cli`/);

    // `route` remains a required field for every surface
    // (`validators/uix/screenContract.ts#REQUIRED_FIELDS`), so the template must
    // re-scope it for cli rather than telling authors to drop it.
    const screenContracts = await readFile(
      path.join(uiuxTemplateDir, "40_screen_contracts.md"),
      "utf-8",
    );
    expect(screenContracts).toMatch(/^- route:/m);
    expect(screenContracts).toMatch(/`route:` is required on every surface/);
    expect(screenContracts).toMatch(/command invocation/i);
  });

  it("09_Constraints.md が accessibility を正しい階層で参照している", async () => {
    // `accessibility` is a TOP-LEVEL DESIGN.md key. `visual` rejects
    // unknown keys, so an author who followed a `visual.accessibility`
    // pointer would write a file that fails to parse.
    const content = await readFile(
      path.join(templateBase, "templates", "09_Constraints.md"),
      "utf-8",
    );
    expect(content).not.toMatch(/visual\.accessibility/);
    expect(content).toMatch(/accessibility/);
  });

  // The Reviewer Gate templates and the completion matrix are two halves of the
  // same UI-bearing exit condition. When they disagree, a pack that satisfies
  // the matrix is sent back by the reviewer, and a pack that satisfies the
  // reviewer fails the forbidden-sidecar check — the UI-bearing pack cannot be
  // completed at all.
  it("review テンプレートが completion matrix と同じ UI ファミリーを要求している", async () => {
    const reviewDir = path.join(templateBase, "templates", "review");
    const retiredChecks = [
      /taste interview/i,
      /3-layer evaluation/i,
      /option comparison/i,
      /selected anchor clarity/i,
    ];

    // Half one: the matrix itself must still carry the current UI family and
    // must not have regrown any retired completion condition.
    const matrix = await readFile(completionMatrixPath, "utf-8");
    const uiBearingSection = matrix
      .split(/^## /m)
      .find((section) => section.startsWith("UI-bearing Packs"));
    expect(uiBearingSection).toBeDefined();
    const matrixConditions = collectOrderedList(uiBearingSection ?? "");
    expect(matrixConditions).not.toBe("");
    for (const pattern of RETIRED_COMPLETION_CONDITIONS) {
      expect(matrixConditions).not.toMatch(pattern);
    }
    expect(matrixConditions).toMatch(/DESIGN\.md/);
    expect(matrixConditions).toMatch(/40_screen_contracts\.md/);
    expect(matrixConditions).toMatch(/50_review_input_bundle\.md/);
    expect(matrixConditions).toMatch(/unranked/i);
    expect(matrixConditions).toMatch(/forbidden legacy sidecar/i);
    expect(matrixConditions).toMatch(EXPLORATION_REFERENCE_PHRASE);

    // Half two: the Reviewer Gate templates must demand the same family in the
    // same words, so neither half can send back a pack the other accepts.
    for (const fileName of ["review_request.md", "Rxx_reviewer.md"]) {
      const content = await readFile(path.join(reviewDir, fileName), "utf-8");
      for (const pattern of retiredChecks) {
        expect(content).not.toMatch(pattern);
      }
      expect(content).toMatch(/DESIGN\.md/);
      expect(content).toMatch(/unranked/i);
      expect(content).toMatch(/canonical `uiux\/` family/i);
      expect(content).toMatch(/forbidden legacy sidecar/i);
      expect(content).toMatch(EXPLORATION_REFERENCE_PHRASE);
    }
  });
});

async function collectMarkdownFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await collectMarkdownFiles(full)));
    } else if (entry.name.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}
