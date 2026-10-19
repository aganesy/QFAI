/**
 * Integration: init prints one line asking the user to restart a running agent session when it
 * wrote a skill or hook file, and nothing when it wrote none.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { initQuietly, SKILLS, withEmptyRepo } from "./upgradeStates.js";

const RESTART_LINE =
  "Skill or hook files changed: restart any running agent session, or invoke the skill again, so it uses the new text.";

const SKILL_FILE = path.join(SKILLS, "qfai-run", "SKILL.md");

function restartLines(output: string): string[] {
  return output.split("\n").filter((line) => line.includes("restart any running agent session"));
}

describe("the agent restart note", () => {
  afterEach(() => {
    process.exitCode = undefined;
  });

  it("is printed once by a first init, which writes the skills and hooks", async () => {
    await withEmptyRepo(async (root) => {
      expect(restartLines(await initQuietly(root))).toEqual([RESTART_LINE]);
    });
  });

  it("is printed by --force when it rewrites an edited skill file", async () => {
    await withEmptyRepo(async (root) => {
      await initQuietly(root);
      const skill = path.join(root, SKILL_FILE);
      const shipped = await readFile(skill, "utf-8");
      await writeFile(skill, `${shipped}\nA local edit.\n`, "utf-8");

      const output = await initQuietly(root, true);

      expect(await readFile(skill, "utf-8")).toBe(shipped);
      expect(restartLines(output)).toEqual([RESTART_LINE]);
    });
  });

  it("is printed when a hook file is written again", async () => {
    await withEmptyRepo(async (root) => {
      await initQuietly(root);
      await writeFile(path.join(root, ".codex", "hooks.json"), "{}\n", "utf-8");

      expect(restartLines(await initQuietly(root))).toEqual([RESTART_LINE]);
    });
  });

  it("is not printed when no skill or hook file changed, with or without --force", async () => {
    await withEmptyRepo(async (root) => {
      await initQuietly(root);

      expect(restartLines(await initQuietly(root))).toEqual([]);
      expect(restartLines(await initQuietly(root, true))).toEqual([]);
    });
  });

  it("is not printed by a dry run", async () => {
    await withEmptyRepo(async (root) => {
      expect(restartLines(await initQuietly(root, false, true, true))).toEqual([]);
    });
  });
});
