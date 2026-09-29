// QFAI:EX-0001-0196-26
// QFAI:EX-0001-0196-27
// QFAI:EX-0001-0196-41
/**
 * The prompt-time reminder that sends a request naming no skill to `qfai-run`,
 * for Claude Code and for Codex.
 *
 * Codex takes one command string rather than a program and its arguments, runs
 * it through whatever shell the session uses, and runs it from the session's
 * directory, which may be below the project root. So each entry's program finds
 * the message file itself, looking upward from where it runs, and is run here
 * through every shell this platform has from a subdirectory, from a project
 * below its git root, and from outside any repository.
 */

import { copyFile, mkdir, mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  FREE_TEXT_ENTRY_HOOK_MARKER,
  STRUCTURED_QUESTION_HOOK_MARKER,
} from "../../src/core/claudeCodeHooks.js";
import { projectDirOf, runReminderHook } from "../helpers/reminderHooks.js";
import { runOnEveryShell } from "../helpers/codexHookShells.js";
import { EXIT_ZERO, spawnCaptured } from "../helpers/spawnCaptured.js";
import { removeTempTree } from "../helpers/tempTree.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const SHIPPED_MESSAGES = "packages/qfai/assets/init/root/.agents/rules/reminders.json";

/** This repository's own Claude Code hooks, and the copy `qfai init` writes. */
const OWN_SETTINGS = ".claude/settings.json";
const SHIPPED_SETTINGS = "packages/qfai/assets/init/.claude/settings.json";

/** The Codex hook file `qfai init` writes, and this repository's own copy. */
const SHIPPED_CODEX = "packages/qfai/assets/init/.codex/hooks.json";
const OWN_CODEX = ".codex/hooks.json";

type Entry = Record<string, unknown>;
type Group = { readonly hooks: readonly Entry[] };

function asRecord(value: unknown, what: string): Entry {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${what} is not an object`);
  }
  return { ...value };
}

/** The groups under each event, rejecting a shape the tests below do not cover. */
async function readGroups(rel: string): Promise<Map<string, Group[]>> {
  const parsed: unknown = JSON.parse(await readFile(path.join(repoRoot, rel), "utf-8"));
  const hooks = asRecord(asRecord(parsed, rel).hooks, `${rel}: hooks`);
  const byEvent = new Map<string, Group[]>();
  for (const [event, groups] of Object.entries(hooks)) {
    if (!Array.isArray(groups)) throw new Error(`${rel}: ${event} is not an array`);
    byEvent.set(
      event,
      groups.map((group: unknown) => {
        const entries = asRecord(group, `${rel}: a ${event} group`).hooks;
        if (!Array.isArray(entries)) throw new Error(`${rel}: a ${event} group has no entries`);
        return { hooks: entries.map((entry: unknown) => asRecord(entry, `${rel}: an entry`)) };
      }),
    );
  }
  return byEvent;
}

/** The one entry under `UserPromptSubmit` that carries `marker`. */
function promptEntry(groups: Map<string, Group[]>, marker: string): Entry {
  const entries = (groups.get("UserPromptSubmit") ?? [])
    .flatMap((group) => group.hooks)
    .filter((entry) => entry.statusMessage === marker);
  expect(entries, `no ${marker}`).toHaveLength(1);
  const entry = entries[0];
  if (entry === undefined) throw new Error(`no ${marker}`);
  return entry;
}

function commandOf(entry: Entry): string {
  const command = entry.command;
  if (typeof command !== "string") throw new Error("entry has no command string");
  return command;
}

function argsOf(entry: Entry): string[] {
  const args = entry.args;
  if (!Array.isArray(args)) throw new Error("entry has no args");
  return args.map(String);
}

/** The `additionalContext` of a printed envelope. */
function contextOf(stdout: string): string {
  const payload: unknown = JSON.parse(stdout);
  const output = asRecord(asRecord(payload, "the output").hookSpecificOutput, "hookSpecificOutput");
  expect(output.hookEventName).toBe("UserPromptSubmit");
  const context = output.additionalContext;
  if (typeof context !== "string") throw new Error("no additionalContext");
  return context;
}

/** What the entry's line prints when each shell runs it in `cwd`, which must exit 0. */
async function runThroughShell(entry: Entry, cwd: string): Promise<string> {
  const outputs: string[] = [];
  for (const { shell, result } of await runOnEveryShell(entry, cwd, "{}")) {
    expect(result.outcome, `${shell}: ${result.stderr}`).toBe(EXIT_ZERO);
    expect(result.stderr, shell).toBe("");
    outputs.push(result.stdout);
  }
  // Each shell's line prints the same thing, so one answer stands for all of them.
  expect(new Set(outputs).size).toBe(1);
  return outputs[0] ?? "";
}

describe("the free-text entry reminder", () => {
  it.each([OWN_SETTINGS, SHIPPED_SETTINGS])(
    "%s fires on every prompt and names qfai-run",
    async (rel) => {
      const entry = promptEntry(await readGroups(rel), FREE_TEXT_ENTRY_HOOK_MARKER);
      expect(entry.command).toBe("node");
      const args = argsOf(entry);
      expect(args.slice(2)).toEqual([
        "${CLAUDE_PROJECT_DIR}/.agents/rules/reminders.json",
        "free-text-entry",
      ]);
      // Both run against the shipped message file. This repository's own copy is a link to it,
      // and a Windows checkout without symbolic links holds that link as a text file.
      const project = projectDirOf(repoRoot, SHIPPED_SETTINGS);
      const stdout = await runReminderHook({ command: "node", args }, project);
      const context = contextOf(stdout);
      expect(context).toContain("names no skill, invoke the `qfai-run` skill");
      expect(context).toContain("A message that names a skill goes to that skill.");
      expect(context).toContain("Read the skill rather than working from this line.");
      expect(context.length).toBeLessThan(1000);
    },
  );

  it("is the same group in both Claude Code settings files", async () => {
    const [mine, shipped] = await Promise.all([OWN_SETTINGS, SHIPPED_SETTINGS].map(readGroups));
    if (mine === undefined || shipped === undefined) throw new Error("settings missing");
    expect(promptEntry(mine, FREE_TEXT_ENTRY_HOOK_MARKER)).toEqual(
      promptEntry(shipped, FREE_TEXT_ENTRY_HOOK_MARKER),
    );
  });
});

describe("the Codex hook file", () => {
  it("is the same in the shipped template and this repository", async () => {
    const [shipped, own] = await Promise.all(
      [SHIPPED_CODEX, OWN_CODEX].map((rel) => readFile(path.join(repoRoot, rel), "utf-8")),
    );
    expect(own).toBe(shipped);
  });

  it("carries the two prompt-time reminders", async () => {
    const groups = await readGroups(SHIPPED_CODEX);
    expect([...groups.keys()]).toEqual(["UserPromptSubmit", "PreToolUse", "PostToolUse"]);
    const markers = (groups.get("UserPromptSubmit") ?? []).map((group) =>
      group.hooks.map((entry) => entry.statusMessage),
    );
    expect(markers).toEqual([[STRUCTURED_QUESTION_HOOK_MARKER], [FREE_TEXT_ENTRY_HOOK_MARKER]]);
  });

  it("runs one command string naming a message key, with a short timeout", async () => {
    const messages = asRecord(
      JSON.parse(await readFile(path.join(repoRoot, SHIPPED_MESSAGES), "utf-8")),
      "the message table",
    );
    const groups = await readGroups(SHIPPED_CODEX);
    for (const entry of (groups.get("UserPromptSubmit") ?? []).flatMap((group) => group.hooks)) {
      expect(entry.type).toBe("command");
      expect(entry.args).toBeUndefined();
      expect(entry.commandWindows).toBeUndefined();
      const command = commandOf(entry);
      const match = /^node -e "[^"]*" ([a-z-]+)$/.exec(command);
      expect(match, command).not.toBeNull();
      expect(Object.keys(messages)).toContain(match?.[1]);
      expect(command).not.toContain("additionalContext");
      expect(entry.timeout).toBeGreaterThan(0);
      expect(entry.timeout).toBeLessThanOrEqual(30);
    }
  });

  it("finds the message from a subdirectory, and prints nothing outside a repository", async () => {
    const project = await mkdtemp(path.join(os.tmpdir(), "qfai-codex-hooks-"));
    const outside = await mkdtemp(path.join(os.tmpdir(), "qfai-codex-outside-"));
    try {
      const init = await spawnCaptured("git", ["init", "-q"], { cwd: project });
      expect(init.outcome, init.stderr).toBe(EXIT_ZERO);
      await mkdir(path.join(project, ".agents", "rules"), { recursive: true });
      await copyFile(
        path.join(repoRoot, SHIPPED_MESSAGES),
        path.join(project, ".agents", "rules", "reminders.json"),
      );
      const subdirectory = path.join(project, "src", "deep");
      await mkdir(subdirectory, { recursive: true });

      const groups = await readGroups(SHIPPED_CODEX);
      const free = promptEntry(groups, FREE_TEXT_ENTRY_HOOK_MARKER);
      expect(contextOf(await runThroughShell(free, subdirectory))).toContain("`qfai-run`");
      const question = promptEntry(groups, STRUCTURED_QUESTION_HOOK_MARKER);
      expect(contextOf(await runThroughShell(question, subdirectory))).toContain(
        ".agents/rules/user-questions.md",
      );

      for (const entry of [free, question]) {
        expect(await runThroughShell(entry, outside)).toBe("");
      }
    } finally {
      await removeTempTree(project);
      await removeTempTree(outside);
    }
  });

  it("finds a project's own message below its git root, and none above that root", async () => {
    // A name with a space, `&` and parentheses, which each shell would split or run unquoted.
    const base = await mkdtemp(path.join(os.tmpdir(), "qfai codex & (x) "));
    try {
      const seedMessages = async (dir: string): Promise<void> => {
        await mkdir(path.join(dir, ".agents", "rules"), { recursive: true });
        await copyFile(
          path.join(repoRoot, SHIPPED_MESSAGES),
          path.join(dir, ".agents", "rules", "reminders.json"),
        );
      };
      const gitInit = async (dir: string): Promise<void> => {
        await mkdir(dir, { recursive: true });
        const init = await spawnCaptured("git", ["init", "-q"], { cwd: dir });
        expect(init.outcome, init.stderr).toBe(EXIT_ZERO);
      };
      // The project, and the message file init wrote into it, sit below the git root.
      const monorepo = path.join(base, "monorepo");
      await gitInit(monorepo);
      const project = path.join(monorepo, "packages", "app");
      await seedMessages(project);
      const inside = path.join(project, "src");
      await mkdir(inside, { recursive: true });
      const sibling = path.join(monorepo, "packages", "other");
      await mkdir(sibling, { recursive: true });
      // A repository whose parent directory holds a message file it does not own.
      await seedMessages(base);
      const nested = path.join(base, "nested");
      await gitInit(nested);

      const groups = await readGroups(SHIPPED_CODEX);
      const free = promptEntry(groups, FREE_TEXT_ENTRY_HOOK_MARKER);
      for (const cwd of [project, inside]) {
        expect(contextOf(await runThroughShell(free, cwd))).toContain("`qfai-run`");
      }
      for (const entry of (groups.get("UserPromptSubmit") ?? []).flatMap((group) => group.hooks)) {
        expect(await runThroughShell(entry, sibling)).toBe("");
        expect(await runThroughShell(entry, nested)).toBe("");
      }
    } finally {
      await removeTempTree(base);
    }
  });
});
