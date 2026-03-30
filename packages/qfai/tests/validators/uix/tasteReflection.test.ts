/**
 * Taste reflection validator test — spec-0037 TDD-0012
 *
 * QFAI:SPEC-0037:TC-0037-0012
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { validateTasteReflection } from "../../../src/core/validators/uix/tasteReflection.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-tref-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("taste reflection", () => {
  it("non-UI returns n/a", async () => {
    const root = await newTempDir();
    await writeFile(
      path.join(root, "01_Spec.md"),
      "# Spec\n\n- surface: non-ui\n",
      "utf-8",
    );

    const issues = await validateTasteReflection(root, defaultConfig);

    expect(issues).toHaveLength(0);
  });
});
