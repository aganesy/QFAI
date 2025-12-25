import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { copyTemplateTree } from "../../src/cli/lib/fs.js";

describe("copyTemplateTree", () => {
  it("fails with guidance when conflicts exist and --force is missing", async () => {
    const sourceRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-src-"));
    const destRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-dest-"));
    await mkdir(path.join(sourceRoot, "nested"), { recursive: true });
    await writeFile(path.join(sourceRoot, "nested", "template.txt"), "sample");

    await copyTemplateTree(sourceRoot, destRoot, {
      force: false,
      dryRun: false,
    });

    await expect(
      copyTemplateTree(sourceRoot, destRoot, { force: false, dryRun: false }),
    ).rejects.toThrow(/--force/);
  });
});
