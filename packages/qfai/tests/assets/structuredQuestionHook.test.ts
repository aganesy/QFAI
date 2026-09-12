/**
 * The reminder that puts the question-form rule in front of the agent.
 *
 * It fires on `UserPromptSubmit` rather than once at session start, because the
 * moment a question forms is unpredictable and a session-start reminder is gone
 * by the time the context is compacted — which is when a long session starts
 * skipping the rule.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { STRUCTURED_QUESTION_HOOK_MARKER } from "../../src/core/claudeCodeHooks.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** This repository's own hooks, and the copy `qfai init` writes. */
const SETTINGS = [".claude/settings.json", "packages/qfai/assets/init/.claude/settings.json"];

type Hook = {
  readonly type: string;
  readonly command?: string;
  readonly args?: readonly string[];
  readonly statusMessage?: string;
  readonly if?: string;
};
type Group = { readonly matcher: string; readonly hooks: readonly Hook[] };
type Settings = { readonly hooks: Record<string, readonly Group[] | undefined> };

const readSettings = async (rel: string): Promise<Settings> =>
  JSON.parse(await readFile(path.join(repoRoot, rel), "utf-8"));

/** The one `UserPromptSubmit` group; absent is the failure to report. */
function promptGroup(settings: Settings): Group {
  const groups = settings.hooks.UserPromptSubmit ?? [];
  expect(groups, "no UserPromptSubmit reminder").toHaveLength(1);
  const group = groups[0];
  if (group === undefined) throw new Error("no UserPromptSubmit group");
  return group;
}

/** The payload the group's entries carry, as one string. */
const payloadOf = (group: Group): string =>
  group.hooks.map((hook) => (hook.args ?? []).join(" ")).join(" ");

describe("the structured-question reminder", () => {
  it.each(SETTINGS)("%s fires on every turn, not once", async (rel) => {
    // The moment a question forms is unpredictable, and a session-start
    // reminder is gone by the time the context is compacted — which is exactly
    // when a long session starts reaching for an exception.
    const settings = await readSettings(rel);
    const group = promptGroup(settings);
    expect(group.matcher).toBe("*");
    expect(group.hooks).toHaveLength(1);
    expect(group.hooks[0]?.statusMessage).toBe(STRUCTURED_QUESTION_HOOK_MARKER);
  });

  it.each(SETTINGS)("%s stays a reminder", async (rel) => {
    // Deciding whether a question should have been asked as a structured choice
    // needs intent, and a false positive on a hook that fires every turn stops
    // the session outright.
    const settings = await readSettings(rel);
    const payload = payloadOf(promptGroup(settings));
    expect(payload).toContain("additionalContext");
    expect(payload).not.toContain("permissionDecision");
  });

  it.each(SETTINGS)("%s runs node directly, with no shell", async (rel) => {
    // No shell, no file reads, no network, so a hook on every turn cannot
    // itself fail the session it is attached to.
    const settings = await readSettings(rel);
    for (const hook of promptGroup(settings).hooks) {
      expect(hook.type).toBe("command");
      expect(hook.command).toBe("node");
      expect(hook.args?.[0]).toBe("-e");
    }
  });

  it.each(SETTINGS)("%s points at the master and carries the obligation", async (rel) => {
    // Short, because its cost is paid every turn. What it must carry is where
    // the rule lives and the one line an agent reaches past when it would
    // rather not ask.
    const settings = await readSettings(rel);
    const payload = payloadOf(promptGroup(settings));
    expect(payload).toContain(".agents/rules/user-questions.md");
    expect(payload).toContain("No question is light enough to skip it");
    // The fallback, so a host without the tool is not read as an exemption.
    expect(payload).toContain("through that rule's fallback where it is not");
  });

  it.each([
    ".agents/rules/user-questions.md",
    "packages/qfai/assets/init/root/.agents/rules/user-questions.md",
  ])("%s says it has a reminder", async (rel) => {
    // A reader of the rule needs to know one fires, or a hook that stops firing
    // looks like a rule nobody wrote a reminder for. The writing-standard rule
    // documents its own the same way.
    const master = await readFile(path.join(repoRoot, rel), "utf-8");
    expect(master).toContain("## The reminder");
    expect(master).toContain("`UserPromptSubmit`");
    // The two properties a later editor would otherwise have to rediscover.
    expect(master).toMatch(/reminds and never blocks/i);
    expect(master).toMatch(/no shell, no file reads and no\s+network/);
  });

  it("both settings files carry it", async () => {
    // One is the other's source. A reminder here and not in the shipped copy
    // reaches nobody who installed QFAI.
    const [mine, shipped] = await Promise.all(SETTINGS.map(readSettings));
    if (mine === undefined || shipped === undefined) throw new Error("settings missing");
    expect(JSON.stringify(promptGroup(mine))).toBe(JSON.stringify(promptGroup(shipped)));
  });
});
