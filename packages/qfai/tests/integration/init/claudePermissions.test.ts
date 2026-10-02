/**
 * Integration: init seeds the permission entries Claude Code needs to run the shipped skills and
 * the launcher without asking, through the merge that carries the hooks into a settings file the
 * project already has.
 */
// QFAI:AC-0001-0196-13
// QFAI:EX-0001-0196-46
// QFAI:EX-0001-0196-47
// QFAI:EX-0001-0196-48
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { initQuietly, withEmptyRepo } from "./upgradeStates.js";

// tests/integration/init/<this file> -> tests -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const SETTINGS = path.join(".claude", "settings.json");
// One launcher spelling for each way a project resolves its own qfai.
const LAUNCHER_ENTRIES = ["Bash(npx qfai:*)", "Bash(yarn exec qfai:*)", "Bash(yarn qfai:*)"];

/** The permission entries a settings file holds under `permissions.allow`. */
async function allowOf(root: string): Promise<unknown[]> {
  const parsed: unknown = JSON.parse(await readFile(path.join(root, SETTINGS), "utf-8"));
  const permissions: unknown =
    typeof parsed === "object" && parsed !== null ? Reflect.get(parsed, "permissions") : undefined;
  const allow: unknown =
    typeof permissions === "object" && permissions !== null
      ? Reflect.get(permissions, "allow")
      : undefined;
  if (!Array.isArray(allow)) throw new Error(`${SETTINGS} has no permissions.allow list`);
  return allow;
}

/** One `Skill(<name>)` entry for each skill the package ships, and the launcher entry. */
async function shippedEntries(): Promise<string[]> {
  const skills = await readdir(
    path.join(packageRoot, "assets", "init", ".qfai", "assistant", "skill"),
  );
  return [...skills.map((name) => `Skill(${name})`), ...LAUNCHER_ENTRIES];
}

describe("the permission entries of .claude/settings.json", () => {
  afterEach(() => {
    process.exitCode = undefined;
  });

  it("Fresh init allows every shipped skill by name, and the launcher", async () => {
    await withEmptyRepo(async (root) => {
      await initQuietly(root);
      const allow = await allowOf(root);
      expect([...allow].sort()).toEqual((await shippedEntries()).sort());
      expect(
        allow.some((entry) => String(entry).includes("*)") && String(entry).startsWith("Skill")),
      ).toBe(false);
    });
  });

  it("An existing file keeps its own entries and gains only the missing ones, once", async () => {
    await withEmptyRepo(async (root) => {
      await mkdir(path.join(root, ".claude"), { recursive: true });
      const own = {
        permissions: { allow: ["Bash(git status)", "Skill(qfai-run)"], deny: ["Bash(rm:*)"] },
        model: "sonnet",
      };
      await writeFile(path.join(root, SETTINGS), `${JSON.stringify(own, null, 2)}\n`, "utf-8");

      await initQuietly(root);
      const allow = await allowOf(root);
      expect(allow.slice(0, 2)).toEqual(["Bash(git status)", "Skill(qfai-run)"]);
      expect([...allow].sort()).toEqual(
        [...new Set(["Bash(git status)", ...(await shippedEntries())])].sort(),
      );
      const settings: unknown = JSON.parse(await readFile(path.join(root, SETTINGS), "utf-8"));
      expect(
        typeof settings === "object" && settings !== null ? Reflect.get(settings, "model") : null,
      ).toBe("sonnet");

      const first = await readFile(path.join(root, SETTINGS), "utf-8");
      await initQuietly(root);
      expect(await readFile(path.join(root, SETTINGS), "utf-8")).toBe(first);
    });
  });

  it("A permissions value init cannot read leaves the file unchanged, with a warning", async () => {
    await withEmptyRepo(async (root) => {
      await mkdir(path.join(root, ".claude"), { recursive: true });
      const text = `${JSON.stringify({ permissions: { allow: "Bash(git status)" } }, null, 2)}\n`;
      await writeFile(path.join(root, SETTINGS), text, "utf-8");

      const output = await initQuietly(root);
      expect(await readFile(path.join(root, SETTINGS), "utf-8")).toBe(text);
      expect(output).toContain(".claude/settings.json was left unchanged");
      expect(output).toContain("Make `permissions.allow` an array");
    });
  });
});
