/**
 * Static asset assertions for qfai-discussion v1.7.16 additions — spec-0010
 *
 * QFAI:SPEC-0010:TC-0010-0031
 * QFAI:SPEC-0010:TC-0010-0035
 * QFAI:SPEC-0010:TC-0010-0038
 * QFAI:SPEC-0010:TC-0010-0041
 * QFAI:SPEC-0010:TC-0010-0043
 * QFAI:SPEC-0010:TC-0010-0044
 * QFAI:SPEC-0010:TC-0010-0046
 * QFAI:SPEC-0010:TC-0010-0047
 * QFAI:SPEC-0010:TC-0010-0049
 * QFAI:SPEC-0010:TC-0010-0050
 * QFAI:SPEC-0010:TC-0010-0052
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SKILL_BASE = path.resolve(
  import.meta.dirname,
  "../../assets/init/.qfai/assistant/skills/qfai-discussion",
);

async function readAsset(...parts: string[]): Promise<string> {
  return readFile(path.join(SKILL_BASE, ...parts), "utf-8");
}

// ─── SKILL.md ─────────────────────────────────────────────────────────────────

describe("SKILL.md v1.7.16 additions", () => {
  // QFAI:SPEC-0010:TC-0010-0031
  it("contains Step 11.3 with Phase A and Phase B labels", async () => {
    const content = await readAsset("SKILL.md");
    expect(content).toContain("Step 11.3");
    expect(content).toContain("Phase A");
    expect(content).toContain("Phase B");
  });

  // QFAI:SPEC-0010:TC-0010-0035
  it("Step 11.3 Phase A contains no human-confirmation markers", async () => {
    const content = await readAsset("SKILL.md");
    const step113Start = content.indexOf("Step 11.3");
    const step115Start = content.indexOf("Step 11.5");
    const section =
      step115Start !== -1 ? content.slice(step113Start, step115Start) : content.slice(step113Start);

    const humanConfirmPatterns = [
      /please confirm/i,
      /ask user to approve/i,
      /wait for human/i,
      /await human/i,
      /human must approve/i,
      /require.*human.*confirmation/i,
    ];
    for (const pattern of humanConfirmPatterns) {
      expect(pattern.test(section), `Phase A should not contain: ${pattern.source}`).toBe(false);
    }
  });

  // QFAI:SPEC-0010:TC-0010-0038
  it("contains Step 11.5 with visual-axis mandate", async () => {
    const content = await readAsset("SKILL.md");
    expect(content).toContain("Step 11.5");
    const step115Idx = content.indexOf("Step 11.5");
    const after115 = content.slice(step115Idx, step115Idx + 500);
    expect(after115.toLowerCase()).toMatch(/visual.*axis|axis.*visual/);
    expect(after115).toMatch(/TRD-XX|21_design_eval_trend_derived/);
  });

  // QFAI:SPEC-0010:TC-0010-0044
  it("Sidecar Generation Flow declares Step 1c before Step 1d with parallel-forbidden marker", async () => {
    const content = await readAsset("SKILL.md");
    const step1cIdx = content.indexOf("Step 1c");
    const step1dIdx = content.indexOf("Step 1d");
    expect(step1cIdx).toBeGreaterThan(-1);
    expect(step1dIdx).toBeGreaterThan(-1);
    expect(step1cIdx).toBeLessThan(step1dIdx);
    expect(content).toMatch(/並列禁止|no parallel|parallel.*forbidden/i);
  });

  // QFAI:SPEC-0010:TC-0010-0049
  it("requires design guideline research before finalizing trend-derived axes for UI-bearing runs", async () => {
    const content = await readAsset("SKILL.md");
    expect(content).toMatch(/design guideline research/i);
    expect(content).toMatch(/platform|library/i);
    expect(content).toMatch(/before.*trend-derived axis finalization|prior to.*trend-derived/i);
  });
});

// ─── templates/04_Sources.md ─────────────────────────────────────────────────

describe("04_Sources.md template v1.7.16 additions", () => {
  // QFAI:SPEC-0010:TC-0010-0041
  it("declares evaluation_connection on all 6 visual Trend Scan categories", async () => {
    const content = await readAsset("templates", "04_Sources.md");

    const visualCategories = ["color", "typography", "Visual", "spacing", "shape", "imagery"];

    for (const category of visualCategories) {
      const catIdx = content.indexOf(`### ${category}`);
      expect(catIdx, `### ${category} section not found`).toBeGreaterThan(-1);

      // Find the next category heading after this one
      const nextHash = content.indexOf("\n### ", catIdx + 1);
      const section = nextHash !== -1 ? content.slice(catIdx, nextHash) : content.slice(catIdx);

      expect(section, `evaluation_connection field missing in ### ${category} section`).toContain(
        "evaluation_connection:",
      );
    }
  });

  // QFAI:SPEC-0010:TC-0010-0050
  it("defines a design_guideline_research category with required guideline fields", async () => {
    const content = await readAsset("templates", "04_Sources.md");
    const categoryIdx = content.indexOf("### design_guideline_research");
    expect(categoryIdx, "### design_guideline_research section not found").toBeGreaterThan(-1);

    const nextHeadingIdx = content.indexOf("\n### ", categoryIdx + 1);
    const section =
      nextHeadingIdx !== -1
        ? content.slice(categoryIdx, nextHeadingIdx)
        : content.slice(categoryIdx);

    for (const field of ["source_id", "guideline_name", "rule_refs", "local_translation"]) {
      expect(section, `Field '${field}' missing from design_guideline_research section`).toContain(
        `${field}:`,
      );
    }
  });
});

// ─── templates/uiux/21_design_eval_trend_derived.md ─────────────────────────

describe("21_design_eval_trend_derived.md template v1.7.16 additions", () => {
  // QFAI:SPEC-0010:TC-0010-0043
  it("contains at least 2 visual-axis examples with source_refs guidance", async () => {
    const content = await readAsset("templates", "uiux", "21_design_eval_trend_derived.md");

    // Count visual-category axis blocks
    const visualCategoryMatches = content.match(/visual_category:\s*true/g) ?? [];
    expect(
      visualCategoryMatches.length,
      "Expected at least 2 visual-axis examples with visual_category: true",
    ).toBeGreaterThanOrEqual(2);

    // Source_refs guidance must be present
    expect(content).toContain("source_refs");
    expect(content.toLowerCase()).toMatch(/04_sources\.md|source registry/);
  });

  // QFAI:SPEC-0010:TC-0010-0052
  it("states that score_anchors low/mid/high must include a quantitative proxy", async () => {
    const content = await readAsset("templates", "uiux", "21_design_eval_trend_derived.md");

    expect(content).toMatch(/quantitative proxy/i);
    expect(content).toMatch(/44px|ratio|WCAG|class name|default value/i);
  });
});

// ─── references/design-md-brand-catalog.md ───────────────────────────────────

describe("design-md-brand-catalog.md v1.7.16", () => {
  // QFAI:SPEC-0010:TC-0010-0046
  it("contains 8 archetypes each with representative_brand and aesthetic_properties", async () => {
    const content = await readAsset("references", "design-md-brand-catalog.md");

    const archetypes = [
      "Minimal",
      "Bold",
      "Corporate",
      "Playful",
      "Organic",
      "Tech",
      "Elegant",
      "Casual",
    ];

    for (const archetype of archetypes) {
      const archetypeIdx = content.indexOf(`## Archetype: ${archetype}`);
      expect(archetypeIdx, `Archetype '${archetype}' not found`).toBeGreaterThan(-1);

      const nextArchetypeIdx = content.indexOf("## Archetype:", archetypeIdx + 1);
      const section =
        nextArchetypeIdx !== -1
          ? content.slice(archetypeIdx, nextArchetypeIdx)
          : content.slice(archetypeIdx);

      expect(section, `representative_brand missing in archetype '${archetype}'`).toContain(
        "representative_brand:",
      );

      expect(section, `aesthetic_properties missing in archetype '${archetype}'`).toContain(
        "aesthetic_properties:",
      );
    }
  });
});

// ─── templates/uiux/12_design_system.md ──────────────────────────────────────

describe("12_design_system.md template v1.7.16", () => {
  // QFAI:SPEC-0010:TC-0010-0047
  it("defines all 8 canonical sections as ATX headings with non-empty guidance", async () => {
    const content = await readAsset("templates", "uiux", "12_design_system.md");

    const requiredSections = [
      "Visual Theme",
      "Color Palette",
      "Typography",
      "Spacing & Layout",
      "Component Style",
      "Animation & Motion",
      "Do's and Don'ts",
      "Agent Implementation Guide",
    ];

    for (const section of requiredSections) {
      const headingIdx = content.indexOf(`## ${section}`);
      expect(headingIdx, `Section '## ${section}' not found`).toBeGreaterThan(-1);

      // Verify non-empty body between this heading and the next
      const nextHeadingIdx = content.indexOf("\n## ", headingIdx + 1);
      const body =
        nextHeadingIdx !== -1
          ? content.slice(headingIdx + section.length + 4, nextHeadingIdx)
          : content.slice(headingIdx + section.length + 4);

      expect(
        body.trim().length,
        `Section '${section}' has empty or whitespace-only body`,
      ).toBeGreaterThan(0);
    }
  });
});
