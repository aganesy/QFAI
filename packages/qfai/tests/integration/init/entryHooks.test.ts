/**
 * Integration: init seeds the reminder hooks for Claude Code and Codex, merges them into a
 * hook file the project already has, and says once that Codex runs its hooks only once trusted.
 */
// QFAI:AC-0001-0196-11
// QFAI:AC-0001-0196-12
// QFAI:EX-0001-0196-26
// QFAI:EX-0001-0196-28
// QFAI:EX-0001-0196-29
// QFAI:EX-0001-0196-30
// QFAI:EX-0001-0196-31
// QFAI:EX-0001-0196-32
// QFAI:EX-0001-0196-34
// QFAI:EX-0001-0196-39
// QFAI:EX-0001-0196-42
import { lstat, mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import {
  FREE_TEXT_ENTRY_HOOK_MARKER,
  INSTALL_CHECK_HOOK_MARKER,
  STRUCTURED_QUESTION_HOOK_MARKER,
} from "../../../src/core/claudeCodeHooks.js";
import { initQuietly, withEmptyRepo } from "./upgradeStates.js";

// tests/integration/init/<this file> -> tests -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const CODEX = path.join(".codex", "hooks.json");
const CLAUDE = path.join(".claude", "settings.json");
const TRUST_LINE =
  "Codex runs the hooks in .codex/hooks.json only after you review and trust them with /hooks.";

function trustLines(output: string): string[] {
  return output.split("\n").filter((line) => line.includes("trust them with /hooks"));
}

async function seed(root: string, rel: string, content: unknown): Promise<void> {
  await mkdir(path.dirname(path.join(root, rel)), { recursive: true });
  const text = typeof content === "string" ? content : `${JSON.stringify(content, null, 2)}\n`;
  await writeFile(path.join(root, rel), text, "utf-8");
}

/** The status messages of each `UserPromptSubmit` group, in file order. */
async function promptMarkers(root: string, rel: string): Promise<unknown[][]> {
  const parsed: unknown = JSON.parse(await readFile(path.join(root, rel), "utf-8"));
  const hooks: unknown =
    typeof parsed === "object" && parsed !== null ? Reflect.get(parsed, "hooks") : undefined;
  const groups: unknown =
    typeof hooks === "object" && hooks !== null
      ? Reflect.get(hooks, "UserPromptSubmit")
      : undefined;
  if (!Array.isArray(groups)) throw new Error(`${rel} has no UserPromptSubmit groups`);
  return groups.map((group: unknown) => {
    const entries: unknown =
      typeof group === "object" && group !== null ? Reflect.get(group, "hooks") : undefined;
    if (!Array.isArray(entries)) return [];
    return entries.map((entry: unknown) =>
      typeof entry === "object" && entry !== null ? Reflect.get(entry, "statusMessage") : undefined,
    );
  });
}

/**
 * A structured-question group as a release wrote it into `.claude/settings.json`, standing for a
 * group copied across from the Claude Code settings into the Codex hook file.
 */
async function claudeStructuredQuestionGroup(): Promise<unknown> {
  const fixture: unknown = JSON.parse(
    await readFile(
      path.join(
        packageRoot,
        "tests",
        "fixtures",
        "claude-settings",
        "earlier-reminder-groups.json",
      ),
      "utf-8",
    ),
  );
  const hooks: unknown =
    typeof fixture === "object" && fixture !== null ? Reflect.get(fixture, "hooks") : undefined;
  const groups: unknown =
    typeof hooks === "object" && hooks !== null
      ? Reflect.get(hooks, "UserPromptSubmit")
      : undefined;
  if (!Array.isArray(groups) || groups.length === 0) throw new Error("fixture has no prompt group");
  return groups[0];
}

describe("the prompt-time reminder hooks", () => {
  afterEach(() => {
    process.exitCode = undefined;
  });

  it("Fresh init writes both hook files and says once how Codex runs them", async () => {
    await withEmptyRepo(async (root) => {
      const output = await initQuietly(root);

      expect(await readFile(path.join(root, CODEX), "utf-8")).toBe(
        await readFile(path.join(packageRoot, "assets", "init", CODEX), "utf-8"),
      );
      expect(await promptMarkers(root, CODEX)).toEqual([
        [STRUCTURED_QUESTION_HOOK_MARKER],
        [FREE_TEXT_ENTRY_HOOK_MARKER],
        [INSTALL_CHECK_HOOK_MARKER],
      ]);
      expect(await promptMarkers(root, CLAUDE)).toContainEqual([FREE_TEXT_ENTRY_HOOK_MARKER]);
      for (const rel of [CODEX, CLAUDE]) {
        expect(await readFile(path.join(root, rel), "utf-8")).not.toContain("additionalContext");
      }
      expect(trustLines(output)).toEqual([TRUST_LINE]);
    });
  });

  it("Existing hook files gain the groups they lack, once", async () => {
    await withEmptyRepo(async (root) => {
      const shipped: unknown = JSON.parse(
        await readFile(path.join(packageRoot, "assets", "init", CLAUDE), "utf-8"),
      );
      const shippedHooks: unknown =
        typeof shipped === "object" && shipped !== null ? Reflect.get(shipped, "hooks") : undefined;
      const prompt: unknown =
        typeof shippedHooks === "object" && shippedHooks !== null
          ? Reflect.get(shippedHooks, "UserPromptSubmit")
          : undefined;
      if (!Array.isArray(prompt)) throw new Error("the shipped settings have no prompt groups");
      await seed(root, CLAUDE, {
        hooks: {
          UserPromptSubmit: prompt.filter((group) =>
            JSON.stringify(group).includes(STRUCTURED_QUESTION_HOOK_MARKER),
          ),
        },
      });
      const own = { hooks: [{ type: "command", command: "./own-hook.sh" }] };
      await seed(root, CODEX, { model: "kept", hooks: { UserPromptSubmit: [own] } });

      const first = await initQuietly(root);

      expect(await promptMarkers(root, CLAUDE)).toEqual([
        [STRUCTURED_QUESTION_HOOK_MARKER],
        [FREE_TEXT_ENTRY_HOOK_MARKER],
        [INSTALL_CHECK_HOOK_MARKER],
      ]);
      const codex: unknown = JSON.parse(await readFile(path.join(root, CODEX), "utf-8"));
      expect(codex).toMatchObject({ model: "kept" });
      // The project's own group carries no status message.
      expect(await promptMarkers(root, CODEX)).toEqual([
        [undefined],
        [STRUCTURED_QUESTION_HOOK_MARKER],
        [FREE_TEXT_ENTRY_HOOK_MARKER],
        [INSTALL_CHECK_HOOK_MARKER],
      ]);
      expect(trustLines(first)).toEqual([TRUST_LINE]);

      const before = await Promise.all(
        [CLAUDE, CODEX].map((rel) => readFile(path.join(root, rel))),
      );
      const second = await initQuietly(root);
      const after = await Promise.all([CLAUDE, CODEX].map((rel) => readFile(path.join(root, rel))));
      expect(after).toEqual(before);
      expect(trustLines(second)).toEqual([]);
    });
  });

  it("A Codex file with only the prompt-time groups gains the tool-time ones, once", async () => {
    await withEmptyRepo(async (root) => {
      const templateText = await readFile(path.join(packageRoot, "assets", "init", CODEX), "utf-8");
      const template: unknown = JSON.parse(templateText);
      const hooks: unknown =
        typeof template === "object" && template !== null
          ? Reflect.get(template, "hooks")
          : undefined;
      const prompt: unknown =
        typeof hooks === "object" && hooks !== null
          ? Reflect.get(hooks, "UserPromptSubmit")
          : undefined;
      if (!Array.isArray(prompt)) throw new Error("the shipped Codex file has no prompt groups");
      await seed(root, CODEX, { hooks: { UserPromptSubmit: prompt } });

      const first = await initQuietly(root);

      expect(await readFile(path.join(root, CODEX), "utf-8")).toBe(templateText);
      expect(trustLines(first)).toEqual([TRUST_LINE]);

      const second = await initQuietly(root);

      expect(await readFile(path.join(root, CODEX), "utf-8")).toBe(templateText);
      expect(trustLines(second)).toEqual([]);
    });
  });

  it("A Codex file an earlier release wrote is brought to this release's, once", async () => {
    await withEmptyRepo(async (root) => {
      const templateText = await readFile(path.join(packageRoot, "assets", "init", CODEX), "utf-8");
      await seed(
        root,
        CODEX,
        await readFile(
          path.join(packageRoot, "tests", "fixtures", "codex-hooks", "earlier-hooks.json"),
          "utf-8",
        ),
      );
      expect(await readFile(path.join(root, CODEX), "utf-8")).toContain("commandWindows");

      const first = await initQuietly(root);

      expect(await readFile(path.join(root, CODEX), "utf-8")).toBe(templateText);
      expect(first).not.toContain("(edited here)");
      expect(trustLines(first)).toEqual([TRUST_LINE]);

      const second = await initQuietly(root);

      expect(await readFile(path.join(root, CODEX), "utf-8")).toBe(templateText);
      expect(trustLines(second)).toEqual([]);
    });
  });

  it("An edited Codex group is kept and named; one copied from Claude Code is replaced", async () => {
    await withEmptyRepo(async (root) => {
      const edited = {
        hooks: [
          {
            type: "command",
            statusMessage: FREE_TEXT_ENTRY_HOOK_MARKER,
            command: "node ./our-own-entry-reminder.js",
          },
        ],
      };
      await seed(root, CODEX, { hooks: { UserPromptSubmit: [edited] } });

      for (let run = 0; run < 2; run += 1) {
        const output = await initQuietly(root);
        const codex: unknown = JSON.parse(await readFile(path.join(root, CODEX), "utf-8"));
        expect(JSON.stringify(codex)).toContain("our-own-entry-reminder");
        expect(output).toContain(
          `kept: .codex/hooks.json hook group UserPromptSubmit "${FREE_TEXT_ENTRY_HOOK_MARKER}" (edited here)`,
        );
      }
    });

    await withEmptyRepo(async (root) => {
      await seed(root, CODEX, {
        hooks: { UserPromptSubmit: [await claudeStructuredQuestionGroup()] },
      });

      const output = await initQuietly(root);

      expect(await readFile(path.join(root, CODEX), "utf-8")).toBe(
        await readFile(path.join(packageRoot, "assets", "init", CODEX), "utf-8"),
      );
      expect(output).not.toContain("(edited here)");
    });
  });

  it("A Codex hook file init cannot read is left unchanged, with a warning", async () => {
    for (const damaged of ["{ not json\n", '{ "hooks": { "UserPromptSubmit": {} } }\n']) {
      await withEmptyRepo(async (root) => {
        await seed(root, CODEX, damaged);

        const output = await initQuietly(root);

        expect(await readFile(path.join(root, CODEX), "utf-8")).toBe(damaged);
        expect(output).toContain("WARNING: .codex/hooks.json was left unchanged");
        expect(trustLines(output)).toEqual([]);
        // The run went on past it.
        await expect(readFile(path.join(root, "AGENTS.md"), "utf-8")).resolves.toContain(
          "Cross-AI rules",
        );
      });
    }
  });

  it("A hook file reached through a symbolic link is neither read nor written", async (ctx) => {
    // A checked-in `.codex -> ~/.codex` would otherwise have init rewrite the user's own hook
    // file, and a dangling `hooks.json` link would have it create one wherever the link points.
    const outside = await mkdtemp(path.join(os.tmpdir(), "qfai-hooks-outside-"));
    try {
      await withEmptyRepo(async (root) => {
        try {
          await symlink(outside, path.join(root, ".codex"), "dir");
        } catch {
          // Symbolic links need Developer Mode or elevation on Windows.
          ctx.skip();
        }

        const output = await initQuietly(root);

        expect((await lstat(path.join(root, ".codex"))).isSymbolicLink()).toBe(true);
        expect(await readdir(outside)).not.toContain("hooks.json");
        expect(output).toContain("WARNING: .codex/hooks.json was left unchanged");
        expect(trustLines(output)).toEqual([]);
        await expect(readFile(path.join(root, "AGENTS.md"), "utf-8")).resolves.toContain(
          "Cross-AI rules",
        );
      });

      await withEmptyRepo(async (root) => {
        await mkdir(path.join(root, ".codex"), { recursive: true });
        await symlink(path.join(outside, "missing.json"), path.join(root, CODEX), "file");

        const output = await initQuietly(root);

        expect((await lstat(path.join(root, CODEX))).isSymbolicLink()).toBe(true);
        expect(await readdir(outside)).not.toContain("missing.json");
        expect(output).toContain("WARNING: .codex/hooks.json was left unchanged");
        expect(trustLines(output)).toEqual([]);
      });
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });

  it("A linked `.claude` gets no settings file at its target", async (ctx) => {
    const outside = await mkdtemp(path.join(os.tmpdir(), "qfai-claude-outside-"));
    try {
      await withEmptyRepo(async (root) => {
        try {
          await symlink(
            outside,
            path.join(root, ".claude"),
            process.platform === "win32" ? "junction" : "dir",
          );
        } catch {
          ctx.skip();
        }

        const output = await initQuietly(root);

        // Nothing at all: not the settings file, and not the skill or agent links either.
        expect(await readdir(outside)).toEqual([]);
        expect(output).toContain("WARNING: .claude/settings.json was left unchanged");
        await expect(readFile(path.join(root, "AGENTS.md"), "utf-8")).resolves.toContain(
          "Cross-AI rules",
        );
      });
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });

  it("A dry run writes no hook file and prints no trust line", async () => {
    await withEmptyRepo(async (root) => {
      const output = await initQuietly(root, false, true, true);

      await expect(lstat(path.join(root, CODEX))).rejects.toThrow();
      expect(trustLines(output)).toEqual([]);
    });
  });
});
