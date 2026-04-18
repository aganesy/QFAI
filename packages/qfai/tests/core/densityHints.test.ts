import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateDensityHints } from "../../src/core/validators/densityHints.js";

async function withTempSpec(test: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-density-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(specDir, { recursive: true });
    await writeFile(path.join(specDir, "04_Business-Rules.md"), "# BR\n", "utf-8");
    await test(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("validateDensityHints", () => {
  it("accepts layered markdown example and test case tables", async () => {
    await withTempSpec(async (root) => {
      const specDir = path.join(root, ".qfai", "specs", "spec-0001");
      await writeFile(
        path.join(specDir, "05_Examples.md"),
        [
          "# 05 Examples",
          "",
          "| EX-ID        | BR-Ref       | Input | Expected |",
          "| ------------ | ------------ | ----- | -------- |",
          "| EX-0001-0001 | BR-0001-0001 | in    | out      |",
          "",
        ].join("\n"),
        "utf-8",
      );
      await writeFile(
        path.join(specDir, "06_Test-Cases.md"),
        [
          "# 06 Test Cases",
          "",
          "| TC-ID        | Level | AC-Refs      | EX-Ref       | Steps | Expected |",
          "| ------------ | ----- | ------------ | ------------ | ----- | -------- |",
          "| TC-0001-0001 | L2    | AC-0001-0001 | EX-0001-0001 | step  | ok       |",
          "",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validateDensityHints(root, defaultConfig);
      expect(issues.some((entry) => entry.code === "QFAI-DENSITY-002")).toBe(false);
      expect(issues.some((entry) => entry.code === "QFAI-DENSITY-004")).toBe(false);
    });
  });
});
