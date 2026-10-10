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
import { projectDirOf, runReminderHook } from "../helpers/reminderHooks.js";
import { flat, sectionOf } from "../helpers/shippedAssistant.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** This repository's own hooks, and the copy `qfai init` writes. */
const SETTINGS = [".claude/settings.json", "packages/qfai/assets/init/.claude/settings.json"];
const QUESTION_RULES = [
  ".agents/rules/user-questions.md",
  "packages/qfai/assets/init/root/.agents/rules/user-questions.md",
];

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

/**
 * The `UserPromptSubmit` group carrying this reminder's marker; absent is the
 * failure to report. Found by marker, because another prompt-time reminder
 * shares the event.
 */
function promptGroup(settings: Settings): Group {
  const groups = (settings.hooks.UserPromptSubmit ?? []).filter((candidate) =>
    candidate.hooks.some((hook) => hook.statusMessage === STRUCTURED_QUESTION_HOOK_MARKER),
  );
  expect(groups, "no structured-question reminder").toHaveLength(1);
  const group = groups[0];
  if (group === undefined) throw new Error("no structured-question group");
  return group;
}

/** What the group's entries print, run against the project the settings file serves. */
async function payloadOf(rel: string, group: Group): Promise<string> {
  const outputs = await Promise.all(
    group.hooks.map((hook) => runReminderHook(hook, projectDirOf(repoRoot, rel))),
  );
  return outputs.join(" ");
}

function expectPendingOperationException(instruction: string): void {
  const text = flat(instruction);
  expect(text).toMatch(/\bonly (?:when|if|while|for)\b/i);
  expect(text).toMatch(/\b(?:ongoing|active|waiting|in[ -]progress)\b.*\bstep\b/i);
  expect(text).toMatch(/\b(?:already|previously) requested\b.*\bexternal operation\b/i);
  expect(text).toMatch(/\b(?:pending|waiting|awaiting)\b.*\bresult\b|\bresult\b.*\bpending\b/i);
  expect(text).toMatch(/\bno new (?:decision|choice)\b.*\bmissing (?:information|facts)\b/i);
  expect(text).toMatch(/\b(?:report|state|give)\b.*\bexpected result\b.*\bresume condition\b/i);
  expect(text).toMatch(
    /\b(?:no|without) (?:a )?(?:duplicate|another|repeated) question\b|\bdo not repeat\b.*\bquestion\b/i,
  );
  expect(text).toMatch(/\bcompleted route\b.*\bfinal report\b.*\bquestion\b/i);
  expect(text).toMatch(/\b(?:new|missing) (?:facts|information)\b/i);
  expect(text).toMatch(/\b(?:choices?|decisions?)\b/i);
  expect(text).toMatch(/\b(?:permission|approval)\b/i);
  expect(text).toMatch(
    /\b(?:new|missing)\b.*\b(?:permission|approval)\b.*\b(?:existing|normal|usual) question rules\b/i,
  );
}

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
    const payload = await payloadOf(rel, promptGroup(settings));
    expect(payload).toContain("additionalContext");
    expect(payload).not.toContain("permissionDecision");
  });

  it.each(SETTINGS)("%s runs node directly, with no shell", async (rel) => {
    // No shell and no network, and a missing message prints nothing, so a hook
    // on every turn cannot itself fail the session it is attached to.
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
    const payload = await payloadOf(rel, promptGroup(settings));
    expect(payload).toContain(".agents/rules/user-questions.md");
    expect(payload).toContain("No question is light enough to skip it");
    // The fallback, so a host without the tool is not read as an exemption.
    expect(payload).toContain("through that rule's fallback where it is not");
    // The reply language, which drifts toward the language of the tool output in a long session.
    expect(payload).toContain("Reply in the user's working language");
    expect(payload).toContain(".qfai/assistant/rule/communication.md");
    // The turn that waits on the user, which otherwise ends on a report and
    // leaves the session idle with nothing saying it waits.
    expect(payload).toContain(
      "A turn that leaves the next step to the user ends with such a question, listing the next actions with the recommended one first",
    );
  });

  // QFAI:EX-0001-0196-26
  it.each(QUESTION_RULES)(
    "%s limits the no-question exception to a previously requested operation still awaiting its result",
    async (rel) => {
      const rule = await readFile(path.join(repoRoot, rel), "utf-8");
      expectPendingOperationException(sectionOf(rule, "## 6. A turn that waits on the user"));
    },
  );

  // QFAI:EX-0001-0196-26
  it.each(SETTINGS)("%s carries the same pending-operation boundaries", async (rel) => {
    const settings = await readSettings(rel);
    expectPendingOperationException(await payloadOf(rel, promptGroup(settings)));
  });

  /** What the host writes to a `UserPromptSubmit` hook's stdin for one prompt. */
  const promptInput = (prompt: string): string =>
    JSON.stringify({ hook_event_name: "UserPromptSubmit", prompt });

  /** What the group prints for `input`, run against the project the settings file serves. */
  async function printedFor(rel: string, input: string): Promise<string> {
    const group = promptGroup(await readSettings(rel));
    const outputs = await Promise.all(
      group.hooks.map((hook) => runReminderHook(hook, projectDirOf(repoRoot, rel), input)),
    );
    return outputs.join("");
  }

  it.each(SETTINGS)("%s stays silent on an automated wake-up", async (rel) => {
    // A notification, a scheduled check-in or a sub-agent's report is not typed
    // by the user, and no question to the user forms on it. Printing there turns
    // the reminder into background noise.
    for (const prompt of [
      "<task-notification>\n<task-id>b1</task-id>\n<status>completed</status>",
      '<wake reason="external-event">CI finished</wake>',
      "[SYSTEM NOTIFICATION]\n\n<task-notification>\n<task-id>b1</task-id>",
      "[SYSTEM NOTIFICATION - NOT USER INPUT]\n\nActivity on a subscribed pull request.",
    ]) {
      await expect(printedFor(rel, promptInput(prompt)), prompt).resolves.toBe("");
    }
  });

  it.each(SETTINGS)(
    "%s still prints on a typed prompt, and on input it cannot read",
    async (rel) => {
      // Silence is kept for the wrappers it recognises. A prompt that only
      // mentions one, and input with no prompt at all, get the reminder.
      for (const input of [
        promptInput("Fix the failing test"),
        promptInput("done"),
        promptInput("I have finished the operation"),
        promptInput("Can I deploy it?"),
        promptInput("What does <task-notification> mean here?"),
        promptInput("<wakeup> is not a wrapper"),
        promptInput("What does [SYSTEM NOTIFICATION] mean here?"),
        "",
        "{ not json",
        "{}",
      ]) {
        await expect(printedFor(rel, input), input).resolves.toContain("user-questions.md");
      }
    },
  );

  it.each(QUESTION_RULES)("%s says it has a reminder", async (rel) => {
    // A reader of the rule needs to know one fires, or a hook that stops firing
    // looks like a rule nobody wrote a reminder for. The writing-standard rule
    // documents its own the same way.
    const master = await readFile(path.join(repoRoot, rel), "utf-8");
    expect(master).toContain("## The reminder");
    expect(master).toContain("`UserPromptSubmit`");
    // The two properties a later editor would otherwise have to rediscover.
    expect(master).toMatch(/reminds and never blocks/i);
    expect(master).toMatch(/no shell and\s+no\s+network/);
    expect(master).toContain("`.agents/rules/reminders.json`");
    // Which turns it stays silent on, so a missing reminder there reads as intended.
    expect(master).toContain("`<task-notification>`");
  });

  it("both settings files carry it", async () => {
    // One is the other's source. A reminder here and not in the shipped copy
    // reaches nobody who installed QFAI.
    const [mine, shipped] = await Promise.all(SETTINGS.map(readSettings));
    if (mine === undefined || shipped === undefined) throw new Error("settings missing");
    expect(JSON.stringify(promptGroup(mine))).toBe(JSON.stringify(promptGroup(shipped)));
  });
});
