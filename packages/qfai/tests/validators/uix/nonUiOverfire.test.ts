/**
 * Non-UI over-fire regression test — spec-0037 TDD-0014
 *
 * QFAI:SPEC-0014:TC-0014-0014
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
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

describe("non-UI regression", () => {
  it("zero UI-bearing fires", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: non-ui\n", "utf-8");

    const result = await countUiBearingFires(root, defaultConfig);

    expect(result.fireCount).toBe(0);
    expect(result.issues).toHaveLength(0);
  });
});
