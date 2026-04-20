/**
 * Comparison validator tests — canonical two-file architecture
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
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: web\n", "utf-8");
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
  it("pass: canonical two-file shape", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const compContent = [
      "# Option Comparison",
      "",
      "## Option A",
      "Description of Option A.",
      "",
      "## Option B",
      "Description of Option B.",
    ].join("\n");
    await writeFile(path.join(root, "uiux", "30_option_comparison.md"), compContent, "utf-8");
    const anchorContent = [
      "# Selected Anchor Screen",
      "",
      "selected_option: Option A",
      "why_selected: Better accessibility compliance",
      "rejected_or_deferred_options:",
      "  - Option B: deferred — lower priority",
    ].join("\n");
    await writeFile(
      path.join(root, "uiux", "31_selected_anchor_screen.md"),
      anchorContent,
      "utf-8",
    );

    const issues = await validateOptionComparison(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it("fail: selection missing", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const compContent = [
      "# Option Comparison",
      "",
      "## Option A",
      "Description of Option A.",
      "",
      "## Option B",
      "Description of Option B.",
    ].join("\n");
    await writeFile(path.join(root, "uiux", "30_option_comparison.md"), compContent, "utf-8");
    // Anchor file exists but missing selected_option
    const anchorContent = [
      "# Selected Anchor Screen",
      "",
      "Some notes about the selection process.",
    ].join("\n");
    await writeFile(
      path.join(root, "uiux", "31_selected_anchor_screen.md"),
      anchorContent,
      "utf-8",
    );

    const issues = await validateOptionComparison(root, defaultConfig);

    const selectionIssue = issues.find((i) => i.code === "UIX-VAL-ANCHOR-SELECTED-OPTION-MISSING");
    expect(selectionIssue).toBeDefined();
    expect(selectionIssue?.severity).toBe("error");
    expect(selectionIssue?.message).toContain("selected_option");
    // Canonical wording must not contain stale legacy terminology
    expect(selectionIssue?.code).not.toContain("DIRECTION");
  });

  it("fail: insufficient options", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const content = ["# Option Comparison", "", "## Option A", "Only one option here."].join("\n");
    await writeFile(path.join(root, "uiux", "30_option_comparison.md"), content, "utf-8");

    const issues = await validateOptionComparison(root, defaultConfig);

    const insufficientIssue = issues.find((i) => i.code === "UIX-VAL-COMPARISON-INSUFFICIENT");
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
