/**
 * Strategy validator tests — spec-0034 TDD-0016..TDD-0019
 *
 * QFAI:SPEC-0002:TC-0002-0016
 * QFAI:SPEC-0002:TC-0002-0017
 * QFAI:SPEC-0002:TC-0002-0018
 * QFAI:SPEC-0002:TC-0002-0019
 */
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

async function createNonUiPack(root: string): Promise<void> {
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: non-ui\n", "utf-8");
}

const STRONG_8_FIELDS = [
  "surface",
  "selection_required",
  "decision",
  "candidate_options",
  "chosen_option",
  "rationale",
  "verification_expectations",
  "notes_for_reviewer",
] as const;

function strongStrategyContent(overrides: Record<string, string> = {}): string {
  const defaults: Record<string, string> = {
    surface: "web-ui",
    selection_required: "true",
    decision: "Chose Option A for better accessibility",
    candidate_options: "Option A, Option B, Option C",
    chosen_option: "Option A",
    rationale:
      "Option A provides better accessibility compliance and performance characteristics for our target users",
    verification_expectations: "All WCAG AA checks pass in smoke testing",
    notes_for_reviewer: "Focus on mobile viewport behavior",
  };
  const merged = { ...defaults, ...overrides };
  return STRONG_8_FIELDS.map((f) => `- ${f}: ${merged[f]}`).join("\n");
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

function strongStrategyContentNested(
  overrides: Partial<Record<string, string | string[]>> = {},
): string {
  const lines = [
    `- surface: ${overrides.surface ?? "web-ui"}`,
    `- selection_required: ${overrides.selection_required ?? "true"}`,
    `- decision: ${overrides.decision ?? "Chose Option A for better accessibility"}`,
  ];
  const candidates = overrides.candidate_options ?? [
    "Option A: Better accessibility",
    "Option B: Better performance",
    "Option C: Lower cost",
  ];
  if (Array.isArray(candidates)) {
    lines.push("- candidate_options:");
    for (const c of candidates) {
      lines.push(`  - ${c}`);
    }
  } else {
    lines.push(`- candidate_options: ${candidates}`);
  }
  lines.push(
    `- chosen_option: ${overrides.chosen_option ?? "Option A"}`,
    `- rationale: ${overrides.rationale ?? "Option A provides better accessibility"}`,
    `- verification_expectations: ${overrides.verification_expectations ?? "All WCAG AA checks pass"}`,
    `- notes_for_reviewer: ${overrides.notes_for_reviewer ?? "Focus on mobile viewport"}`,
  );
  return lines.join("\n");
}

describe("strategy validator", () => {
  it("strong schema pass", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "uiux", "10_strategy.md"),
      `# Strategy\n\n${strongStrategyContent()}`,
      "utf-8",
    );

    const issues = await validateStrategyStrong(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it("weak schema warning", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    // Weak format: only surface_type, approach, rationale
    const weakContent = [
      "# Strategy",
      "",
      "- surface_type: web-ui",
      "- approach: Progressive enhancement with server-side rendering for initial paint",
      "- rationale: Improved initial load performance and SEO capabilities for marketing pages",
    ].join("\n");
    await writeFile(path.join(root, "uiux", "10_strategy.md"), weakContent, "utf-8");

    const issues = await validateStrategyStrong(root, defaultConfig);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]?.code).toBe("UIX-VAL-STRATEGY-WEAK-LEGACY");
    expect(issues[0]?.severity).toBe("warning");
  });

  it("non-UI skip", async () => {
    const root = await newTempDir();
    await createNonUiPack(root);

    const issues = await validateStrategyStrong(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it("nested bullet canonical pass", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "uiux", "10_strategy.md"),
      `# Strategy\n\n${strongStrategyContentNested()}`,
      "utf-8",
    );

    const issues = await validateStrategyStrong(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it("nested bullet selection constraint", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(
      path.join(root, "uiux", "10_strategy.md"),
      `# Strategy\n\n${strongStrategyContentNested({ candidate_options: ["Only Option A"] })}`,
      "utf-8",
    );

    const issues = await validateStrategyStrong(root, defaultConfig);

    const selectionIssue = issues.find((i) => i.code === "UIX-VAL-STRATEGY-SELECTION-CONSTRAINT");
    expect(selectionIssue).toBeDefined();
    expect(selectionIssue?.severity).toBe("error");
  });

  it("selection constraint edge", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    // selection_required=true but only 1 candidate
    await writeFile(
      path.join(root, "uiux", "10_strategy.md"),
      `# Strategy\n\n${strongStrategyContent({ candidate_options: "Option A", selection_required: "true" })}`,
      "utf-8",
    );

    const issues = await validateStrategyStrong(root, defaultConfig);

    expect(issues.length).toBeGreaterThan(0);
    const selectionIssue = issues.find((i) => i.message.includes("candidate"));
    expect(selectionIssue).toBeDefined();
    expect(selectionIssue?.severity).toBe("error");
  });
});
