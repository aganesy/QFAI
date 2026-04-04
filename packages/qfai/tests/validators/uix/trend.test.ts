import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { validateTrendScan } from "../../../src/core/validators/uix/trend.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-trend-"));
  tempDirs.push(dir);
  return dir;
}

async function createUiBearingPack(root: string): Promise<void> {
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: web-ui\n", "utf-8");
  await mkdir(path.join(root, "uiux"), { recursive: true });
}

function completeSources(): string {
  const category = (name: string) =>
    [
      `### ${name}`,
      "",
      "#### Entry 1",
      "",
      "- reference: https://example.com",
      "- observation: Concrete trend observation.",
      "- freshness_date: 2026-04-01",
      "- confidence: high",
      "- source_translation: Project-specific translation.",
      "- local_implication: Concrete local implication.",
      "",
    ].join("\n");

  return [
    "# Sources",
    "",
    "## Trend Scan",
    "",
    category("Visual Tone Trends"),
    category("Layout / Composition Trends"),
    category("Density / Hierarchy Trends"),
    category("Interaction / Motion Trends"),
    category("Component Styling Trends"),
    category("Stale / Overused AI Slop Patterns"),
  ].join("\n");
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("validateTrendScan", () => {
  it("passes when all categories and fields are present", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(path.join(root, "04_Sources.md"), completeSources(), "utf-8");

    await expect(validateTrendScan(root, defaultConfig)).resolves.toEqual([]);
  });

  it("fails when a required category is missing", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "04_Sources.md"),
      completeSources().replace(/### Stale \/ Overused AI Slop Patterns[\s\S]*$/, ""),
      "utf-8",
    );

    const issues = await validateTrendScan(root, defaultConfig);
    expect(issues.some((issue) => issue.code === "UIX-VAL-TREND-CATEGORY-MISSING")).toBe(true);
  });

  it("fails when freshness_date is missing", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "04_Sources.md"),
      completeSources().replace("- freshness_date: 2026-04-01", ""),
      "utf-8",
    );

    const issues = await validateTrendScan(root, defaultConfig);
    expect(issues.some((issue) => issue.code === "UIX-VAL-TREND-FIELD-MISSING")).toBe(true);
  });
});
