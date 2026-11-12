import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../helpers/legacyInit.js";
import { runValidate } from "../../src/cli/commands/validate.js";
import { defaultConfig } from "../../src/core/config.js";
import { validateStoryPolicyPlaceholders } from "../../src/core/validators/assistantAssets.js";
import { captureStdout } from "../helpers/stdout.js";

async function withInit(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-fresh-story-"));
  try {
    await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function editObjective(root: string): Promise<void> {
  const objective = path.join(root, ".qfai", "spec", "01_policy", "objective.md");
  await writeFile(objective, `${await readFile(objective, "utf-8")}\nProject goal.\n`, "utf-8");
}

describe("fresh story seed validation", () => {
  it("has no unfilled policy error before project content exists", async () => {
    await withInit(async (root) => {
      expect(await validateStoryPolicyPlaceholders(root, defaultConfig)).toEqual([]);
      let exit = -1;
      await captureStdout(async () => {
        exit = await runValidate({ root, strict: false, failOn: "error" });
      });
      expect(exit).toBe(0);
    });
  });

  // QFAI:EX-0001-0038-10
  it("reads a clone that lost the empty contract directories as the same untouched seed", async () => {
    await withInit(async (root) => {
      // A clone has none of these: version control tracks no empty directory.
      for (const kind of ["api", "cli", "db", "ui"]) {
        await rm(path.join(root, ".qfai", "spec", "03_contract", kind), { recursive: true });
      }

      expect(await validateStoryPolicyPlaceholders(root, defaultConfig)).toEqual([]);
    });
  });

  // QFAI:EX-0001-0038-10
  it("still reads the seed as edited when a file changed and the empty directories are gone", async () => {
    await withInit(async (root) => {
      await editObjective(root);
      await rm(path.join(root, ".qfai", "spec", "03_contract", "api"), { recursive: true });

      expect(
        (await validateStoryPolicyPlaceholders(root, defaultConfig)).map((x) => x.code),
      ).toEqual(["QFAI-ASSETS-003"]);
    });
  });

  it("enforces the policy obligation after any seed content is edited", async () => {
    await withInit(async (root) => {
      await editObjective(root);

      expect(
        (await validateStoryPolicyPlaceholders(root, defaultConfig)).map((x) => x.code),
      ).toEqual(["QFAI-ASSETS-003"]);
    });
  });
});
