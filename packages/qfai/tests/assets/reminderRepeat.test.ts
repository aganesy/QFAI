import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

import { projectDirOf, runReminderHook } from "../helpers/reminderHooks.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** This repository's own hooks, and the copy `qfai init` writes. */
const SETTINGS = [".claude/settings.json", "packages/qfai/assets/init/.claude/settings.json"];

type Entry = { readonly command?: string; readonly args?: readonly string[] };
type Group = { readonly hooks: readonly Entry[] };

/** Editing reminders print in full on a session's first eligible call and nothing after it. */
const WRITE_ONCE = [
  "minimal-implementation",
  "documentation-clarity-after-write",
  "documentation-clarity-after-edit",
] as const;
/** Every reminder that prints once per session and nothing after it. */
const FIRST_ONLY = [
  "structured-question",
  "api-budget",
  "documentation-clarity-before-post",
  "grilling-design-artifact",
  "grilling-delegation",
  "grilling-plan",
  ...WRITE_ONCE,
] as const;
/**
 * The free-text entry reminder, the one place the routing rule is stated, follows its full form with
 * a one-line pointer on every later prompt instead of going silent.
 */
const POINTERS = [["free-text-entry", "qfai-run"]] as const;
const SCHEDULED = [...POINTERS.map(([key]) => key), ...FIRST_ONLY];

/** Repeated delivery is checked through invocation twenty-one. */
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

describe.each(SETTINGS)("%s sends full context first and less or nothing later", (rel) => {
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
  // QFAI:EX-0001-0196-56
  it.each(FIRST_ONLY)(
    "prints %s in full once, then nothing on every later relevant call",
    async (key) => {
      const entry = (await entries(rel)).get(key);
      if (entry === undefined) throw new Error(`no entry carries ${key}`);
      const input = {
        session_id: newSession(),
        prompt: "Fix the failing test",
        tool_input: { command: "gh api repos/o/r" },
      };
      expect(contextOf(await call(rel, entry, input))).toBe(await fullContext(key));
      for (let count = 2; count <= PERIOD + 1; count += 1) {
        expect(await call(rel, entry, input), `${key}, call ${count}`).toBe("");
      }
    },
  );

  // QFAI:EX-0001-0196-55
  // QFAI:EX-0001-0196-56
  it("keeps counters separate by session, optional agent and message key", async () => {
    const byKey = await entries(rel);
    const session_id = newSession();
    for (const key of SCHEDULED) {
      const entry = byKey.get(key);
      if (entry === undefined) throw new Error(`no entry carries ${key}`);
      const full = await fullContext(key);
      const pointer = POINTERS.find(([prompt]) => prompt === key);
      for (const input of [
        { session_id },
        { session_id, agent_id: "helper" },
        { session_id: newSession() },
      ]) {
        expect(contextOf(await call(rel, entry, input))).toBe(full);
        const second = await call(rel, entry, input);
        if (pointer === undefined) expect(second, key).toBe("");
        else expectPointer(contextOf(second), full, pointer[1]);
      }
    }
  });

  // QFAI:EX-0001-0196-55
  // QFAI:EX-0001-0196-56
  it("falls back to full context on every selected trigger without a usable identity", async () => {
    const byKey = await entries(rel);
    for (const key of SCHEDULED) {
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
  // QFAI:EX-0001-0196-56
  it("falls back to full context and exit zero when selected counters cannot be stored", async () => {
    const byKey = await entries(rel);
    for (const key of SCHEDULED) {
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

  const promptCall = (entry: Entry, input: Record<string, unknown>): Promise<string> =>
    runReminderHook(
      entry,
      projectDirOf(repoRoot, rel),
      JSON.stringify({ hook_event_name: "UserPromptSubmit", ...input }),
    );

  // QFAI:EX-0001-0196-26
  // QFAI:EX-0001-0196-55
  it("filters CI-monitor prompt lines before each session, agent and key counter", async () => {
    const byKey = await entries(rel);
    const session_id = newSession();
    for (const [key, reference] of [
      ["free-text-entry", "qfai-run"],
      ["structured-question", null],
    ] as const) {
      const entry = byKey.get(key);
      if (entry === undefined) throw new Error(`no entry carries ${key}`);
      const full = await fullContext(key);
      for (const identity of [{ session_id }, { session_id, agent_id: "helper" }]) {
        for (const prompt of [
          "<ci-monitor-event>CI finished</ci-monitor-event>",
          ' \t<ci-monitor-event status="completed">CI finished</ci-monitor-event>',
          'Host notification\n\t<ci-monitor-event\nstatus="completed">CI finished</ci-monitor-event>',
        ]) {
          expect(await promptCall(entry, { ...identity, prompt }), `${key}: ${prompt}`).toBe("");
        }
        const first = await promptCall(entry, { ...identity, prompt: "Fix the failing test" });
        expect(contextOf(first)).toBe(full);
        expect(JSON.parse(first)).toMatchObject({
          hookSpecificOutput: { hookEventName: "UserPromptSubmit" },
        });
        const second = await promptCall(entry, { ...identity, prompt: "Continue the same fix" });
        if (reference === null) {
          expect(second, `${key}: second prompt`).toBe("");
          continue;
        }
        expectPointer(contextOf(second), full, reference);
        expect(JSON.parse(second)).toMatchObject({
          hookSpecificOutput: { hookEventName: "UserPromptSubmit" },
        });
      }
    }
  });

  // QFAI:EX-0001-0196-26
  it("keeps ordinary CI-marker mentions and other tag names eligible", async () => {
    const byKey = await entries(rel);
    for (const key of ["free-text-entry", "structured-question"]) {
      const entry = byKey.get(key);
      if (entry === undefined) throw new Error(`no entry carries ${key}`);
      const full = await fullContext(key);
      for (const prompt of [
        "Explain <ci-monitor-event> for this watcher",
        "<ci-monitor-eventual>Fix the failing test</ci-monitor-eventual>",
        "<ci-monitor-event/> Fix the failing test",
      ]) {
        expect(
          contextOf(await promptCall(entry, { session_id: newSession(), prompt })),
          `${key}: ${prompt}`,
        ).toBe(full);
      }
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
        "<ci-monitor-event>\nbuild passed</ci-monitor-event>",
        // A marker on a later line of a CRLF-separated prompt is still a line-opening marker.
        "Status follows.\r\n<ci-monitor-event>\r\nbuild passed",
      ]) {
        expect(await call(rel, entry, { session_id, prompt })).toBe("");
      }
      // The markers are case-sensitive: a differently cased wrapper is an ordinary prompt.
      const cased = await call(rel, entry, {
        session_id: newSession(),
        prompt: "<CI-Monitor-Event>\nbuild",
      });
      expect(contextOf(cased)).toBe(await fullContext(key));
      expect(
        contextOf(await call(rel, entry, { session_id, prompt: "Fix the failing test" })),
      ).toBe(await fullContext(key));
    }
  });
  // QFAI:EX-0001-0196-56
  it("prints editing reminders in full first and nothing on the second eligible call", async () => {
    const byKey = await entries(rel);
    for (const key of WRITE_ONCE) {
      const entry = byKey.get(key);
      if (entry === undefined) throw new Error(`no entry carries ${key}`);
      const session_id = newSession();
      const input = {
        session_id,
        hook_event_name: "PostToolUse",
        tool_name: "Edit",
        tool_input: { file_path: key === "minimal-implementation" ? "src/a.ts" : "docs/a.md" },
      };
      const full = await fullContext(key);
      expect(contextOf(await call(rel, entry, input)), `${key}, first call`).toBe(full);
      expect(await call(rel, entry, input), `${key}, second call`).toBe("");
    }
  });

  // QFAI:EX-0001-0196-53
  // QFAI:EX-0001-0196-56
  it("prints nothing for implementation on every later call through invocation twenty-one", async () => {
    const entry = (await entries(rel)).get("minimal-implementation");
    if (entry === undefined) throw new Error("no entry carries minimal-implementation");
    const session_id = newSession();
    const full = await fullContext("minimal-implementation");
    const input = {
      session_id,
      hook_event_name: "PostToolUse",
      tool_name: "Write",
      tool_input: { file_path: "src/a.ts" },
    };
    for (let n = 1; n <= PERIOD + 1; n += 1) {
      const stdout = await call(rel, entry, input);
      if (n === 1) expect(contextOf(stdout)).toBe(full);
      else expect(stdout, `call ${n}`).toBe("");
    }
  });

  // QFAI:EX-0001-0196-56
  it("keeps implementation sequences separate when an agent or session changes", async () => {
    const entry = (await entries(rel)).get("minimal-implementation");
    if (entry === undefined) throw new Error("no entry carries minimal-implementation");
    const session_id = newSession();
    const full = await fullContext("minimal-implementation");
    for (const input of [
      { session_id },
      { session_id, agent_id: "helper" },
      { session_id: newSession() },
    ]) {
      expect(contextOf(await call(rel, entry, input))).toBe(full);
      expect(await call(rel, entry, input)).toBe("");
    }
  });

  it("prints on every call when the input names no session", async () => {
    const byKey = await entries(rel);
    for (const key of WRITE_ONCE) {
      const entry = byKey.get(key);
      if (entry === undefined) throw new Error(`no entry carries ${key}`);
      for (const input of [{}, { session_id: 7 }]) {
        expect(await call(rel, entry, input), key).toContain("additionalContext");
        expect(await call(rel, entry, input), key).toContain("additionalContext");
      }
    }
  });

  // QFAI:EX-0001-0196-55
  it("counts the API-budget reminder only on a command that reaches the network", async () => {
    const entry = (await entries(rel)).get("api-budget");
    if (entry === undefined) throw new Error("no entry carries api-budget");
    const session_id = newSession();
    for (const command of ["git status", "cat curl.txt", "ls ~/.gh", "echo high"]) {
      expect(await call(rel, entry, { session_id, tool_input: { command } }), command).toBe("");
    }
    expect(contextOf(await call(rel, entry, { session_id }))).toBe(await fullContext("api-budget"));
  });

  // QFAI:EX-0001-0196-56
  it("prints the API-budget reminder for each network client or the API host, and nothing else", async () => {
    const entry = (await entries(rel)).get("api-budget");
    if (entry === undefined) throw new Error("no entry carries api-budget");
    const full = await fullContext("api-budget");
    for (const command of [
      "gh pr view 1",
      "cd a && curl -s https://example.com",
      "curl.exe -s https://example.com",
      "/usr/bin/wget -q https://example.com",
      "Invoke-WebRequest -Uri https://example.com",
      "invoke-restmethod https://example.com",
      "iwr https://example.com",
      "irm https://example.com | Out-Null",
      "node -e \"fetch('https://api.github.com/rate_limit')\"",
    ]) {
      const input = { session_id: newSession(), tool_input: { command } };
      expect(contextOf(await call(rel, entry, input)), command).toBe(full);
    }
    for (const command of [
      "git push origin main",
      "npm run gh-pages",
      "cat curl.txt wget.log",
      "Get-Content Invoke-WebRequest.md",
      "echo ghost firm",
    ]) {
      const input = { session_id: newSession(), tool_input: { command } };
      expect(await call(rel, entry, input), command).toBe("");
    }
  });

  // QFAI:EX-0001-0196-56
  it("prints a once-per-session reminder exactly once when calls race", async () => {
    const byKey = await entries(rel);
    for (const key of FIRST_ONLY) {
      const entry = byKey.get(key);
      if (entry === undefined) throw new Error(`no entry carries ${key}`);
      const input = { session_id: newSession() };
      const printed = await Promise.all([1, 2, 3, 4, 5].map(() => call(rel, entry, input)));
      expect(printed.filter((stdout) => stdout.trim() !== ""), key).toHaveLength(1);
    }
  });

  // QFAI:EX-0001-0196-53
  // QFAI:EX-0001-0196-56
  it("filters excluded implementation files before the first full display", async () => {
    const entry = (await entries(rel)).get("minimal-implementation");
    if (entry === undefined) throw new Error("no implementation reminder");
    const session_id = newSession();
    const input = (file_path: string) => ({
      session_id,
      hook_event_name: "PostToolUse",
      tool_name: "Edit",
      tool_input: { file_path },
    });
    for (const file of ["README.md", "tmp/a.ts", "tests/a.ts", "../outside.ts"]) {
      expect(await call(rel, entry, input(file)), file).toBe("");
    }
    const full = await fullContext("minimal-implementation");
    expect(contextOf(await call(rel, entry, input("src/a.ts")))).toBe(full);
    expect(await call(rel, entry, input("src/a.ts"))).toBe("");
  });

  // QFAI:EX-0001-0196-56
  it("prints before-post once per session, apart from the editing reminders", async () => {
    const byKey = await entries(rel);
    const entry = byKey.get("documentation-clarity-before-post");
    if (entry === undefined) throw new Error("no entry carries documentation-clarity-before-post");
    const session_id = newSession();
    for (const editKey of WRITE_ONCE) {
      const editing = byKey.get(editKey);
      if (editing === undefined) throw new Error(`no entry carries ${editKey}`);
      await call(rel, editing, { session_id });
      await call(rel, editing, { session_id });
    }
    const full = await fullContext("documentation-clarity-before-post");
    expect(contextOf(await call(rel, entry, { session_id }))).toBe(full);
    for (let n = 2; n <= PERIOD + 1; n += 1) {
      expect(await call(rel, entry, { session_id }), `call ${n}`).toBe("");
    }
  });
});
