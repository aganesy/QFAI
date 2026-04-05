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
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: web\n", "utf-8");
  await mkdir(path.join(root, "uiux"), { recursive: true });
}

function strategyContent(
  overrides: Partial<{
    surface: string;
    selection_required: string;
    decision: string;
    candidate_options: string[];
    chosen_option: string;
    rationale: string[];
    verification_expectations: string[];
    notes_for_reviewer: string[];
  }> = {},
): string {
  const base = {
    surface: "web",
    selection_required: "true",
    decision: "component-library",
    candidate_options: ["component-library", "bespoke"],
    chosen_option: "component-library",
    rationale: ["Matches the current product constraints and shipping needs."],
    verification_expectations: ["Primary task should stay obvious on first view."],
    notes_for_reviewer: ["Focus on anchor-screen alignment and non-generic hierarchy."],
    ...overrides,
  };

  return [
    "# Strategy",
    "",
    `- surface: ${base.surface}`,
    `- selection_required: ${base.selection_required}`,
    `- decision: ${base.decision}`,
    "- candidate_options:",
    ...base.candidate_options.map((value) => `  - ${value}`),
    `- chosen_option: ${base.chosen_option}`,
    "- rationale:",
    ...base.rationale.map((value) => `  - ${value}`),
    "- verification_expectations:",
    ...base.verification_expectations.map((value) => `  - ${value}`),
    "- notes_for_reviewer:",
    ...base.notes_for_reviewer.map((value) => `  - ${value}`),
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

  it("warns when decision and chosen_option diverge", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "uiux", "10_implementation_strategy.md"),
      strategyContent({ decision: "design-system" }),
      "utf-8",
    );

    const issues = await validateStrategyStrong(root, defaultConfig);
    expect(issues.some((issue) => issue.code === "UIX-VAL-STRATEGY-DECISION-MISMATCH")).toBe(true);
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
    expect(issues.some((issue) => issue.code === "UIX-VAL-STRATEGY-INVALID-SURFACE")).toBe(true);
  });

  it("errors when chosen_option is not in candidate_options", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "uiux", "10_implementation_strategy.md"),
      strategyContent({ chosen_option: "native-pattern" }),
      "utf-8",
    );

    const issues = await validateStrategyStrong(root, defaultConfig);
    expect(issues.some((issue) => issue.code === "UIX-VAL-STRATEGY-CHOSEN-OPTION")).toBe(true);
  });

  it("non-UI skip", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: non-ui\n", "utf-8");

    const issues = await validateStrategyStrong(root, defaultConfig);
    expect(issues).toEqual([]);
  });
});
