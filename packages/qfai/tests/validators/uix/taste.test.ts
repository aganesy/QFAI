/**
 * Taste validator tests — spec-0034 TDD-0001..TDD-0005
 *
 * QFAI:SPEC-0034:TC-0034-0001
 * QFAI:SPEC-0034:TC-0034-0002
 * QFAI:SPEC-0034:TC-0034-0003
 * QFAI:SPEC-0034:TC-0034-0004
 * QFAI:SPEC-0034:TC-0034-0005
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { validateTasteInterview } from "../../../src/core/validators/uix/taste.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-taste-"));
  tempDirs.push(dir);
  return dir;
}

/** Create a UI-bearing pack root with 01_Spec.md declaring web-ui surface */
async function createUiBearingPack(root: string): Promise<void> {
  await writeFile(
    path.join(root, "01_Spec.md"),
    "# Spec\n\n- surface: web-ui\n",
    "utf-8",
  );
  await mkdir(path.join(root, "uiux"), { recursive: true });
}

/** Create a non-UI pack root */
async function createNonUiPack(root: string): Promise<void> {
  await writeFile(
    path.join(root, "01_Spec.md"),
    "# Spec\n\n- surface: non-ui\n",
    "utf-8",
  );
}

const TASTE_SECTIONS = [
  "visual_character",
  "emotional_tone",
  "anti_preferences",
  "admired_rejected_references",
  "novelty_vs_safety",
  "density_hierarchy",
  "motion_material",
  "brand_tone",
  "unresolved_taste_questions",
] as const;

/** Generate a complete taste interview with all 9 sections */
function completeTasteContent(): string {
  return TASTE_SECTIONS.map(
    (s) => `## ${s}\n\nThis section has meaningful content for ${s}.\n`,
  ).join("\n");
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("taste validator", () => {
  it("complete taste interview pass", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "uiux", "11_design_taste_interview.md"),
      completeTasteContent(),
      "utf-8",
    );

    const issues = await validateTasteInterview(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it("missing artifact fail", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    // No taste interview file created

    const issues = await validateTasteInterview(root, defaultConfig);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]?.code).toBe("UIX-VAL-TASTE-MISSING");
    expect(issues[0]?.severity).toBe("error");
  });

  it("incomplete sections fail", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    // Only 6 of 9 sections
    const partialContent = TASTE_SECTIONS.slice(0, 6)
      .map((s) => `## ${s}\n\nContent for ${s}.\n`)
      .join("\n");
    await writeFile(
      path.join(root, "uiux", "11_design_taste_interview.md"),
      partialContent,
      "utf-8",
    );

    const issues = await validateTasteInterview(root, defaultConfig);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]?.code).toBe("UIX-VAL-TASTE-INCOMPLETE");
    expect(issues[0]?.severity).toBe("error");
    // Should mention missing section names
    expect(issues[0]?.message).toContain("motion_material");
  });

  it("non-UI skip", async () => {
    const root = await newTempDir();
    await createNonUiPack(root);

    const issues = await validateTasteInterview(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it("no preference edge", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    // All 9 sections with "no preference" content
    const noPreferenceContent = TASTE_SECTIONS.map(
      (s) => `## ${s}\n\nno preference\n`,
    ).join("\n");
    await writeFile(
      path.join(root, "uiux", "11_design_taste_interview.md"),
      noPreferenceContent,
      "utf-8",
    );

    const issues = await validateTasteInterview(root, defaultConfig);

    // "no preference" is valid non-empty content; validator passes
    expect(issues).toHaveLength(0);
  });
});
