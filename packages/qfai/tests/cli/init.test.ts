import { access, mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
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

  it("creates v0.3.3 template additions", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-"));
    await runInit({ dir: root, force: false, dryRun: false, yes: true });

    const expectedFiles = [
      path.join(root, ".qfai", "rules", "pnpm.md"),
      path.join(root, ".qfai", "prompts", "require-to-spec.md"),
      path.join(root, "require", "README.md"),
    ];

    for (const filePath of expectedFiles) {
      await expect(access(filePath)).resolves.toBeUndefined();
    }
  });
});
