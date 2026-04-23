import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { validateOptionComparison } from "../../../src/core/validators/uix/comparisonValidator.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-direction-validator-"));
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

describe("comparisonValidator", () => {
  it("pass: exploration-first shape", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "uiux", "30_exploration_brief.md"),
      [
        "# Exploration Brief",
        "",
        "## Product Intent",
        "Clarify the most important decision on the dashboard.",
        "",
        "## Must-preserve Interactions",
        "- Filters stay visible.",
        "",
        "## Brand Signals",
        "- Calm confidence",
        "",
        "## Differentiation Targets",
        "- Avoid default SaaS admin-shell patterns",
      ].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(root, "uiux", "33_exploration_rubric.md"),
      [
        "# Exploration Rubric",
        "",
        "## Design Quality",
        "Weighted heavily.",
        "",
        "## Originality",
        "Weighted heavily.",
        "",
        "## Craft",
        "Hard floor.",
        "",
        "## Functionality",
        "Hard floor.",
      ].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(root, "uiux", "34_evaluator_calibration.md"),
      [
        "# Evaluator Calibration",
        "",
        "## Good Critique",
        "Specific and skeptical.",
        "",
        "## Too Lenient",
        "Avoid generic praise.",
        "",
        "## Blandness Fail",
        "Reject safe defaults.",
        "",
        "## Originality Fail",
        "Reject near-template copies.",
      ].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(root, "uiux", "50_review_input_bundle.md"),
      "# Review Input Bundle\n\n## Best-of-history\nRetain stronger earlier directions when later loops regress.\n",
      "utf-8",
    );

    const issues = await validateOptionComparison(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it("fail: exploration brief missing", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);

    const issues = await validateOptionComparison(root, defaultConfig);

    expect(issues.some((i) => i.code === "UIX-VAL-DIRECTION-BRIEF-MISSING")).toBe(true);
  });

  it("fail: rubric incomplete", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "uiux", "30_exploration_brief.md"),
      [
        "## Product Intent",
        "x",
        "## Must-preserve Interactions",
        "x",
        "## Brand Signals",
        "x",
        "## Differentiation Targets",
        "x",
      ].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(root, "uiux", "33_exploration_rubric.md"),
      "# Exploration Rubric\n\n## Design Quality\nx\n",
      "utf-8",
    );

    const issues = await validateOptionComparison(root, defaultConfig);

    expect(issues.some((i) => i.code === "UIX-VAL-DIRECTION-RUBRIC-INCOMPLETE")).toBe(true);
  });

  it("non-ui: returns empty array for non-ui specs", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: non-ui\n", "utf-8");

    const issues = await validateOptionComparison(root, defaultConfig);

    expect(issues).toEqual([]);
  });
});
