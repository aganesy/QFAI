import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { runValidate } from "../../src/cli/commands/validate.js";
import { defaultConfig } from "../../src/core/config.js";
import { validateStorySteeringPlaceholders } from "../../src/core/validators/assistantAssets.js";
import { validateDiscussionPackReadiness } from "../../src/core/validators/discussionPack.js";
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

describe("fresh story seed validation", () => {
  it("has no unfilled steering or missing discussion error before project content exists", async () => {
    await withInit(async (root) => {
      expect(await validateStorySteeringPlaceholders(root, defaultConfig)).toEqual([]);
      expect(
        (await validateDiscussionPackReadiness(root, defaultConfig)).filter(
          (found) => found.severity === "error",
        ),
      ).toEqual([]);
      let exit = -1;
      await captureStdout(async () => {
        exit = await runValidate({ root, strict: false, failOn: "error" });
      });
      expect(exit).toBe(0);
    });
  });

  it("enforces both obligations after any seed content is edited", async () => {
    await withInit(async (root) => {
      const objective = path.join(root, ".qfai", "spec", "01_policy", "objective.md");
      await writeFile(objective, `${await readFile(objective, "utf-8")}\nProject goal.\n`, "utf-8");

      expect(
        (await validateStorySteeringPlaceholders(root, defaultConfig)).map((x) => x.code),
      ).toEqual(["QFAI-ASSETS-003", "QFAI-ASSETS-003"]);
      expect(
        (await validateDiscussionPackReadiness(root, defaultConfig)).map((x) => x.code),
      ).toContain("QFAI-DPACK-001");
    });
  });
});
