/**
 * Non-UI safety for v1.7.16 validators — spec-0014 TDD-0030
 *
 * QFAI:SPEC-0014:TC-0014-0030
 *
 * Asserts that all seven v1.7.16 design-quality validators
 * (UIX-VAL-T01..T04, UIX-VAL-DS01/DS02, PROT-DS01) produce zero issues
 * when the target discussion pack is classified as non-UI
 * (`ui_bearing: false` / `primary_surface: non-ui`).
 *
 * Staged severity (NFR-0007) is not relevant here: a non-UI pack must
 * never fire any of these validators regardless of severity.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { validateDesignSystemPresence } from "../../../src/core/validators/uix/designSystemPresence.js";
import { validateTrendAxisTraceability } from "../../../src/core/validators/uix/trendAxisTraceability.js";
import { validatePrototypingDesignSystem } from "../../../src/core/validators/prototypingDesignSystem.js";

const tempDirs: string[] = [];

async function newTempRoot(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-nonui-v1716-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

function nonUiContext(): string {
  return [
    "# Context",
    "",
    "## UI-bearing Classification",
    "",
    "- ui_bearing: false",
    "- primary_surface: non-ui",
    "- secondary_surfaces: []",
    "- classification_rationale: API-only pipeline; no user-facing surface.",
    "",
  ].join("\n");
}

async function setupNonUiPack(): Promise<{ root: string; packDir: string }> {
  const root = await newTempRoot();
  const packDir = path.join(root, ".qfai", "discussion", "discussion-20260418120000000");
  await mkdir(packDir, { recursive: true });
  await writeFile(path.join(packDir, "01_Context.md"), nonUiContext(), "utf-8");
  // Even with populated 04_Sources.md + uiux files that would otherwise fire,
  // the non-UI classification must still short-circuit every validator.
  await writeFile(
    path.join(packDir, "04_Sources.md"),
    [
      "# Sources",
      "",
      "## Trend Scan",
      "",
      "- TS-01 / Visual / Something / evaluation_connection: (empty)",
      "",
    ].join("\n"),
    "utf-8",
  );
  await writeFile(
    path.join(packDir, "prototyping.json"),
    JSON.stringify({ recommended_mode: "full-harness", scoringTrace: {} }),
    "utf-8",
  );
  return { root, packDir };
}

describe("non-UI safety — v1.7.16 validators", () => {
  // QFAI:SPEC-0014:TC-0014-0030
  it("UIX-VAL-T01..T04 produce zero issues on non-UI pack", async () => {
    const { packDir } = await setupNonUiPack();
    const issues = await validateTrendAxisTraceability(packDir, defaultConfig);
    expect(issues).toEqual([]);
  });

  // QFAI:SPEC-0014:TC-0014-0030
  it("UIX-VAL-DS01/DS02 produce zero issues on non-UI pack", async () => {
    const { packDir } = await setupNonUiPack();
    const issues = await validateDesignSystemPresence(packDir, defaultConfig);
    expect(issues).toEqual([]);
  });

  // QFAI:SPEC-0014:TC-0014-0030
  it("PROT-DS01 produces zero issues on non-UI pack", async () => {
    const { root } = await setupNonUiPack();
    const issues = await validatePrototypingDesignSystem(root, defaultConfig);
    expect(issues).toEqual([]);
  });
});
