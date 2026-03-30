/**
 * Migration format detection tests — spec-0037 TDD-0003..TDD-0007, TDD-0020
 *
 * QFAI:SPEC-0037:TC-0037-0003
 * QFAI:SPEC-0037:TC-0037-0004
 * QFAI:SPEC-0037:TC-0037-0005
 * QFAI:SPEC-0037:TC-0037-0006
 * QFAI:SPEC-0037:TC-0037-0007
 * QFAI:SPEC-0037:TC-0037-0020
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { detectFormatVersion } from "../../../src/core/validators/migration/formatDetection.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-migration-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("migration validator", () => {
  it("old format v1 detection", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: web-ui\n", "utf-8");
    // No uiux/ directory

    const result = await detectFormatVersion(root);

    expect(result.version).toBe(1);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("intermediate v2 upgrade guidance", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: web-ui\n", "utf-8");
    await mkdir(path.join(root, "uiux"), { recursive: true });
    const fourAxisContent = [
      "# Evaluation Axes",
      "",
      "## usability",
      "- task_completion: Can users finish?",
      "",
      "## consistency",
      "- design_system: Adherence",
    ].join("\n");
    await writeFile(path.join(root, "uiux", "20_eval_axes.md"), fourAxisContent, "utf-8");

    const result = await detectFormatVersion(root);

    expect(result.version).toBe(2);
    expect(result.upgradeGuidance).toBeDefined();
    expect(result.upgradeGuidance!).toContain("3-layer");
  });

  it("unknown format error", async () => {
    const root = await newTempDir();
    // No 01_Spec.md, no 01_Context.md

    const result = await detectFormatVersion(root);

    expect(result.version).toBe("unknown");
    expect(result.issues.some((i) => i.code === "UIX-VAL-MIGRATION-UNKNOWN-FORMAT")).toBe(true);
  });

  it("upgrade guidance content", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Spec.md"), "# Spec\n", "utf-8");
    // No uiux/ → v1

    const result = await detectFormatVersion(root);

    expect(result.upgradeGuidance).toBeDefined();
    expect(result.upgradeGuidance!).toContain("Detected version");
    expect(result.upgradeGuidance!).toContain("Target version");
    expect(result.upgradeGuidance!).toContain("Migration steps");
    expect(result.upgradeGuidance!).toContain("Affected files");
  });

  it("warning severity level", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Spec.md"), "# Spec\n", "utf-8");

    const result = await detectFormatVersion(root, "warning");

    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0]?.severity).toBe("warning");
  });

  it("stale-asset detection", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Spec.md"), "# Spec\n", "utf-8");

    const result = await detectFormatVersion(root);

    expect(result.staleAsset).toBe(true);
  });
});
