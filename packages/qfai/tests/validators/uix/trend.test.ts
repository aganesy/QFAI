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
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: web\n", "utf-8");
  await mkdir(path.join(root, "uiux"), { recursive: true });
}

function completeTrendScan(): string {
  const category = (name: string) =>
    [
      `## ${name}`,
      "",
      "### Entry 1",
      "",
      "- reference: https://example.com",
      "- observation: Concrete trend observation.",
      "- decision_connection: Influences which option should be selected.",
      "- evaluation_connection: Creates a concrete scoring/checking lens.",
      "- local_implication: Concrete local implication.",
      "",
    ].join("\n");

  return [
    "# Trend Scan",
    "",
    category("user expectation / market norm"),
    category("product neighbor / comparable flow"),
    category("platform convention"),
    category("accessibility / compliance relevant signal"),
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
    await writeFile(path.join(root, "uiux", "20_trend_scan.md"), completeTrendScan(), "utf-8");

    await expect(validateTrendScan(root, defaultConfig)).resolves.toEqual([]);
  });

  it("fails when a required category is missing", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "uiux", "20_trend_scan.md"),
      completeTrendScan().replace(/## accessibility \/ compliance relevant signal[\s\S]*$/, ""),
      "utf-8",
    );

    const issues = await validateTrendScan(root, defaultConfig);
    expect(issues.some((issue) => issue.code === "UIX-VAL-TREND-CATEGORY-MISSING")).toBe(true);
  });

  it("fails when decision_connection is missing", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "uiux", "20_trend_scan.md"),
      completeTrendScan().replace(
        "- decision_connection: Influences which option should be selected.",
        "",
      ),
      "utf-8",
    );

    const issues = await validateTrendScan(root, defaultConfig);
    expect(issues.some((issue) => issue.code === "UIX-VAL-TREND-FIELD-MISSING")).toBe(true);
  });

  it("non-UI skip", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: non-ui\n", "utf-8");

    const issues = await validateTrendScan(root, defaultConfig);
    expect(issues).toEqual([]);
  });
});
