/**
 * Canonical sidecar family completeness validator tests.
 *
 * The file reads no shipped document, so the canonical-wording obligation it
 * used to claim is discharged elsewhere.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { validateThreeLayerFamilyCompleteness } from "../../../src/core/validators/uix/threeLayer.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-3layer-"));
  tempDirs.push(dir);
  return dir;
}

async function createUiBearingPack(root: string): Promise<void> {
  await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: web\n", "utf-8");
  await mkdir(path.join(root, "uiux"), { recursive: true });
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("canonical sidecar family completeness", () => {
  it("reports a missing 00_index.md like any other family member", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(path.join(root, "uiux", "40_screen_contracts.md"), "# Contracts\n", "utf-8");
    await writeFile(path.join(root, "uiux", "50_review_input_bundle.md"), "# Bundle\n", "utf-8");

    const issues = await validateThreeLayerFamilyCompleteness(root, defaultConfig);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-THREELAYER-002");
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.file).toBe("uiux/00_index.md");
  });

  it("reports every family member when the whole family is absent", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);

    const issues = await validateThreeLayerFamilyCompleteness(root, defaultConfig);

    expect(issues.map((issue) => issue.file)).toEqual([
      "uiux/00_index.md",
      "uiux/40_screen_contracts.md",
      "uiux/50_review_input_bundle.md",
    ]);
  });

  it("stays silent when the family is complete", async () => {
    const root = await newTempDir();
    await createUiBearingPack(root);
    await writeFile(path.join(root, "uiux", "00_index.md"), "# Index\n", "utf-8");
    await writeFile(path.join(root, "uiux", "40_screen_contracts.md"), "# Contracts\n", "utf-8");
    await writeFile(path.join(root, "uiux", "50_review_input_bundle.md"), "# Bundle\n", "utf-8");

    const issues = await validateThreeLayerFamilyCompleteness(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });

  it("skips non-UI packs", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: non-ui\n", "utf-8");

    const issues = await validateThreeLayerFamilyCompleteness(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });
});
