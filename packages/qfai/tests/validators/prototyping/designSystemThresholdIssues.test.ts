/**
 * Tests for validateDesignSystemThresholdIssues (v1.8.4 Phase 3).
 *
 * spec-0012 TC-0012-0301 / TC-0012-0302 / TC-0012-0303 / AC-0012-0183 / AC-0012-0184
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  validateDesignSystemThresholdIssues,
  DS_PASS_THRESHOLD,
} from "../../../src/core/validators/prototyping/designSystemThreshold.js";

const tempDirs: string[] = [];

async function newPackDir(withDesignSystemMd: boolean): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-ds-pack-"));
  tempDirs.push(dir);
  if (withDesignSystemMd) {
    await mkdir(path.join(dir, "uiux"), { recursive: true });
    await writeFile(path.join(dir, "uiux/12_design_system.md"), "# DS\n", "utf-8");
  }
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("validateDesignSystemThresholdIssues", () => {
  const path_ = ".qfai/evidence/prototyping.json";

  it("returns empty when 12_design_system.md is absent in pack", async () => {
    const packDir = await newPackDir(false);
    const record = { scoringTrace: { designSystemCompliance: 0.5 } };
    expect(await validateDesignSystemThresholdIssues(packDir, record, path_)).toEqual([]);
  });

  it("returns empty when scoringTrace.designSystemCompliance is missing", async () => {
    const packDir = await newPackDir(true);
    const record = { scoringTrace: {} };
    expect(await validateDesignSystemThresholdIssues(packDir, record, path_)).toEqual([]);
  });

  it("returns empty when score equals the pass threshold (0.75)", async () => {
    const packDir = await newPackDir(true);
    const record = { scoringTrace: { designSystemCompliance: DS_PASS_THRESHOLD } };
    expect(await validateDesignSystemThresholdIssues(packDir, record, path_)).toEqual([]);
  });

  it("returns empty when score is well above threshold", async () => {
    const packDir = await newPackDir(true);
    const record = { scoringTrace: { designSystemCompliance: 0.95 } };
    expect(await validateDesignSystemThresholdIssues(packDir, record, path_)).toEqual([]);
  });

  it("emits QFAI-PROT-334 (error) when score is below threshold", async () => {
    const packDir = await newPackDir(true);
    const record = { scoringTrace: { designSystemCompliance: 0.5 } };
    const issues = await validateDesignSystemThresholdIssues(packDir, record, path_);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-PROT-334");
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.category).toBe("canonical");
    expect(issues[0]?.file).toBe(path_);
    expect(issues[0]?.message).toMatch(/50%/);
    expect(issues[0]?.message).toMatch(/75%/);
  });

  it("returns empty when scoringTrace is not an object", async () => {
    const packDir = await newPackDir(true);
    const record = { scoringTrace: "not-an-object" };
    expect(await validateDesignSystemThresholdIssues(packDir, record, path_)).toEqual([]);
  });
});
