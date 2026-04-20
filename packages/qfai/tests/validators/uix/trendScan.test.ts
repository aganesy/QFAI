/**
 * Trend-scan validator tests for v1.7.17 guideline coverage warnings.
 *
 * QFAI:SPEC-0004:TC-0004-0063
 * QFAI:SPEC-0004:TC-0004-0064
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { validateTrendScan } from "../../../src/core/validators/uix/trendScan.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-trend-scan-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

function classificationBlock(uiBearing: boolean): string {
  if (uiBearing) {
    return [
      "# Context",
      "",
      "## UI-bearing Classification",
      "",
      "- ui_bearing: true",
      "- primary_surface: web",
      "- secondary_surfaces:",
      "  - mobile",
      "- classification_rationale: Primary workflow is screen-based.",
      "",
    ].join("\n");
  }

  return [
    "# Context",
    "",
    "## UI-bearing Classification",
    "",
    "- ui_bearing: false",
    "- primary_surface: non-ui",
    "- secondary_surfaces:",
    "- classification_rationale: CLI-only workflow.",
    "",
  ].join("\n");
}

async function createPack(root: string, uiBearing: boolean): Promise<void> {
  await writeFile(
    path.join(root, "01_Spec.md"),
    `# Spec\n\n- surface: ${uiBearing ? "web" : "non-ui"}\n`,
    "utf-8",
  );
  await writeFile(path.join(root, "01_Context.md"), classificationBlock(uiBearing), "utf-8");
}

function entry(sourceId: string, extraLines: string[] = []): string {
  return [
    `#### Entry ${sourceId}`,
    "",
    `- source_id: ${sourceId}`,
    "- reference: https://example.com/reference",
    "- observation: Concrete trend observation.",
    "- decision_connection: Connects to a local design choice.",
    "- evaluation_connection: TRD-01",
    "- local_implication: Concrete local implication.",
    ...extraLines,
    "",
  ].join("\n");
}

function buildSources(includeGuidelineCategory: boolean, validGuidelineEntry: boolean): string {
  const lines = [
    "# 04 Sources",
    "",
    "## Trend Scan",
    "",
    "### user expectation / market norm",
    "",
    entry("SRC-UE-01"),
    "### product neighbor / comparable flow",
    "",
    entry("SRC-PN-01"),
    "### platform convention",
    "",
    entry("SRC-PC-01"),
    "### accessibility / compliance relevant signal",
    "",
    entry("SRC-AC-01"),
  ];

  if (includeGuidelineCategory) {
    lines.push("### design_guideline_research", "");
    lines.push(
      validGuidelineEntry
        ? entry("SRC-GUIDE-01", [
            "- guideline_name: WCAG 2.2",
            "- rule_refs: 2.5.5 Target Size, 1.4.3 Contrast",
            "- local_translation: Buttons keep 44px targets and 4.5:1 contrast.",
          ])
        : entry("SRC-GUIDE-01", [
            "- guideline_name: WCAG 2.2",
            "- rule_refs: TBD",
            "- local_translation: TBD",
          ]),
    );
  }

  return lines.join("\n");
}

describe("validateTrendScan v1.7.17 guideline coverage", () => {
  // QFAI:SPEC-0004:TC-0004-0063
  it("warns when a UI-bearing pack lacks design_guideline_research coverage", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    await writeFile(path.join(root, "04_Sources.md"), buildSources(false, false), "utf-8");

    const issues = await validateTrendScan(root, defaultConfig);
    const warnings = issues.filter((issue) => issue.code === "UIX-VAL-T05");

    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.severity).toBe("warning");
    expect(warnings[0]?.message).toMatch(/design_guideline_research|guideline/i);
  });

  // QFAI:SPEC-0004:TC-0004-0064
  it("accepts one concrete design guideline research entry", async () => {
    const root = await newTempDir();
    await createPack(root, true);
    await writeFile(path.join(root, "04_Sources.md"), buildSources(true, true), "utf-8");

    const issues = await validateTrendScan(root, defaultConfig);
    expect(issues.filter((issue) => issue.code === "UIX-VAL-T05")).toHaveLength(0);
  });
});
