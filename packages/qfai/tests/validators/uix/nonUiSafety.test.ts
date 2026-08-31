/**
 * Non-UI safety validator test — spec-0035 TDD-0013
 *
 * QFAI:SPEC-0012:TC-0012-0013
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { validateOptionComparison } from "../../../src/core/validators/uix/comparisonValidator.js";
import { validateThreeLayerModel } from "../../../src/core/validators/uix/threeLayer.js";
import { validateTrendScan } from "../../../src/core/validators/uix/trendScan.js";
import { validateScreenContractSchema } from "../../../src/core/validators/uix/screenContract.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-nonui-"));
  tempDirs.push(dir);
  return dir;
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

describe("non-UI safety", () => {
  it("UI validators return n/a", async () => {
    const root = await newTempDir();
    await createNonUiPack(root);

    const validators = [
      validateThreeLayerModel,
      validateTrendScan,
      validateScreenContractSchema,
      validateOptionComparison,
    ];

    for (const validator of validators) {
      const issues = await validator(root, defaultConfig);
      expect(issues).toHaveLength(0);
    }
  });
});
