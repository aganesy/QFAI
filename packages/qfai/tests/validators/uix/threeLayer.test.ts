/**
 * 3-layer evaluation model validator tests — spec-0034 TDD-0010..TDD-0012, TDD-0026
 *
 * QFAI:SPEC-0002:TC-0002-0010
 * QFAI:SPEC-0002:TC-0002-0011
 * QFAI:SPEC-0002:TC-0002-0012
 * QFAI:SPEC-0002:TC-0002-0026
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import {
  validateForbiddenLegacyFiles,
  validateThreeLayerFamilyCompleteness,
  validateThreeLayerModel,
} from "../../../src/core/validators/uix/threeLayer.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-3layer-"));
  tempDirs.push(dir);
  return dir;
}

async function createUiBearingPack(root: string): Promise<void> {
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: web\n", "utf-8");
  await mkdir(path.join(root, "uiux"), { recursive: true });
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("3-layer validator", () => {
  it("new format pass", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const content = [
      "# Screen Contracts",
      "",
      "## Information Architecture",
      "",
      "- hierarchy: priority and grouping are clear",
      "",
      "## Navigation Flow",
      "",
      "- back path: every screen names the way out",
      "",
      "## Usability",
      "",
      "- spacing: precise alignment and rhythm",
      "",
      "## Functionality",
      "",
      "- task_clarity: primary action remains obvious",
    ].join("\n");
    await writeFile(path.join(root, "uiux", "40_screen_contracts.md"), content, "utf-8");

    const issues = await validateThreeLayerModel(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it("legacy 4-axis format is error", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const content = [
      "# Screen Contracts",
      "",
      "## craft",
      "",
      "- task_completion: Can users finish core tasks?",
      "",
      "## consistency",
      "",
      "- design_system: Adherence to design system",
      "",
      "## accessibility",
      "",
      "- wcag: WCAG 2.1 AA compliance",
      "",
      "## delight",
      "",
      "- satisfaction: User satisfaction score",
    ].join("\n");
    await writeFile(path.join(root, "uiux", "40_screen_contracts.md"), content, "utf-8");

    const issues = await validateThreeLayerModel(root, defaultConfig);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]?.code).toBe("UIX-VAL-3LAYER-LEGACY-FORMAT");
    expect(issues[0]?.severity).toBe("error");
  });

  it("mixed error", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const content = [
      "# Screen Contracts",
      "",
      "## Information Architecture",
      "",
      "- hierarchy: priority is clear",
      "",
      "## delight",
      "",
      "- satisfaction: Old 4-axis format mixed in",
    ].join("\n");
    await writeFile(path.join(root, "uiux", "40_screen_contracts.md"), content, "utf-8");

    const issues = await validateThreeLayerModel(root, defaultConfig);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]?.code).toBe("UIX-VAL-3LAYER-MIXED-FORMAT");
    expect(issues[0]?.severity).toBe("error");
  });

  it("retired sidecars 33_exploration_rubric.md / 34_evaluator_calibration.md are forbidden", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(path.join(root, "uiux", "33_exploration_rubric.md"), "# stale\n", "utf-8");
    await writeFile(path.join(root, "uiux", "34_evaluator_calibration.md"), "# stale\n", "utf-8");

    const issues = await validateForbiddenLegacyFiles(root, defaultConfig);
    const codes = issues.map((i) => i.code);
    expect(codes).toContain("UIX-VAL-3LAYER-FORBIDDEN-FILE");
    const files = issues.map((i) => i.file);
    expect(files).toContain("uiux/33_exploration_rubric.md");
    expect(files).toContain("uiux/34_evaluator_calibration.md");
  });

  it("non-UI skip", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: non-ui\n", "utf-8");

    const issues = await validateThreeLayerModel(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it("code alignment verification", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const content = [
      "# Screen Contracts",
      "",
      "## Information Architecture",
      "",
      "- hierarchy: clear priority",
      "",
      "## Functionality",
      "",
      "- brand: Unique to product",
    ].join("\n");
    await writeFile(path.join(root, "uiux", "40_screen_contracts.md"), content, "utf-8");

    const issues = await validateThreeLayerModel(root, defaultConfig);

    // All axes reference 3-layer model only — passes
    expect(issues).toHaveLength(0);
  });
});

describe("canonical sidecar family completeness", () => {
  it("reports a missing 00_index.md like any other family member", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(path.join(root, "uiux", "40_screen_contracts.md"), "# Contracts\n", "utf-8");
    await writeFile(path.join(root, "uiux", "50_review_input_bundle.md"), "# Bundle\n", "utf-8");

    const issues = await validateThreeLayerFamilyCompleteness(root, defaultConfig);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("UIX-VAL-3LAYER-INCOMPLETE-FAMILY");
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.file).toBe("uiux/00_index.md");
  });

  it("reports every family member when the whole family is absent", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);

    const issues = await validateThreeLayerFamilyCompleteness(root, defaultConfig);

    expect(issues.map((issue) => issue.file)).toEqual([
      "uiux/00_index.md",
      "uiux/40_screen_contracts.md",
      "uiux/50_review_input_bundle.md",
    ]);
  });

  it("stays silent when the family is complete", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(path.join(root, "uiux", "00_index.md"), "# Index\n", "utf-8");
    await writeFile(path.join(root, "uiux", "40_screen_contracts.md"), "# Contracts\n", "utf-8");
    await writeFile(path.join(root, "uiux", "50_review_input_bundle.md"), "# Bundle\n", "utf-8");

    const issues = await validateThreeLayerFamilyCompleteness(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it("skips non-UI packs", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: non-ui\n", "utf-8");

    const issues = await validateThreeLayerFamilyCompleteness(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });
});
