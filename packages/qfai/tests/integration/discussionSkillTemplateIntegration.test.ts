import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

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

  // The shipped skill must not tell an agent to produce a sidecar that
  // `validators/uix/threeLayer.ts#FORBIDDEN_LEGACY_PATTERNS` rejects.
  // Following such guidance creates the file and then fails validation,
  // so a stale instruction anywhere in the tree is a live trap — the
  // sweep therefore covers references/ and templates/, not just SKILL.md.
  it("配布 skill が forbidden legacy sidecar の生成を指示していない", async () => {
    const forbiddenMentions = [
      "10_implementation_strategy.md",
      "11_design_taste_interview.md",
      "30_option_comparison.md",
      "31_selected_anchor_screen.md",
      "uiux/20-24",
    ];
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
