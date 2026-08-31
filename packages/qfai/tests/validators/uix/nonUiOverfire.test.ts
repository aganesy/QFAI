/**
 * Non-UI over-fire regression test — spec-0037 TDD-0014
 *
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { runCanonicalUixValidators } from "../../../src/core/validators/uix/canonical.js";
import { countUiBearingFires } from "../../../src/core/validators/uix/nonUiOverfire.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-overfire-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

/** A complete, valid `ui_bearing: false` Classification block. */
const NON_UI_CONTEXT = [
  "# Context",
  "",
  "## UI-bearing Classification",
  "",
  "- ui_bearing: false",
  "- primary_surface: non-ui",
  "- secondary_surfaces:",
  "- classification_rationale: Library-only change with no rendered surface.",
  "",
].join("\n");

describe("non-UI regression", () => {
  it("zero UI-bearing fires", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: non-ui\n", "utf-8");

    const result = await countUiBearingFires(root, defaultConfig);

    expect(result.fireCount).toBe(0);
    expect(result.issues).toHaveLength(0);
  });

  // The case above has no `01_Context.md`, so production's `resolvePackRoots`
  // would not even treat it as a pack root and every validator behind the gate
  // returns early on absent input. A valid non-UI pack is the input that can
  // actually catch a canonical validator over-firing on `ui_bearing: false`.
  it("zero fires on a valid non-UI pack, through both entry points", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Context.md"), NON_UI_CONTEXT, "utf-8");
    await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: non-ui\n", "utf-8");

    const counted = await countUiBearingFires(root, defaultConfig);
    const aggregate = await runCanonicalUixValidators(root, defaultConfig);

    expect(counted.issues.map((i) => i.code)).toEqual([]);
    expect(counted.fireCount).toBe(0);
    expect(aggregate.map((i) => i.code)).toEqual([]);
  });

  // The count used to come from a private list naming six modules that had been
  // unwired from `runCanonicalUixValidators` when the pre-`DESIGN.md` uiux
  // sidecars were retired — five never executed in production and two could not
  // return an issue at all. Comparing against the aggregate on a pack that does
  // fire keeps the two lists identical: drop a canonical validator from the
  // regression, or re-add one production never runs, and the codes diverge.
  it("counts exactly what the canonical aggregate reports", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Context.md"), "# Context\n\n- surface: web\n", "utf-8");
    await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: web\n", "utf-8");
    await mkdir(path.join(root, "uiux"), { recursive: true });
    // A retired sidecar filename — `validateForbiddenLegacyFiles` is the live
    // rule that reports it, so the pack is guaranteed to produce fires.
    await writeFile(
      path.join(root, "uiux", "11_design_taste_interview.md"),
      "# Taste interview\n",
      "utf-8",
    );

    const counted = await countUiBearingFires(root, defaultConfig);
    const aggregate = await runCanonicalUixValidators(root, defaultConfig);

    expect(counted.fireCount).toBeGreaterThan(0);
    expect(counted.issues.map((i) => i.code).sort()).toEqual(aggregate.map((i) => i.code).sort());
  });

  it("does not re-export the retired sidecar validators", async () => {
    const barrel = await import("../../../src/core/validators/index.js");

    for (const name of [
      "validateTasteInterview",
      "validateStrategyStrong",
      "validateTasteReflection",
      "validateAntiPreference",
    ]) {
      expect(Object.keys(barrel)).not.toContain(name);
    }

    // `validateTrendScan` is NOT one of them: `04_Sources.md#Trend Scan` is
    // live SSOT, only the `uiux/20_trend_scan.md` sidecar was retired.
    expect(Object.keys(barrel)).toContain("validateTrendScan");
  });
});
