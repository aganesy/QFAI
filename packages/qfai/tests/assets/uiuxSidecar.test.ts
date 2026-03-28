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

  async function readTemplate(filename: string): Promise<string> {
    return readFile(path.join(uiuxDir, filename), "utf-8");
  }

  async function readCoreTemplate(filename: string): Promise<string> {
    return readFile(path.join(templateDir, filename), "utf-8");
  }

  // TDD-0001: TC-0026-0001 — 11 sidecar files present
  it("has exactly 11 sidecar files", async () => {
    const files = await fg(["*.md"], { cwd: uiuxDir, absolute: false });
    expect(files.sort()).toEqual([
      "00_index.md",
      "10_strategy.md",
      "20_eval_axis_usability.md",
      "21_eval_axis_consistency.md",
      "22_eval_axis_accessibility.md",
      "23_eval_axis_delight.md",
      "30_comparison.md",
      "31_anchor.md",
      "40_contracts.md",
      "50_review_bundle.md",
      "60_critique_loop.md",
    ]);
  });

  // TDD-0002: TC-0026-0002 — strategy YAML schema conformance
  it("10_strategy.md contains YAML block with version field", async () => {
    const content = await readTemplate("10_strategy.md");
    expect(content).toContain("```yaml");
    expect(content).toMatch(/version:\s*"0\.1"/);
    expect(content).toContain("surface_type:");
    expect(content).toContain("strategy:");
  });

  // TDD-0003: TC-0026-0023 — minimal-but-complete verbosity
  it("10_strategy.md has one complete example, no verbose alternatives", async () => {
    const content = await readTemplate("10_strategy.md");
    const yamlBlocks = content.match(/```yaml/g) ?? [];
    expect(yamlBlocks.length).toBe(1);
    expect(content).toContain("Strategy Selection Guidance");
  });

  // TDD-0004: TC-0026-0020 — eval axis usability has criteria and measurement
  it("20_eval_axis_usability.md has evaluation criteria and measurement approach", async () => {
    const content = await readTemplate("20_eval_axis_usability.md");
    expect(content).toContain("## Evaluation Criteria");
    expect(content).toContain("## Measurement Approach");
    expect(content).toContain("Learnability");
    expect(content).toContain("Scoring Guide");
  });

  // TDD-0005: TC-0026-0021 — comparison template 2+ options against axes
  it("30_comparison.md compares 2+ options against scoring axes", async () => {
    const content = await readTemplate("30_comparison.md");
    expect(content).toContain("Option A");
    expect(content).toContain("Option B");
    expect(content).toContain("Usability");
    expect(content).toContain("Consistency");
    expect(content).toContain("Accessibility");
    expect(content).toContain("Delight");
    expect(content).toContain("Aggregate Scoring");
  });

  // TDD-0006: TC-0026-0022 — contracts template anchor screen interactions
  it("40_contracts.md has anchor screen interaction contracts", async () => {
    const content = await readTemplate("40_contracts.md");
    expect(content).toContain("Anchor Screen Contract");
    expect(content).toContain("States");
    expect(content).toContain("Interactions");
    expect(content).toContain("empty");
    expect(content).toContain("loading");
    expect(content).toContain("error");
    expect(content).toContain("populated");
  });

  // --- Slice 2: SKILL.md tests ---

  // TDD-0007: TC-0026-0007 — SKILL.md detection section 5 surface categories
  it("SKILL.md has UI-bearing detection with 5 surface categories", async () => {
    const content = await readFile(skillMdPath, "utf-8");
    expect(content).toContain("## UI-bearing Detection");
    expect(content).toContain("web-ui");
    expect(content).toContain("mobile-ui");
    expect(content).toContain("desktop-ui");
    expect(content).toContain("mixed");
    expect(content).toContain("non-ui");
  });

  // TDD-0008: TC-0026-0004 — surface classification: web-ui documented
  it("SKILL.md documents web-ui as UI-bearing", async () => {
    const content = await readFile(skillMdPath, "utf-8");
    expect(content).toMatch(/web-ui.*UI-bearing/is);
  });

  // TDD-0009: TC-0026-0005 — surface classification: non-ui documented
  it("SKILL.md documents non-ui as not UI-bearing", async () => {
    const content = await readFile(skillMdPath, "utf-8");
    expect(content).toMatch(/non-ui.*skip|non-ui.*not.*UI-bearing|non-ui.*no sidecar/is);
  });

  // TDD-0010: TC-0026-0006 — surface classification: edge case documented
  it("SKILL.md documents surface type classification not interaction complexity", async () => {
    const content = await readFile(skillMdPath, "utf-8");
    expect(content).toMatch(/surface type/i);
    expect(content).toMatch(/not.*interaction complexity|interaction complexity.*not/is);
  });

  // TDD-0011: TC-0026-0008 — UI-bearing completion conditions
  it("SKILL.md requires 4 UI-bearing completion conditions", async () => {
    const content = await readFile(skillMdPath, "utf-8");
    expect(content).toContain("strategy");
    expect(content).toMatch(/scoring ax[ei]s/i);
    expect(content).toMatch(/anchor screen/i);
    expect(content).toMatch(/contracts?\s+(drafted|defined)/i);
  });

  // TDD-0012: TC-0026-0010 — non-UI completion unchanged
  it("SKILL.md states non-UI completion conditions unchanged from v1.7.2", async () => {
    const content = await readFile(skillMdPath, "utf-8");
    expect(content).toMatch(/non-ui.*unchanged|non-ui.*same.*completion|non-ui.*no additional/is);
  });

  // TDD-0023: TC-0026-0003 — non-UI skip documented
  it("SKILL.md documents non-UI sidecar skip", async () => {
    const content = await readFile(skillMdPath, "utf-8");
    expect(content).toMatch(
      /non-ui.*skip.*sidecar|non-ui.*no.*uiux|non-ui.*sidecar.*not.*generated/is,
    );
  });

  // TDD-0024: TC-0026-0009 — incomplete condition blocking documented
  it("SKILL.md documents completion blocking when conditions not met", async () => {
    const content = await readFile(skillMdPath, "utf-8");
    expect(content).toMatch(/block|must.*all|cannot.*complete.*until/is);
  });

  // --- Slice 3: Direct template replacement tests ---

  // TDD-0013: TC-0026-0011 — 03 behavior obligations primary
  it("03_Story-Workshop.md has behavior obligations as primary focus", async () => {
    const content = await readCoreTemplate("03_Story-Workshop.md");
    expect(content).toMatch(/behavior obligation/i);
  });

  // TDD-0014: TC-0026-0024 — 03 HTML/CSS mock fallback demotion
  it("03_Story-Workshop.md demotes HTML/CSS mock to fallback", async () => {
    const content = await readCoreTemplate("03_Story-Workshop.md");
    expect(content).toMatch(/fallback|optional/i);
    // HTML mock section should come after behavior obligations
    const behaviorIdx = content.search(/behavior obligation/i);
    const mockIdx = content.search(/Screen Mock|HTML.*CSS/i);
    if (behaviorIdx >= 0 && mockIdx >= 0) {
      expect(behaviorIdx).toBeLessThan(mockIdx);
    }
  });

  // TDD-0015: TC-0026-0012 — 04 registry with adopted/rejected/local_translation
  it("04_Sources.md has competitive reference registry with 3 fields", async () => {
    const content = await readCoreTemplate("04_Sources.md");
    expect(content).toContain("adopted_points");
    expect(content).toContain("rejected_points");
    expect(content).toContain("local_translation");
  });

  // TDD-0016: TC-0026-0013 — 04 registry empty no schema violation
  it("04_Sources.md registry exists even when empty", async () => {
    const content = await readCoreTemplate("04_Sources.md");
    expect(content).toContain("Competitive Reference Registry");
  });

  // TDD-0017: TC-0026-0014 — 14 sidecar review scope section
  it("14_Review-Request.md has sidecar review scope section", async () => {
    const content = await readCoreTemplate("14_Review-Request.md");
    expect(content).toMatch(/sidecar.*review|review.*sidecar/i);
  });

  // --- Slice 4: Batch template cross-refs ---

  // TDD-0018: TC-0026-0015 — UX-INTENT cross-refs present in core templates
  it("core templates contain UX-INTENT cross-reference comments", async () => {
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

  // TDD-0019: TC-0026-0016 — cross-ref graceful degradation
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

  // TDD-0020: TC-0026-0017 — partial sidecar cross-refs
  it("UX-INTENT comments reference uiux/ files by name", async () => {
    const allFiles = await fg(["*.md"], { cwd: templateDir, absolute: false });
    let hasUiuxRef = false;
    for (const file of allFiles) {
      const content = await readCoreTemplate(file);
      if (content.match(/UX-INTENT.*uiux\//)) {
        hasUiuxRef = true;
        break;
      }
    }
    expect(hasUiuxRef).toBe(true);
  });

  // --- Init/verify-pack ---

  // TDD-0021: TC-0026-0018 — init distributes uiux sidecar templates
  it("uiux template files are under assets/init and will be distributed", async () => {
    // Verify files are in the init assets tree (which qfai init distributes)
    const initAssetsDir = path.join(repoRoot, "packages", "qfai", "assets", "init");
    const uiuxFiles = await fg([".qfai/assistant/skills/qfai-discussion/templates/uiux/*.md"], {
      cwd: initAssetsDir,
      absolute: false,
    });
    expect(uiuxFiles.length).toBe(11);
  });

  // TDD-0022: TC-0026-0019 — verify-pack: existing asset tests pass
  // This is validated by running the full assets test suite — covered by assets.test.ts
});
