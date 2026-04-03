/**
 * Comparison validator tests — canonical selected-direction wording
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { validateOptionComparison } from "../../../src/core/validators/uix/comparisonValidator.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-comparison-"));
  tempDirs.push(dir);
  return dir;
}

async function createUiBearingPack(root: string): Promise<void> {
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: web-ui\n", "utf-8");
  await mkdir(path.join(root, "uiux"), { recursive: true });
}

async function createNonUiPack(root: string): Promise<void> {
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: non-ui\n", "utf-8");
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("comparisonValidator", () => {
  it("pass: canonical Selected Direction shape", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const content = [
      "# Option Comparison",
      "",
      "## Option A",
      "Description of Option A.",
      "",
      "## Option B",
      "Description of Option B.",
      "",
      "## Selected Direction",
      "",
      "Selected: Option A",
    ].join("\n");
    await writeFile(path.join(root, "uiux", "30_comparison.md"), content, "utf-8");

    const issues = await validateOptionComparison(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it("fail: selection missing", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const content = [
      "# Option Comparison",
      "",
      "## Option A",
      "Description of Option A.",
      "",
      "## Option B",
      "Description of Option B.",
    ].join("\n");
    await writeFile(path.join(root, "uiux", "30_comparison.md"), content, "utf-8");

    const issues = await validateOptionComparison(root, defaultConfig);

    const selectionIssue = issues.find(
      (i) => i.code === "UIX-VAL-SELECTED-DIRECTION-MISSING",
    );
    expect(selectionIssue).toBeDefined();
    expect(selectionIssue?.severity).toBe("error");
    expect(selectionIssue?.message).toBe(
      "30_comparison.md is missing a selected-direction declaration.",
    );
    expect(selectionIssue?.suggested_action).toContain("## Selected Direction");
    // Canonical wording must not contain stale anchor terminology
    expect(selectionIssue?.message).not.toContain("anchor");
    expect(selectionIssue?.code).not.toContain("ANCHOR");
  });

  it("fail: insufficient options", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const content = [
      "# Option Comparison",
      "",
      "## Option A",
      "Only one option here.",
    ].join("\n");
    await writeFile(path.join(root, "uiux", "30_comparison.md"), content, "utf-8");

    const issues = await validateOptionComparison(root, defaultConfig);

    const insufficientIssue = issues.find(
      (i) => i.code === "UIX-VAL-COMPARISON-INSUFFICIENT",
    );
    expect(insufficientIssue).toBeDefined();
    expect(insufficientIssue?.severity).toBe("error");
  });

  it("skip: non-UI pack", async () => {
    const root = await newTempDir();
    await createNonUiPack(root);

    const issues = await validateOptionComparison(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });
});
