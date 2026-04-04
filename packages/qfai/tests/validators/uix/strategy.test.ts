import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { validateStrategyStrong } from "../../../src/core/validators/uix/strategy.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-strategy-"));
  tempDirs.push(dir);
  return dir;
}

async function createUiBearingPack(root: string): Promise<void> {
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: web-ui\n", "utf-8");
  await mkdir(path.join(root, "uiux"), { recursive: true });
}

function strategyContent(overrides: Record<string, string> = {}): string {
  const base = {
    surface: "web",
    decision: "component-library",
    why_this_strategy: "Matches the current product constraints and shipping needs.",
    expected_strengths: "Predictable delivery speed and reuse of proven patterns.",
    known_risks: "Can constrain visual originality if left ungoverned.",
    fit_for_this_product: "Supports the existing web surface and review process.",
    ...overrides,
  };
  return [
    "# Strategy",
    "",
    `- surface: ${base.surface}`,
    `- decision: ${base.decision}`,
    `- why_this_strategy: ${base.why_this_strategy}`,
    `- expected_strengths: ${base.expected_strengths}`,
    `- known_risks: ${base.known_risks}`,
    `- fit_for_this_product: ${base.fit_for_this_product}`,
  ].join("\n");
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("validateStrategyStrong", () => {
  it("passes for canonical strategy file", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "uiux", "10_implementation_strategy.md"),
      strategyContent(),
      "utf-8",
    );

    await expect(validateStrategyStrong(root, defaultConfig)).resolves.toEqual([]);
  });

  it("errors when only legacy filename exists", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(path.join(root, "uiux", "10_strategy.md"), strategyContent(), "utf-8");

    const issues = await validateStrategyStrong(root, defaultConfig);
    expect(issues.some((issue) => issue.code === "UIX-VAL-STRATEGY-LEGACY-FILENAME")).toBe(true);
  });

  it("errors on invalid decision enum", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "uiux", "10_implementation_strategy.md"),
      strategyContent({ decision: "custom-framework" }),
      "utf-8",
    );

    const issues = await validateStrategyStrong(root, defaultConfig);
    expect(issues.some((issue) => issue.code === "UIX-VAL-STRATEGY-NONCANONICAL-DECISION")).toBe(
      true,
    );
  });

  it("errors on invalid surface enum", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "uiux", "10_implementation_strategy.md"),
      strategyContent({ surface: "web-ui" }),
      "utf-8",
    );

    const issues = await validateStrategyStrong(root, defaultConfig);
    expect(issues.some((issue) => issue.code === "UIX-VAL-STRATEGY-LEGACY-SURFACE")).toBe(true);
  });
});
