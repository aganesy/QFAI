import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import { captureStdout } from "../helpers/stdout.js";

const retiredName = "10_workflow.md";

async function exists(target: string): Promise<boolean> {
  return lstat(target).then(
    () => true,
    () => false,
  );
}

it("removes only retired workflow files from both assistant skill layouts on --force", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-force-"));
  try {
    await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

    const assistant = path.join(root, ".qfai", "assistant");
    const legacyDirectories = [
      path.join(assistant, "skill", "qfai-sdd"),
      path.join(assistant, "skill", "qfai-sdd"),
    ];
    for (const directory of legacyDirectories) {
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, retiredName), "# retired workflow\n");
      await writeFile(path.join(directory, `${retiredName}.notes`), "project note\n");
      await mkdir(path.join(directory, "project-notes"));
      await writeFile(path.join(directory, "project-notes", "keep.md"), "project directory\n");
    }
    const currentSkill = path.join(assistant, "skill", "qfai-sdd", "SKILL.md");
    const shippedSkill = path.join(
      getInitAssetsDir(),
      ".qfai",
      "assistant",
      "skill",
      "qfai-sdd",
      "SKILL.md",
    );
    expect(await exists(currentSkill)).toBe(true);

    await captureStdout(() => runInit({ dir: root, force: true, dryRun: false, yes: true }));

    // QFAI:AC-0001-0026-01
    // QFAI:EX-0001-0026-01
    for (const directory of legacyDirectories) {
      expect(await exists(path.join(directory, retiredName))).toBe(false);
      expect(await readFile(path.join(directory, `${retiredName}.notes`), "utf-8")).toBe(
        "project note\n",
      );
      expect(await readFile(path.join(directory, "project-notes", "keep.md"), "utf-8")).toBe(
        "project directory\n",
      );
    }
    expect(await readFile(currentSkill, "utf-8")).toBe(await readFile(shippedSkill, "utf-8"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
