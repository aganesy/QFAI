/**
 * Integration: `qfai init` copies the step layer with the skills, `--force` refreshes it, and no
 * step is ever linked into a host's skill directory.
 */
import { lstat, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../../src/cli/commands/init.js";
import { SKILL_INTEGRATION_DIRS } from "../../../src/core/init/integrationDirs.js";
import { skillFrontmatterMapping } from "../../../src/core/agentFrontmatter.js";
import { loadConfig } from "../../../src/core/config.js";
import { validateStepTree } from "../../../src/core/validators/stepTree.js";
import { getInitAssetsDir } from "../../../src/shared/assets.js";
import { captureStdout } from "../../helpers/stdout.js";
import { removeTempTree } from "../../helpers/tempTree.js";

const SHIPPED_STEPS = path.join(getInitAssetsDir(), ".qfai", "assistant", "step");

async function shippedStepNames(): Promise<string[]> {
  const entries = await readdir(SHIPPED_STEPS, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

async function initQuietly(root: string, force = false): Promise<string> {
  return captureStdout(() => runInit({ dir: root, force, dryRun: false, yes: true }));
}

async function present(target: string): Promise<boolean> {
  try {
    await lstat(target);
    return true;
  } catch {
    return false;
  }
}

describe("qfai init distributes the step layer", () => {
  // QFAI:AC-0001-0196-08
  // QFAI:EX-0001-0196-21
  it("installs every shipped step and links none into a host skill directory", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-steps-"));
    try {
      await initQuietly(root);
      const steps = await shippedStepNames();
      expect(steps.length).toBeGreaterThan(0);
      for (const step of steps) {
        const installed = path.join(root, ".qfai", "assistant", "step", step, "STEP.md");
        expect(await readFile(installed, "utf-8")).toBe(
          await readFile(path.join(SHIPPED_STEPS, step, "STEP.md"), "utf-8"),
        );
        for (const hostDir of SKILL_INTEGRATION_DIRS) {
          expect(await present(path.join(root, hostDir, step)), `${hostDir}/${step}`).toBe(false);
        }
      }
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:EX-0001-0196-22
  it("keeps an edited step on a plain run and restores it under --force", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-steps-"));
    try {
      await initQuietly(root);
      const [step = ""] = await shippedStepNames();
      const installed = path.join(root, ".qfai", "assistant", "step", step, "STEP.md");
      const shipped = await readFile(installed, "utf-8");
      const edited = `${shipped}\nEdited by the project.\n`;
      await writeFile(installed, edited);

      await initQuietly(root);
      expect(await readFile(installed, "utf-8")).toBe(edited);

      await initQuietly(root, true);
      expect(await readFile(installed, "utf-8")).toBe(shipped);
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:AC-0001-0210-01
  // QFAI:EX-0001-0210-01
  it("leaves a fresh install with no step-tree finding", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-steps-"));
    try {
      await initQuietly(root);
      const { config } = await loadConfig(root);
      expect(await validateStepTree(root, config)).toEqual([]);
      const skills = path.join(root, ".qfai", "assistant", "skill");
      const parents: string[] = [];
      for (const skill of await readdir(skills)) {
        const doc = await readFile(path.join(skills, skill, "SKILL.md"), "utf-8").catch(() => "");
        const front = skillFrontmatterMapping(doc);
        if (!Array.isArray(front?.steps)) continue;
        parents.push(skill);
        expect(front?.requires, skill).toContain("common-review-cycle");
      }
      expect(parents.length).toBeGreaterThan(0);
    } finally {
      await removeTempTree(root);
    }
  });
});
