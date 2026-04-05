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
import { validateThreeLayerModel } from "../../../src/core/validators/uix/threeLayer.js";

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
      "# Evaluation Axes",
      "",
      "## invariant",
      "",
      "- accessibility: Universal access compliance",
      "- consistency: Design system adherence",
      "",
      "## trend-derived",
      "",
      "- micro_interaction: local_translation: Adopted from 2025 motion trends",
      "",
      "## product-specific",
      "",
      "- brand_alignment: Unique to this product context",
    ].join("\n");
    await writeFile(path.join(root, "uiux", "20_eval_axes.md"), content, "utf-8");

    const issues = await validateThreeLayerModel(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it("legacy 4-axis format is error", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    // v1.7.6 style 4-axis format
    const content = [
      "# Evaluation Axes",
      "",
      "## usability",
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
    await writeFile(path.join(root, "uiux", "20_eval_axes.md"), content, "utf-8");

    const issues = await validateThreeLayerModel(root, defaultConfig);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]?.code).toBe("UIX-VAL-3LAYER-LEGACY-FORMAT");
    expect(issues[0]?.severity).toBe("error");
  });

  it("mixed error", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    // Mix of 3-layer and 4-axis
    const content = [
      "# Evaluation Axes",
      "",
      "## invariant",
      "",
      "- accessibility: Universal",
      "",
      "## trend-derived",
      "",
      "- micro_interaction: local_translation: Trends",
      "",
      "## delight",
      "",
      "- satisfaction: Old 4-axis format mixed in",
    ].join("\n");
    await writeFile(path.join(root, "uiux", "20_eval_axes.md"), content, "utf-8");

    const issues = await validateThreeLayerModel(root, defaultConfig);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]?.code).toBe("UIX-VAL-3LAYER-MIXED-FORMAT");
    expect(issues[0]?.severity).toBe("error");
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
    // All axes correctly in 3-layer format
    const content = [
      "# Evaluation Axes",
      "",
      "## invariant",
      "",
      "- accessibility: Universal",
      "",
      "## product-specific",
      "",
      "- brand: Unique to product",
    ].join("\n");
    await writeFile(path.join(root, "uiux", "20_eval_axes.md"), content, "utf-8");

    const issues = await validateThreeLayerModel(root, defaultConfig);

    // All axes reference 3-layer model only — passes
    expect(issues).toHaveLength(0);
  });
});
