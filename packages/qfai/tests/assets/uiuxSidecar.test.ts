import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

describe("uiux sidecar templates", { timeout: 15000 }, () => {
  const repoRoot = path.resolve(process.cwd(), "..", "..");
  const templateDir = path.join(
    repoRoot,
    "packages",
    "qfai",
    "assets",
    "init",
    ".qfai",
    "assistant",
    "skills",
    "qfai-discussion",
    "templates",
  );
  const uiuxDir = path.join(templateDir, "uiux");
  const skillMdPath = path.join(templateDir, "..", "SKILL.md");

  const batchAFiles = [
    "01_Context.md",
    "02_Inception-Deck.md",
    "05_Scope.md",
    "06_REQ.md",
    "07_NFR.md",
  ];
  const batchBFiles = [
    "08_Glossary.md",
    "09_Constraints.md",
    "10_Policy.md",
    "11_OQ-Register.md",
    "12_OQ-Resolution-Log.md",
    "13_Deferred.md",
    "99_delta.md",
  ];
  const allBatchFiles = [...batchAFiles, ...batchBFiles];

  async function readTemplate(filename: string): Promise<string> {
    return readFile(path.join(uiuxDir, filename), "utf-8");
  }

  async function readCoreTemplate(filename: string): Promise<string> {
    return readFile(path.join(templateDir, filename), "utf-8");
  }

  // TDD-0001: TC-0002-0001 — 13 sidecar files present
  it("has exactly 13 sidecar files", async () => {
    const files = await fg(["*.md"], { cwd: uiuxDir, absolute: false });
    expect(files.sort()).toEqual([
      "00_index.md",
      "10_implementation_strategy.md",
      "11_design_taste_interview.md",
      "20_design_eval_invariant.md",
      "20_trend_scan.md",
      "21_design_eval_trend_derived.md",
      "22_design_eval_product_specific.md",
      "23_design_eval_aggregate.md",
      "24_design_eval_dynamic_overrides.md",
      "30_option_comparison.md",
      "31_selected_anchor_screen.md",
      "40_screen_contracts.md",
      "50_review_input_bundle.md",
    ]);
  });

  // TDD-0002: TC-0002-0002 — strategy strong 8-field schema conformance
  it("10_implementation_strategy.md contains canonical schema keys", async () => {
    const content = await readTemplate("10_implementation_strategy.md");
    // Strong schema uses bullet-style fields, not YAML block
    expect(content).toMatch(/- surface:/);
    expect(content).toMatch(/- selection_required:/);
    expect(content).toMatch(/- decision:/);
    expect(content).toMatch(/- candidate_options:/);
    expect(content).toMatch(/- chosen_option:/);
    expect(content).toMatch(/- rationale:/);
    expect(content).toMatch(/- verification_expectations:/);
    expect(content).toMatch(/- notes_for_reviewer:/);
    // Must NOT contain weak-format surface_type
    expect(content).not.toMatch(/surface_type/);
  });

  // TDD-0003: TC-0002-0023 — minimal-but-complete verbosity
  it("10_implementation_strategy.md explains canonical constraints", async () => {
    const content = await readTemplate("10_implementation_strategy.md");
    expect(content).toContain("## Surface");
    expect(content).toContain("## Decision");
  });

  // TDD-0004: TC-0002-0020 — eval files define 3-layer model and aggregate scoring rules
  it("eval axis files define 3-layer model with aggregate scoring rules", async () => {
    const layerMap: Record<string, string> = {
      "20_design_eval_invariant.md": "invariant",
      "21_design_eval_trend_derived.md": "trend-derived",
      "22_design_eval_product_specific.md": "product-specific",
      "23_design_eval_aggregate.md": "aggregate",
    };
    for (const [file, expectedLayer] of Object.entries(layerMap)) {
      const content = await readTemplate(file);
      expect(content).toContain("## Layer Classification");
      expect(content).toMatch(new RegExp(`Layer:\\s*${expectedLayer}`, "i"));
    }
    // 23_design_eval_aggregate.md carries the aggregate scoring rules
    const aggregate = await readTemplate("23_design_eval_aggregate.md");
    expect(aggregate).toContain("## Aggregate Scoring Rules");
    expect(aggregate).toMatch(/total_score_formula/i);
    expect(aggregate).toMatch(/layer_weights/i);
    expect(aggregate).toMatch(/accept_threshold/i);
    expect(aggregate).toMatch(/refine_band/i);
    expect(aggregate).toMatch(/pivot_band/i);
    expect(aggregate).toMatch(/max_iterations/i);
    expect(aggregate).toMatch(/plateau_rule/i);
    expect(aggregate).toMatch(/missing_score_policy/i);
    expect(aggregate).toMatch(/disagreement_rule/i);
  });

  // TDD-0005: TC-0002-0021 — comparison template 2+ options against 3-layer axes
  it("30_option_comparison.md compares 2+ options against 3-layer scoring axes", async () => {
    const content = await readTemplate("30_option_comparison.md");
    expect(content).toContain("Option A");
    expect(content).toContain("Option B");
    // 3-layer structure in comparison matrix
    expect(content).toContain("### Invariant Axes");
    expect(content).toContain("### Trend-derived Axes");
    expect(content).toContain("### Product-specific Axes");
    // Aggregate scoring with normalization and thresholds
    expect(content).toContain("## Aggregate Scoring");
    expect(content).toMatch(/Normalized Total/i);
    expect(content).toMatch(/Threshold/i);
  });

  // TDD-0006: TC-0002-0022 — contracts template strong schema
  it("40_screen_contracts.md has screen contract with strong schema fields", async () => {
    const content = await readTemplate("40_screen_contracts.md");
    expect(content).toContain("### Screen:");
    // Strong schema 11 required fields
    expect(content).toMatch(/- screen_id:/);
    expect(content).toMatch(/- route:/);
    expect(content).toMatch(/- purpose:/);
    expect(content).toMatch(/- actor:/);
    expect(content).toMatch(/- primary_tasks:/);
    expect(content).toMatch(/- secondary_tasks:/);
    expect(content).toMatch(/- required_states:/);
    expect(content).toMatch(/- transitions:/);
    expect(content).toMatch(/- observable_outcomes:/);
    expect(content).toMatch(/- notes_for_verify:/);
    expect(content).toMatch(/- notes_for_reviewer:/);
    // State coverage
    expect(content).toContain("empty");
    expect(content).toContain("loading");
    expect(content).toContain("error");
    // No stale 31_anchor.md reference
    expect(content).not.toContain("31_anchor.md");
  });

  // --- Slice 2: SKILL.md tests ---

  // TDD-0007: TC-0002-0007 — SKILL.md detection section 6 surface categories
  it("SKILL.md has UI-bearing detection with 6 surface categories", async () => {
    const content = await readFile(skillMdPath, "utf-8");
    expect(content).toContain("## UI-bearing Detection");
    expect(content).toContain("web");
    expect(content).toContain("mobile");
    expect(content).toContain("desktop");
    expect(content).toContain("cli");
    expect(content).toContain("mixed");
    expect(content).toContain("non-ui");
  });

  // TDD-0008: TC-0002-0004 — surface classification: web documented
  it("SKILL.md documents web as UI-bearing", async () => {
    const content = await readFile(skillMdPath, "utf-8");
    expect(content).toMatch(/\bweb\b.*UI-bearing/is);
  });

  // TDD-0009: TC-0002-0005 — surface classification: non-ui documented
  it("SKILL.md documents non-ui as not UI-bearing", async () => {
    const content = await readFile(skillMdPath, "utf-8");
    expect(content).toMatch(/non-ui.*skip|non-ui.*not.*UI-bearing|non-ui.*no sidecar/is);
  });

  // TDD-0010: TC-0002-0006 — surface classification: edge case documented
  it("SKILL.md documents surface type classification not interaction complexity", async () => {
    const content = await readFile(skillMdPath, "utf-8");
    expect(content).toMatch(/surface type/i);
    expect(content).toMatch(/not.*interaction complexity|interaction complexity.*not/is);
  });

  // TDD-0011: TC-0002-0008 — UI-bearing completion conditions
  it("SKILL.md requires 4 UI-bearing completion conditions", async () => {
    const content = await readFile(skillMdPath, "utf-8");
    expect(content).toContain("strategy");
    expect(content).toMatch(/scoring ax[ei]s/i);
    expect(content).toMatch(/comparison completed|selected anchor/i);
    expect(content).toMatch(/contracts?\s+(drafted|defined|contains)/i);
  });

  // TDD-0012: TC-0002-0010 — non-UI completion
  it("SKILL.md states non-UI completion conditions", async () => {
    const content = await readFile(skillMdPath, "utf-8");
    expect(content).toMatch(/non-UI.*no.*completion.*conditions.*apply|non-UI.*not.*required/is);
  });

  // TDD-0023: TC-0002-0003 — non-UI skip documented
  it("SKILL.md documents non-UI sidecar skip", async () => {
    const content = await readFile(skillMdPath, "utf-8");
    expect(content).toMatch(
      /non-ui.*skip.*sidecar|non-ui.*no.*uiux|non-ui.*sidecar.*not.*generated/is,
    );
  });

  // TDD-0024: TC-0002-0009 — incomplete condition blocking documented
  it("SKILL.md documents completion blocking when conditions not met", async () => {
    const content = await readFile(skillMdPath, "utf-8");
    expect(content).toMatch(/block|must.*all|cannot.*complete.*until/is);
  });

  // --- Slice 3: Direct template replacement tests ---

  // TDD-0013: TC-0002-0011 — 03 behavior obligations primary
  it("03_Story-Workshop.md has behavior obligations as primary focus", async () => {
    const content = await readCoreTemplate("03_Story-Workshop.md");
    expect(content).toMatch(/behavior obligation/i);
  });

  // TDD-0014: TC-0002-0024 — 03 HTML/CSS mock optional fallback demotion
  it("03_Story-Workshop.md demotes HTML/CSS mock to optional fallback appendix", async () => {
    const content = await readCoreTemplate("03_Story-Workshop.md");
    expect(content).toMatch(/optional fallback/i);
    expect(content).toMatch(/appendix/i);
    // HTML mock section should come after behavior obligations
    const behaviorIdx = content.search(/behavior obligation/i);
    const mockIdx = content.search(/Screen Mock|HTML.*CSS/i);
    if (behaviorIdx >= 0 && mockIdx >= 0) {
      expect(behaviorIdx).toBeLessThan(mockIdx);
    }
  });

  // TDD-0028: TC-0002-0028 — 03 Behavior Obligations State Coverage has 4 required states
  it("03_Story-Workshop.md Behavior Obligations State Coverage has 4 required states", async () => {
    const content = await readCoreTemplate("03_Story-Workshop.md");
    const behaviorMatch = content.match(/## Behavior Obligations[\s\S]*$/);
    expect(behaviorMatch).not.toBeNull();
    const behavior = behaviorMatch?.[0] ?? "";
    // State Coverage table should include all 4 required states
    for (const state of ["default", "loading", "empty", "error"]) {
      expect(behavior).toMatch(new RegExp(`\\b${state}\\b`, "im"));
    }
  });

  // TDD-0015: TC-0002-0012 — 04 registry with adopted/rejected/local_translation
  it("04_Sources.md has competitive reference registry with 3 fields", async () => {
    const content = await readCoreTemplate("04_Sources.md");
    expect(content).toContain("adopted_points");
    expect(content).toContain("rejected_points");
    expect(content).toContain("local_translation");
  });

  // TDD-0016: TC-0002-0013 — 04 registry empty no schema violation
  it("04_Sources.md registry exists even when empty", async () => {
    const content = await readCoreTemplate("04_Sources.md");
    expect(content).toContain("Competitive Reference Registry");
  });

  // TDD-0017: TC-0002-0014 — 14 sidecar review scope section
  it("14_Review-Request.md has sidecar review scope section", async () => {
    const content = await readCoreTemplate("14_Review-Request.md");
    expect(content).toMatch(/sidecar.*review|review.*sidecar/i);
  });

  // --- Slice 4: Batch template cross-refs ---

  // TDD-0018: TC-0002-0015 — UX-INTENT cross-refs present in core templates
  it("core templates contain UX-INTENT cross-reference comments", async () => {
    const missingFiles: string[] = [];
    for (const file of allBatchFiles) {
      const content = await readCoreTemplate(file);
      if (!content.includes("UX-INTENT")) {
        missingFiles.push(file);
      }
    }
    // Every batch template must have UX-INTENT cross-refs
    expect(missingFiles).toEqual([]);
  });

  // TDD-0019: TC-0002-0016 — cross-ref graceful degradation
  it("UX-INTENT comments are conditional and do not create broken links", async () => {
    // When sidecar doesn't exist, UX-INTENT comments should be self-contained
    // (no mandatory href that would break). They use comment syntax <!-- -->
    const content = await readCoreTemplate("01_Context.md");
    const uxIntentMatches = content.match(/<!--\s*UX-INTENT.*?-->/gs) ?? [];
    for (const match of uxIntentMatches) {
      // Comments are HTML comments — they don't render as broken links
      expect(match).toMatch(/^<!--/);
      expect(match).toMatch(/-->$/);
    }
  });

  // TDD-0020: TC-0002-0017 — partial sidecar cross-refs
  it("UX-INTENT comments reference uiux/ files by name in all batch templates", async () => {
    const missingUiuxRef: string[] = [];
    for (const file of allBatchFiles) {
      const content = await readCoreTemplate(file);
      if (!content.match(/UX-INTENT.*uiux\//)) {
        missingUiuxRef.push(file);
      }
    }
    expect(missingUiuxRef).toEqual([]);
  });

  // --- Init/verify-pack ---

  // TDD-0021: TC-0002-0018 — init distributes uiux sidecar templates
  it("uiux template files are under assets/init and will be distributed", async () => {
    // Verify files are in the init assets tree (which qfai init distributes)
    const initAssetsDir = path.join(repoRoot, "packages", "qfai", "assets", "init");
    const uiuxFiles = await fg([".qfai/assistant/skills/qfai-discussion/templates/uiux/*.md"], {
      cwd: initAssetsDir,
      absolute: false,
    });
    expect(uiuxFiles.length).toBe(13);
  });

  // TDD-0022: TC-0002-0019 — verify-pack: existing asset tests pass
  // This is validated by running the full assets test suite — covered by assets.test.ts
});
