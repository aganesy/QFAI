/**
 * Integration: init prints one line asking the user to restart a running agent session when it
 * wrote a file an agent loads at session start (a skill, step, agent or rule file, a Codex agent
 * profile, a rule master, an agent entry point or a hook file), and nothing when it wrote none.
 */
// QFAI:AC-0001-0196-19
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { initQuietly, SKILLS, withEmptyRepo } from "./upgradeStates.js";

const RESTART_LINE =
  "Agent instruction files changed: restart any running agent session so it uses the new text.";

const SKILL_FILE = path.join(SKILLS, "qfai-run", "SKILL.md");

function restartLines(output: string): string[] {
  return output.split("\n").filter((line) => line.includes("restart any running agent session"));
}

describe("the agent restart note", () => {
  afterEach(() => {
    process.exitCode = undefined;
  });

  // QFAI:EX-0001-0196-71
  it("is printed once by a first init, which writes the skills and hooks", async () => {
    await withEmptyRepo(async (root) => {
      expect(restartLines(await initQuietly(root))).toEqual([RESTART_LINE]);
    });
  });

  // QFAI:EX-0001-0196-72
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

  // QFAI:EX-0001-0196-72
  it.each([
    [".codex", "hooks.json"],
    [".claude", "settings.json"],
  ])("is printed when the hook file %s/%s is written again", async (dir, file) => {
    await withEmptyRepo(async (root) => {
      await initQuietly(root);
      const hookFile = path.join(root, dir, file);
      const written = await readFile(hookFile, "utf-8");
      await writeFile(hookFile, "{}\n", "utf-8");

      const output = await initQuietly(root);

      expect(await readFile(hookFile, "utf-8")).toBe(written);
      expect(restartLines(output)).toEqual([RESTART_LINE]);
    });
  });

  // QFAI:EX-0001-0196-72
  it("is printed by --force when it regenerates an edited Codex agent profile", async () => {
    await withEmptyRepo(async (root) => {
      await initQuietly(root);
      const profileDir = path.join(root, ".codex", "agents");
      const [name] = (await readdir(profileDir)).filter((entry) => entry.endsWith(".toml"));
      expect(name).toBeDefined();
      const profile = path.join(profileDir, name ?? "");
      const generated = await readFile(profile, "utf-8");
      await writeFile(profile, `${generated}\n# A local edit.\n`, "utf-8");

      const output = await initQuietly(root, true);

      expect(await readFile(profile, "utf-8")).toBe(generated);
      expect(restartLines(output)).toEqual([RESTART_LINE]);
    });
  });

  // QFAI:EX-0001-0196-72
  it("is printed by --force when it overwrites an edited rule master", async () => {
    await withEmptyRepo(async (root) => {
      await initQuietly(root);
      const rule = path.join(root, ".agents", "rules", "grilling.md");
      const shipped = await readFile(rule, "utf-8");
      await writeFile(rule, `${shipped}\nA local edit.\n`, "utf-8");

      const output = await initQuietly(root, true);

      expect(await readFile(rule, "utf-8")).toBe(shipped);
      expect(restartLines(output)).toEqual([RESTART_LINE]);
    });
  });

  // QFAI:EX-0001-0196-76
  it("is printed by a plain init that creates a missing rule master", async () => {
    await withEmptyRepo(async (root) => {
      await initQuietly(root);
      const rule = path.join(root, ".agents", "rules", "grilling.md");
      const shipped = await readFile(rule, "utf-8");
      await rm(rule);

      const output = await initQuietly(root);

      expect(await readFile(rule, "utf-8")).toBe(shipped);
      expect(restartLines(output)).toEqual([RESTART_LINE]);
    });
  });

  // QFAI:EX-0001-0196-76
  it("is printed by a plain init that adds the rules section to AGENTS.md", async () => {
    await withEmptyRepo(async (root) => {
      await initQuietly(root);
      const entryPoint = path.join(root, "AGENTS.md");
      await writeFile(entryPoint, "# Project\n", "utf-8");

      const output = await initQuietly(root);

      expect(await readFile(entryPoint, "utf-8")).toContain(".agents/rules/");
      expect(restartLines(output)).toEqual([RESTART_LINE]);
    });
  });

  // QFAI:EX-0001-0196-76
  it("is printed by a plain init that adds a missing rule's bullet to the Copilot instructions", async () => {
    await withEmptyRepo(async (root) => {
      await initQuietly(root);
      const instructions = path.join(root, ".github", "copilot-instructions.md");
      const bullet = "- `.agents/rules/grilling.md`";
      const written = await readFile(instructions, "utf-8");
      const withoutBullet = written
        .split("\n")
        .filter((line) => !line.startsWith(bullet))
        .join("\n");
      expect(withoutBullet).not.toBe(written);
      await writeFile(instructions, withoutBullet, "utf-8");
      await rm(path.join(root, ".agents", "rules", "grilling.md"));

      const output = await initQuietly(root);

      expect(await readFile(instructions, "utf-8")).toContain(bullet);
      expect(restartLines(output)).toEqual([RESTART_LINE]);
    });
  });

  // QFAI:EX-0001-0196-72
  it("is printed by --force when it rewrites edited Copilot instructions", async () => {
    await withEmptyRepo(async (root) => {
      await initQuietly(root);
      const instructions = path.join(root, ".github", "copilot-instructions.md");
      const generated = await readFile(instructions, "utf-8");
      await writeFile(instructions, `${generated}\nA local edit.\n`, "utf-8");

      const output = await initQuietly(root, true);

      expect(await readFile(instructions, "utf-8")).toBe(generated);
      expect(restartLines(output)).toEqual([RESTART_LINE]);
    });
  });

  // QFAI:EX-0001-0196-73
  it("is not printed when no skill or hook file changed, with or without --force", async () => {
    await withEmptyRepo(async (root) => {
      await initQuietly(root);

      expect(restartLines(await initQuietly(root))).toEqual([]);
      expect(restartLines(await initQuietly(root, true))).toEqual([]);
    });
  });

  // QFAI:EX-0001-0196-73
  it("is not printed by a dry run", async () => {
    await withEmptyRepo(async (root) => {
      expect(restartLines(await initQuietly(root, false, true, true))).toEqual([]);
    });
  });
});
