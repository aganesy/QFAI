/**
 * Trend validator tests — spec-0034 TDD-0006..TDD-0009, TDD-0027
 *
 * QFAI:SPEC-0002:TC-0002-0006
 * QFAI:SPEC-0002:TC-0002-0007
 * QFAI:SPEC-0002:TC-0002-0008
 * QFAI:SPEC-0002:TC-0002-0009
 * QFAI:SPEC-0002:TC-0002-0027
 */
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

async function createNonUiPack(root: string): Promise<void> {
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: non-ui\n", "utf-8");
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("trend validator", () => {
  it("complete trend scan pass", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const content = [
      "# Sources",
      "",
      "## Trend Scan",
      "",
      "| reference | confidence | freshness_date | source_translation |",
      "| --------- | ---------- | -------------- | ------------------ |",
      "| Ref A     | high       | 2025-12-01     | Adopted micro-interaction pattern |",
      "| Ref B     | medium     | 2025-11-15     | Adopted card layout trend |",
      "| Ref C     | low        | 2025-10-01     | Adopted minimalist approach |",
    ].join("\n");
    await writeFile(path.join(root, "04_Sources.md"), content, "utf-8");

    const issues = await validateTrendScan(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it("missing scan fail", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    // 04_Sources.md with no trend scan section
    await writeFile(
      path.join(root, "04_Sources.md"),
      "# Sources\n\n## Other\n\nSome data.\n",
      "utf-8",
    );

    const issues = await validateTrendScan(root, defaultConfig);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]?.code).toBe("UIX-VAL-TREND-SCAN-MISSING");
  });

  it("missing freshness fail", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const content = [
      "# Sources",
      "",
      "## Trend Scan",
      "",
      "| reference | confidence | freshness_date |",
      "| --------- | ---------- | -------------- |",
      "| Ref A     | high       | 2025-12-01     |",
    ].join("\n");
    // Has trend scan but no source_translation column
    await writeFile(path.join(root, "04_Sources.md"), content, "utf-8");

    const issues = await validateTrendScan(root, defaultConfig);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]?.code).toBe("UIX-VAL-TREND-FRESHNESS-MISSING");
  });

  it("non-UI skip", async () => {
    const root = await newTempDir();
    await createNonUiPack(root);

    const issues = await validateTrendScan(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it("all low confidence edge", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    const content = [
      "# Sources",
      "",
      "## Trend Scan",
      "",
      "| reference | confidence | freshness_date | source_translation |",
      "| --------- | ---------- | -------------- | ------------------ |",
      "| Ref A     | low        | 2025-12-01     | Adopted pattern A |",
      "| Ref B     | low        | 2025-11-15     | Adopted pattern B |",
    ].join("\n");
    await writeFile(path.join(root, "04_Sources.md"), content, "utf-8");

    const issues = await validateTrendScan(root, defaultConfig);

    // All low confidence is valid (field exists); validator passes
    expect(issues).toHaveLength(0);
  });
});
