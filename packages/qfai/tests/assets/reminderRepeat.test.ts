import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

import { projectDirOf, runReminderHook } from "../helpers/reminderHooks.js";
import { removeTempTree } from "../helpers/tempTree.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** This repository's own hooks, and the copy `qfai init` writes. */
const SETTINGS = [".claude/settings.json", "packages/qfai/assets/init/.claude/settings.json"];

type Entry = { readonly command?: string; readonly args?: readonly string[] };
type Group = { readonly hooks: readonly Entry[] };

/** The reminders printed on a limited schedule, and the ones printed on every call. */
const LIMITED = [
  "minimal-implementation",
  "documentation-clarity-after-write",
  "documentation-clarity-after-edit",
];
const EVERY_CALL = ["documentation-clarity-before-post"];
const POINTERS = [
  ["api-budget", ".agents/rules/api-budget.md"],
  ["grilling-design-artifact", ".agents/rules/grilling.md"],
  ["grilling-delegation", ".agents/rules/grilling.md"],
  ["grilling-plan", ".agents/rules/grilling.md"],
  ["free-text-entry", "qfai-run"],
  ["structured-question", ".agents/rules/user-questions.md"],
] as const;

/** Calls between two prints of one reminder, after the first. */
const PERIOD = 20;

/** Session ids this file made, so the counters they left in the temp directory can go. */
const sessions: string[] = [];

function newSession(): string {
  const id = `repeat-${randomUUID()}`;
  sessions.push(id);
  return id;
}

afterAll(async () => {
  const names = await readdir(os.tmpdir());
  await Promise.all(
    names
      .filter((name) => sessions.some((id) => name.startsWith(`qfai-reminder-${id}-`)))
      .map((name) => rm(path.join(os.tmpdir(), name), { force: true })),
  );
});

async function entries(rel: string): Promise<ReadonlyMap<string, Entry>> {
  const parsed: { hooks: Record<string, readonly Group[]> } = JSON.parse(
    await readFile(path.join(repoRoot, rel), "utf-8"),
  );
  const byKey = new Map<string, Entry>();
  for (const groups of Object.values(parsed.hooks)) {
    for (const group of groups) {
      for (const entry of group.hooks) byKey.set(entry.args?.[3] ?? "", entry);
    }
  }
  return byKey;
}

/** What one call prints. The command names the forge so the API-budget reminder applies. */
function call(rel: string, entry: Entry, input: Record<string, unknown>): Promise<string> {
  return runReminderHook(
    entry,
    projectDirOf(repoRoot, rel),
    JSON.stringify({ tool_input: { command: "gh api repos/o/r" }, ...input }),
  );
}

function contextOf(stdout: string): string {
  expect(stdout.trim(), "a relevant reminder must emit a JSON envelope").not.toBe("");
  const parsed: unknown = JSON.parse(stdout);
  if (typeof parsed !== "object" || parsed === null) throw new Error("no hook envelope");
  expect(parsed).not.toHaveProperty("briefContext");
  const output: unknown = Reflect.get(parsed, "hookSpecificOutput");
  if (typeof output !== "object" || output === null) throw new Error("no hookSpecificOutput");
  const context: unknown = Reflect.get(output, "additionalContext");
  if (typeof context !== "string") throw new Error("no additionalContext");
  return context;
}

async function fullContext(key: string): Promise<string> {
  const messages: Record<string, unknown> = JSON.parse(
    await readFile(
      path.join(repoRoot, "packages/qfai/assets/init/root/.agents/rules/reminders.json"),
      "utf-8",
    ),
  );
  const message = messages[key];
  if (typeof message !== "object" || message === null) throw new Error("no message");
  return contextOf(
    JSON.stringify({ hookSpecificOutput: Reflect.get(message, "hookSpecificOutput") }),
  );
}

function expectPointer(context: string, full: string, reference: string): void {
  expect(context).toContain(reference);
  expect(context.trim()).not.toBe("");
  expect(context).not.toMatch(/[\r\n\u2028\u2029]/);
  expect(context.length).toBeLessThan(full.length);
  if (reference === "qfai-run") {
    expect(context).toMatch(/\bnew requests?\b.*\bplan\b/i);
    expect(context).toMatch(
      /\b(?:requested|pending|waiting)\b.*\b(?:answers?|results?|repl(?:y|ies))\b/i,
    );
    expect(context).toMatch(/\b(?:current|same|waiting)\b.*\bstep\b/i);
    expect(context).not.toMatch(/\b(?:activeRun|turn_id)\b/);
  }
}

describe.each(SETTINGS)("%s limits how often a tool-time reminder repeats", (rel) => {
  // QFAI:EX-0001-0196-55
  it.each(POINTERS)(
    "prints %s in full once, then a one-line pointer on every relevant trigger",
    async (key, reference) => {
      const entry = (await entries(rel)).get(key);
      if (entry === undefined) throw new Error(`no entry carries ${key}`);
      const full = await fullContext(key);
      const input = { session_id: newSession(), prompt: "Fix the failing test" };
      expect(contextOf(await call(rel, entry, input))).toBe(full);
      for (let count = 2; count <= PERIOD + 1; count += 1) {
        expectPointer(contextOf(await call(rel, entry, input)), full, reference);
      }
    },
  );

  // QFAI:EX-0001-0196-55
  it("keeps pointer counters separate by session, optional agent and message key", async () => {
    const byKey = await entries(rel);
    const session_id = newSession();
    for (const [key, reference] of POINTERS) {
      const entry = byKey.get(key);
      if (entry === undefined) throw new Error(`no entry carries ${key}`);
      const full = await fullContext(key);
      for (const input of [
        { session_id },
        { session_id, agent_id: "helper" },
        { session_id: newSession() },
      ]) {
        expect(contextOf(await call(rel, entry, input))).toBe(full);
        expectPointer(contextOf(await call(rel, entry, input)), full, reference);
      }
    }
  });

  // QFAI:EX-0001-0196-55
  it("falls back to full context on every selected trigger without a usable identity", async () => {
    const byKey = await entries(rel);
    for (const [key] of POINTERS) {
      const entry = byKey.get(key);
      if (entry === undefined) throw new Error(`no entry carries ${key}`);
      for (const input of [{}, { session_id: 7 }]) {
        const full = await fullContext(key);
        expect(contextOf(await call(rel, entry, input))).toBe(full);
        expect(contextOf(await call(rel, entry, input))).toBe(full);
      }
    }
  });

  // QFAI:EX-0001-0196-55
  it("falls back to full context and exit zero when selected counters cannot be stored", async () => {
    const byKey = await entries(rel);
    for (const [key] of POINTERS) {
      const entry = byKey.get(key);
      if (entry === undefined) throw new Error(`no entry carries ${key}`);
      const session_id = newSession();
      const counter = path.join(os.tmpdir(), `qfai-reminder-${session_id}-main-${key}`);
      await mkdir(counter);
      try {
        const full = await fullContext(key);
        expect(contextOf(await call(rel, entry, { session_id }))).toBe(full);
        expect(contextOf(await call(rel, entry, { session_id }))).toBe(full);
      } finally {
        await rm(counter, { recursive: true, force: true });
      }
    }
  });

  // QFAI:EX-0001-0196-55
  it("keeps the full envelope on repeated tool calls when the catalog has no brief context", async () => {
    const key = "api-budget";
    const entry = (await entries(rel)).get(key);
    if (entry === undefined) throw new Error(`no entry carries ${key}`);
    const messages: Record<string, unknown> = JSON.parse(
      await readFile(
        path.join(repoRoot, "packages/qfai/assets/init/root/.agents/rules/reminders.json"),
        "utf-8",
      ),
    );
    const message = messages[key];
    if (typeof message !== "object" || message === null) throw new Error("no message");
    Reflect.deleteProperty(message, "briefContext");
    const full = await fullContext(key);
    const project = await mkdtemp(path.join(os.tmpdir(), "qfai-claude-old-catalog-"));
    try {
      const rules = path.join(project, ".agents", "rules");
      await mkdir(rules, { recursive: true });
      await writeFile(path.join(rules, "reminders.json"), JSON.stringify(messages), "utf-8");
      const input = JSON.stringify({
        session_id: newSession(),
        tool_input: { command: "gh api repos/o/r" },
      });
      for (let count = 1; count <= 3; count += 1) {
        const stdout = await runReminderHook(entry, project, input);
        expect(JSON.parse(stdout)).toEqual(message);
        expect(contextOf(stdout)).toBe(full);
      }
    } finally {
      await removeTempTree(project);
    }
  });

  // QFAI:EX-0001-0196-55
  it("filters known Claude notification prompts before counting either prompt reminder", async () => {
    const byKey = await entries(rel);
    for (const key of ["free-text-entry", "structured-question"]) {
      const entry = byKey.get(key);
      if (entry === undefined) throw new Error(`no entry carries ${key}`);
      const session_id = newSession();
      for (const prompt of [
        "<task-notification>Done</task-notification>",
        '<wake reason="external-event">CI finished</wake>',
        "[SYSTEM NOTIFICATION - NOT USER INPUT]\nCI finished",
      ]) {
        expect(await call(rel, entry, { session_id, prompt })).toBe("");
      }
      expect(
        contextOf(await call(rel, entry, { session_id, prompt: "Fix the failing test" })),
      ).toBe(await fullContext(key));
    }
  });
  it("prints each limited reminder on a session's first call and not on the second", async () => {
    const byKey = await entries(rel);
    for (const key of LIMITED) {
      const entry = byKey.get(key);
      if (entry === undefined) throw new Error(`no entry carries ${key}`);
      const session_id = newSession();
      expect(await call(rel, entry, { session_id }), `${key}, first call`).toContain(
        "additionalContext",
      );
      expect(await call(rel, entry, { session_id }), `${key}, second call`).toBe("");
    }
  });

  it("prints again on the call after a full period, and not before it", async () => {
    const entry = (await entries(rel)).get("minimal-implementation");
    if (entry === undefined) throw new Error("no entry carries minimal-implementation");
    const session_id = newSession();
    const printed: number[] = [];
    for (let n = 1; n <= PERIOD + 1; n += 1) {
      if ((await call(rel, entry, { session_id })) !== "") printed.push(n);
    }
    expect(printed).toEqual([1, PERIOD + 1]);
  });

  it("counts each session, and each sub-agent of a session, on its own", async () => {
    const entry = (await entries(rel)).get("minimal-implementation");
    if (entry === undefined) throw new Error("no entry carries minimal-implementation");
    const session_id = newSession();
    await call(rel, entry, { session_id });
    expect(await call(rel, entry, { session_id, agent_id: "helper" })).toContain(
      "additionalContext",
    );
    expect(await call(rel, entry, { session_id: newSession() })).toContain("additionalContext");
  });

  it("prints on every call when the input names no session", async () => {
    const byKey = await entries(rel);
    for (const key of LIMITED) {
      const entry = byKey.get(key);
      if (entry === undefined) throw new Error(`no entry carries ${key}`);
      for (const input of [{}, { session_id: 7 }]) {
        expect(await call(rel, entry, input), key).toContain("additionalContext");
        expect(await call(rel, entry, input), key).toContain("additionalContext");
      }
    }
  });

  // QFAI:EX-0001-0196-55
  it("counts the API-budget reminder only on a command that names the forge", async () => {
    const entry = (await entries(rel)).get("api-budget");
    if (entry === undefined) throw new Error("no entry carries api-budget");
    const session_id = newSession();
    for (let n = 0; n < 3; n += 1) {
      expect(await call(rel, entry, { session_id, tool_input: { command: "git status" } })).toBe(
        "",
      );
    }
    expect(contextOf(await call(rel, entry, { session_id }))).toBe(await fullContext("api-budget"));
  });

  it("leaves the reminder before a post on every call", async () => {
    const byKey = await entries(rel);
    for (const key of EVERY_CALL) {
      const entry = byKey.get(key);
      if (entry === undefined) throw new Error(`no entry carries ${key}`);
      const session_id = newSession();
      expect(await call(rel, entry, { session_id }), key).toContain("additionalContext");
      expect(await call(rel, entry, { session_id }), key).toContain("additionalContext");
    }
  });
});
