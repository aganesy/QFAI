/**
 * `qfai session-review` core: where transcripts are found, what is counted in them, and what the
 * report may carry. The fixtures are synthetic transcripts in each host's record shape.
 */
import { mkdir, mkdtemp, readdir, readFile, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { emptyEvents, type SessionEvents } from "../../src/core/sessionReview/events.js";
import {
  claudeProjectSlug,
  locateSessions,
  sameDirectory,
  sinceInstant,
  type LocateEnvironment,
} from "../../src/core/sessionReview/locate.js";
import {
  parseClaudeTranscript,
  readClaudeRecord,
} from "../../src/core/sessionReview/parseClaude.js";
import { parseCodexTranscript, readCodexRecord } from "../../src/core/sessionReview/parseCodex.js";
import { redact } from "../../src/core/sessionReview/redact.js";
import { renderJson, renderMarkdown } from "../../src/core/sessionReview/render.js";
import {
  correctionWords,
  echoedStatus,
  isTypedTurn,
  pathsInCommand,
  qfaiCommandsIn,
  reminderIndex,
  reminderKeys,
  summarise,
  watchedPath,
  type ProjectFacts,
} from "../../src/core/sessionReview/signals.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(here, "..", "fixtures", "session-transcripts");
const CLAUDE_FIXTURE = path.join(FIXTURES, "claude", "session.jsonl");
const CODEX_FIXTURE = path.join(FIXTURES, "codex", "rollout.jsonl");

/** The root the fixtures record. */
const FIXTURE_ROOT = "/work/app";

/** The key `.agents/rules/reminders.json` gives each reminder text, as the project ships it. */
const REMINDER_TEXTS: ReadonlyMap<string, string> = new Map([
  ["QFAI API budget (.agents/rules/api-budget.md). Ask git first.", "api-budget"],
  [
    "QFAI user questions (.agents/rules/user-questions.md): ask only when the next step needs it.",
    "structured-question",
  ],
  [
    "QFAI free-text entry: for each new request, invoke the qfai-run skill first.",
    "free-text-entry",
  ],
  // A brief text does not start with "QFAI", and is still the reminder's.
  ["For new requests the user wrote, use qfai-run to plan.", "free-text-entry"],
]);

const FACTS: ProjectFacts = {
  root: FIXTURE_ROOT,
  platform: "linux",
  reminderTexts: REMINDER_TEXTS,
};

const tempDirs: string[] = [];

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-session-review-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

/** A fixture written for `root`: the recorded root replaced, JSON-escaped. */
async function fixtureFor(fixture: string, root: string): Promise<string> {
  const text = await readFile(fixture, "utf-8");
  const escaped = JSON.stringify(root).slice(1, -1);
  return text.split(FIXTURE_ROOT).join(escaped);
}

async function place(file: string, body: string, mtime?: Date): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body, "utf-8");
  if (mtime !== undefined) await utimes(file, mtime, mtime);
}

function environment(base: string): LocateEnvironment {
  return {
    home: path.join(base, "home"),
    claudeConfigDir: path.join(base, "claude"),
    codexHome: path.join(base, "codex"),
    platform: process.platform,
  };
}

// QFAI:EX-0001-0294-01
// QFAI:EX-0001-0294-02
// QFAI:EX-0001-0294-03
// QFAI:EX-0001-0294-04
describe("where the transcripts are", () => {
  it("names the Claude Code project directory after the absolute root on Windows and POSIX", () => {
    expect(claudeProjectSlug("C:\\Work\\My App", path.win32)).toBe("C--Work-My-App");
    expect(claudeProjectSlug("/home/dev/my.app", path.posix)).toBe("-home-dev-my-app");
  });

  it("compares directories without slashes or a trailing slash, and without case only on Windows", () => {
    expect(sameDirectory("C:\\Work\\App", "c:/work/app/", "win32")).toBe(true);
    expect(sameDirectory("/work/App", "/work/app", "linux")).toBe(false);
    expect(sameDirectory("/work/app/", "/work/app", "linux")).toBe(true);
  });

  it("reads the transcript under CLAUDE_CONFIG_DIR and not the one under the home directory", async () => {
    const base = await tempDir();
    const root = path.join(base, "project");
    const env = environment(base);
    const slug = claudeProjectSlug(root);
    const body = await fixtureFor(CLAUDE_FIXTURE, root);
    await place(path.join(base, "claude", "projects", slug, "chosen.jsonl"), body);
    await place(path.join(base, "home", ".claude", "projects", slug, "other.jsonl"), body);

    const found = await locateSessions(root, ["claude"], env);
    expect(found.map((session) => session.sessionId)).toEqual(["chosen"]);
  });

  it("falls back to a directory sharing the slug's start whose transcript records the root as cwd", async () => {
    const base = await tempDir();
    const root = path.join(base, "project");
    const env = environment(base);
    const slug = claudeProjectSlug(root);
    const projects = path.join(base, "claude", "projects");
    const own = await fixtureFor(CLAUDE_FIXTURE, root);
    await place(path.join(projects, `${slug}-shortened`, "found.jsonl"), own);
    await place(
      path.join(projects, `${slug}-other`, "elsewhere.jsonl"),
      await fixtureFor(CLAUDE_FIXTURE, path.join(base, "elsewhere")),
    );
    // A directory that does not share the slug's start is never opened.
    await place(path.join(projects, "unrelated", "unread.jsonl"), own);

    const found = await locateSessions(root, ["claude"], env);
    expect(found.map((session) => session.sessionId)).toEqual(["found"]);
  });

  it("matches the directory and the recorded cwd with other letter case and slashes on Windows", async () => {
    const base = await tempDir();
    const root = path.join(base, "Project");
    const env = { ...environment(base), platform: "win32" as const };
    const recorded = root.toLowerCase().replace(/\\/g, "/");
    await place(
      path.join(
        base,
        "claude",
        "projects",
        `${claudeProjectSlug(root).toLowerCase()}-x`,
        "cased.jsonl",
      ),
      await fixtureFor(CLAUDE_FIXTURE, recorded),
    );

    const found = await locateSessions(root, ["claude"], env);
    expect(found.map((session) => session.sessionId)).toEqual(["cased"]);
  });

  it("takes only the Codex rollouts whose session_meta names the root", async () => {
    const base = await tempDir();
    const root = path.join(base, "project");
    const env = environment(base);
    const day = path.join(base, "codex", "sessions", "2026", "11", "10");
    await place(
      path.join(day, "rollout-2026-11-10T10-00-00-0199aaaa-bbbb-7ccc-8ddd-eeeeffff0000.jsonl"),
      await fixtureFor(CODEX_FIXTURE, root),
    );
    await place(
      path.join(day, "rollout-2026-11-10T11-00-00-0199aaaa-bbbb-7ccc-8ddd-eeeeffff0001.jsonl"),
      (await fixtureFor(CODEX_FIXTURE, path.join(base, "elsewhere"))).replace(
        "ffff0000",
        "ffff0001",
      ),
    );

    const found = await locateSessions(root, ["codex"], env);
    expect(found.map((session) => session.sessionId)).toEqual([
      "0199aaaa-bbbb-7ccc-8ddd-eeeeffff0000",
    ]);
  });
});

// QFAI:EX-0001-0294-09
// QFAI:EX-0001-0294-10
// QFAI:EX-0001-0294-11
// QFAI:EX-0001-0294-12
// QFAI:EX-0001-0294-13
// QFAI:EX-0001-0294-14
// QFAI:EX-0001-0294-15
describe("what a Claude Code transcript shows", () => {
  async function claudeSignals(): Promise<ReturnType<typeof summarise>> {
    return summarise(await parseClaudeTranscript(CLAUDE_FIXTURE), FACTS);
  }

  it("counts each reminder under its key, a brief text too, and leaves the project's own context out", async () => {
    expect((await claudeSignals()).reminders).toEqual([
      { name: "api-budget", count: 2 },
      { name: "free-text-entry", count: 2 },
      { name: "structured-question", count: 1 },
      // A QFAI wording the project's file does not list is counted, and its text is not shown.
      { name: "unregistered", count: 1 },
    ]);
  });

  it("lists a rule file read twice by its repository-relative path, and no source file", async () => {
    expect((await claudeSignals()).reads).toEqual([
      { path: ".agents/rules/grilling.md", reads: 2, repeats: 1, bytes: 15 },
      { path: ".qfai/assistant/skill/qfai-run/SKILL.md", reads: 1, repeats: 0, bytes: 10 },
    ]);
  });

  it("counts tool errors per tool with their finding codes", async () => {
    expect((await claudeSignals()).toolErrors).toEqual([
      { tool: "Bash", count: 1, codes: [{ name: "QFAI-TRACE-002", count: 2 }] },
      { tool: "Edit", count: 1, codes: [] },
    ]);
  });

  it("lists each qfai command with its exit status; quoted text and a skill name are no command", async () => {
    expect((await claudeSignals()).qfaiCommands).toEqual([
      {
        command: "qfai validate",
        runs: 3,
        exits: [
          { name: "0", count: 1 },
          { name: "1", count: 1 },
          // A command sent to the background has no exit status yet.
          { name: "unknown", count: 1 },
        ],
      },
    ]);
    expect(qfaiCommandsIn('git commit -m "make qfai validate faster"')).toEqual([]);
    expect(qfaiCommandsIn("cd app && npx qfai report\nqfai workflow plan --order")).toEqual([
      "qfai report",
      "qfai workflow plan",
    ]);
    expect(qfaiCommandsIn("echo qfai-run && npx qfai sdd next-id US BF-0001")).toEqual([
      "qfai sdd next-id",
    ]);
    expect(qfaiCommandsIn("node_modules\\.bin\\qfai doctor")).toEqual(["qfai doctor"]);
  });

  it("counts structured-question calls and the questions they carry", async () => {
    expect((await claudeSignals()).questions).toEqual({ calls: 1, items: 3 });
  });

  it("lists typed turns that match the correction words, and no tool result or wrapper", async () => {
    const signals = await claudeSignals();
    expect(signals.typedTurns).toBe(3);
    expect(signals.corrections).toEqual([
      { turn: 2, words: ["instead", "wrong"] },
      // The third typed turn says "that is wrong" in Japanese.
      { turn: 3, words: [String.fromCodePoint(0x9055, 0x3046)] },
    ]);
  });

  it("skips and counts the lines that are not JSON records, with CRLF line ends too", async () => {
    const dir = await tempDir();
    const crlf = path.join(dir, "crlf.jsonl");
    await writeFile(
      crlf,
      (await readFile(CLAUDE_FIXTURE, "utf-8")).replace(/\n/g, "\r\n"),
      "utf-8",
    );
    const lf = await parseClaudeTranscript(CLAUDE_FIXTURE);
    const crlfEvents = await parseClaudeTranscript(crlf);
    expect(lf.malformed).toBe(2);
    expect(crlfEvents.records).toBe(lf.records);
    expect(crlfEvents.malformed).toBe(2);
    expect(summarise(crlfEvents, FACTS)).toEqual(summarise(lf, FACTS));
  });
});

// QFAI:EX-0001-0294-11
// QFAI:EX-0001-0294-12
// QFAI:EX-0001-0294-14
describe("what a Codex rollout shows", () => {
  it("counts the hook context, the shell-named rule file, the failed call and the questions", async () => {
    const signals = summarise(await parseCodexTranscript(CODEX_FIXTURE), FACTS);
    expect(signals.records).toBe(19);
    expect(signals.malformed).toBe(1);
    expect(signals.reminders).toEqual([{ name: "api-budget", count: 1 }]);
    expect(signals.reads.map((read) => [read.path, read.reads])).toEqual([
      [".agents/rules/grilling.md", 1],
    ]);
    expect(signals.toolErrors).toEqual([
      { tool: "exec_command", count: 1, codes: [{ name: "QFAI-SCAN-002", count: 1 }] },
    ]);
    // The status a command's own output prints, and a status in a non-shell output, are not the call's.
    expect(signals.qfaiCommands).toEqual([
      { command: "qfai doctor", runs: 1, exits: [{ name: "0", count: 1 }] },
      { command: "qfai validate", runs: 1, exits: [{ name: "1", count: 1 }] },
    ]);
    expect(signals.questions).toEqual({ calls: 1, items: 2 });
    // Injected AGENTS.md instructions and an unmarked message are not typed turns.
    expect(signals.typedTurns).toBe(2);
    expect(signals.corrections).toEqual([{ turn: 2, words: ["revert", "stop"] }]);
  });
});

// QFAI:EX-0001-0294-09
// QFAI:EX-0001-0294-10
// QFAI:EX-0001-0294-14
// QFAI:EX-0001-0294-03
// QFAI:EX-0001-0294-06
// QFAI:EX-0001-0294-12
// QFAI:EX-0001-0294-14
describe("the edges a slug, a shell line and a calendar leave open", () => {
  it("takes a transcript in the root's own directory only when it records the root as cwd", async () => {
    const base = await tempDir();
    // `a-b` and `a/b` give one slug, so the directory alone cannot tell their sessions apart.
    const root = path.join(base, "a-b");
    const other = path.join(base, "a", "b");
    expect(claudeProjectSlug(other)).toBe(claudeProjectSlug(root));
    const dir = path.join(base, "claude", "projects", claudeProjectSlug(root));
    await place(path.join(dir, "own.jsonl"), await fixtureFor(CLAUDE_FIXTURE, root));
    await place(path.join(dir, "other.jsonl"), await fixtureFor(CLAUDE_FIXTURE, other));

    const found = await locateSessions(root, ["claude"], environment(base));
    expect(found.map((session) => session.sessionId)).toEqual(["own"]);
  });

  it("treats only the hosts' own wrapper tags as host text, not every turn that opens with <", () => {
    expect(isTypedTurn("<system-reminder>stop</system-reminder>")).toBe(false);
    expect(isTypedTurn("<task-notification>done</task-notification>")).toBe(false);
    expect(isTypedTurn("<command-name>/clear</command-name>")).toBe(false);
    expect(isTypedTurn("<b>wrong</b> heading, use the other one")).toBe(true);
    expect(isTypedTurn("<= 3 items, not more")).toBe(true);
  });

  it("splits a shell line only where a separator stands outside quotes", () => {
    expect(qfaiCommandsIn("printf '; qfai validate'")).toEqual([]);
    expect(qfaiCommandsIn('echo "a && qfai doctor" | cat')).toEqual([]);
    expect(qfaiCommandsIn("echo a\\; qfai report")).toEqual([]);
    expect(qfaiCommandsIn("npx qfai validate; qfai report")).toEqual([
      "qfai validate",
      "qfai report",
    ]);
  });

  it("gives the shell's status to a qfai command only when the call ran one", () => {
    const events: SessionEvents = {
      records: 2,
      malformed: 0,
      hookContexts: [],
      calls: [{ id: "x", name: "Bash", command: "npx qfai validate && npx qfai report" }],
      results: [{ id: "x", isError: true, text: "Exit code 1", exitCode: 1 }],
      userTurns: [],
    };
    expect(summarise(events, FACTS).qfaiCommands).toEqual([
      { command: "qfai report", runs: 1, exits: [{ name: "unknown", count: 1 }] },
      { command: "qfai validate", runs: 1, exits: [{ name: "unknown", count: 1 }] },
    ]);
  });

  it("gives the shell's status to a qfai command only when it ran last", () => {
    const events = (command: string): SessionEvents => ({
      records: 2,
      malformed: 0,
      hookContexts: [],
      calls: [{ id: "x", name: "Bash", command }],
      results: [{ id: "x", isError: false, text: "", exitCode: 0 }],
      userTurns: [],
    });
    expect(summarise(events("npx qfai validate; echo done"), FACTS).qfaiCommands).toEqual([
      { command: "qfai validate", runs: 1, exits: [{ name: "unknown", count: 1 }] },
    ]);
    expect(summarise(events("cd app && npx qfai validate"), FACTS).qfaiCommands).toEqual([
      { command: "qfai validate", runs: 1, exits: [{ name: "0", count: 1 }] },
    ]);
  });

  it("adds result bytes to a file only when the command names no other path", () => {
    const events: SessionEvents = {
      records: 4,
      malformed: 0,
      hookContexts: [],
      calls: [
        { id: "a", name: "Bash", command: "cat .agents/rules/a.md src/x.ts" },
        { id: "b", name: "Bash", command: "cat .agents/rules/a.md" },
      ],
      results: [
        { id: "a", isError: false, text: "1234567890", exitCode: 0 },
        { id: "b", isError: false, text: "12345", exitCode: 0 },
      ],
      userTurns: [],
    };
    expect(summarise(events, FACTS).reads).toEqual([
      { path: ".agents/rules/a.md", reads: 2, repeats: 1, bytes: 5 },
    ]);
  });

  it("reads a Codex exit status from the call's own result, not from an exit_code its output prints", () => {
    const events = emptyEvents();
    readCodexRecord(
      {
        type: "response_item",
        payload: {
          type: "function_call",
          name: "exec_command",
          call_id: "c",
          arguments: JSON.stringify({ cmd: "npx qfai validate" }),
        },
      },
      events,
    );
    readCodexRecord(
      {
        type: "response_item",
        payload: {
          type: "function_call_output",
          call_id: "c",
          output: JSON.stringify({ exit_code: 0, output: JSON.stringify({ exit_code: 1 }) }),
        },
      },
      events,
    );
    expect(events.results).toEqual([
      expect.objectContaining({ id: "c", isError: false, exitCode: 0 }),
    ]);
  });

  it("refuses a --since date the calendar does not have", () => {
    expect(sinceInstant("2026-02-30")).toBeNull();
    expect(sinceInstant("2026-02-30T00:00:00Z")).toBeNull();
    expect(sinceInstant("2026-13-01")).toBeNull();
    expect(sinceInstant("2024-02-29")).toBe(Date.UTC(2024, 1, 29));
  });
});

// QFAI:EX-0001-0294-25
// QFAI:EX-0001-0294-26
describe("the signal helpers", () => {
  it("reads a watched path named under the root in either slash style, never one a patch writes", () => {
    const facts = { root: "C:\\Work\\App", platform: "win32" as const };
    expect(pathsInCommand("type c:\\work\\app\\.claude\\rules\\scoped\\a.md", facts)).toEqual([
      ".claude/rules/scoped/a.md",
    ]);
    expect(pathsInCommand("cat ./.agents/rules/*.md .agents/rules/", facts)).toEqual([]);
    expect(pathsInCommand("apply_patch .agents/rules/a.md", facts)).toEqual([]);
  });

  it("reads the Git Bash form of a Windows root, and resolves .. before judging a path", () => {
    const facts = { root: "C:\\Work\\App", platform: "win32" as const };
    expect(pathsInCommand("cat /c/Work/App/.agents/rules/grilling.md", facts)).toEqual([
      ".agents/rules/grilling.md",
    ]);
    expect(pathsInCommand("cat .agents/rules/../../src/secret.ts", facts)).toEqual([]);
    expect(watchedPath("C:/Work/App/.qfai/assistant/./rule/a.md", facts)).toBe(
      ".qfai/assistant/rule/a.md",
    );
    expect(watchedPath("C:/Work/App/.agents/rules/../../src/a.ts", facts)).toBeNull();
  });

  it("keys a hook context by exact text first, else unregistered when it names QFAI", () => {
    expect(
      reminderKeys("For new requests the user wrote, use qfai-run to plan.", REMINDER_TEXTS),
    ).toEqual(["free-text-entry"]);
    expect(reminderKeys("QFAI token for user alice is wrong, see note", REMINDER_TEXTS)).toEqual([
      "unregistered",
    ]);
    expect(reminderKeys("The project's own reminder.", REMINDER_TEXTS)).toEqual([]);
  });

  it("keys each reminder a hook context holds inside other text", () => {
    const joined = [
      "UserPromptSubmit hook additional context: QFAI API budget (.agents/rules/api-budget.md). Ask git first.",
      "QFAI free-text entry: for each new request, invoke the qfai-run skill first.",
    ].join("\n\n");
    expect(reminderKeys(joined, REMINDER_TEXTS)).toEqual(["api-budget", "free-text-entry"]);
    // A listed text inside a longer listed text the context holds counts once, as the longer one.
    const nested = new Map([
      ["QFAI A: one.", "a-brief"],
      ["QFAI A: one. two.", "a"],
    ]);
    expect(reminderKeys("host: QFAI A: one. two.", nested)).toEqual(["a"]);
    expect(reminderKeys("host: QFAI A: one. two. QFAI A: one.", nested)).toEqual(["a", "a-brief"]);
    // An empty listed text matches nothing.
    expect(reminderKeys("QFAI token words", new Map([["", "empty"]]))).toEqual(["unregistered"]);
  });

  it("keys an unlisted wording by the reminder that opens the same way, or their shared key", () => {
    const texts = reminderIndex([
      ["api-budget", "QFAI API budget (.agents/rules/api-budget.md). Ask git first."],
      ["grilling-plan", "QFAI grilling (.agents/rules/grilling.md): ask first."],
      ["grilling-delegation", "QFAI grilling (.agents/rules/grilling.md): ask first."],
      ["grilling-design-artifact", "QFAI grilling (.agents/rules/grilling.md): ask first."],
      ["install-check", "QFAI install check: run the install."],
    ]);
    // One text several hooks show counts under the part of their keys they share.
    expect(texts.get("QFAI grilling (.agents/rules/grilling.md): ask first.")).toBe("grilling");
    expect(
      reminderKeys("QFAI API budget (.agents/rules/api-budget.md): older words.", texts),
    ).toEqual(["api-budget"]);
    expect(reminderKeys("QFAI grilling (.agents/rules/grilling.md): older words.", texts)).toEqual([
      "grilling",
    ]);
    expect(reminderKeys("QFAI install check: older words.", texts)).toEqual(["install-check"]);
    expect(reminderKeys("QFAI retired rule: words.", texts)).toEqual(["unregistered"]);
    // A context that names no rule after `QFAI` is like no listed text, not even a brief one.
    expect(reminderKeys("QFAI (legacy) reminder", REMINDER_TEXTS)).toEqual(["unregistered"]);
    expect(reminderKeys("QFAI . x", REMINDER_TEXTS)).toEqual(["unregistered"]);
    // A key that is the other's leading words is their shared key.
    expect(
      reminderIndex([
        ["grilling", "QFAI y."],
        ["grilling-plan", "QFAI y."],
      ]).get("QFAI y."),
    ).toBe("grilling");
    // Keys that share no leading word are all named.
    expect(
      reminderIndex([
        ["b-one", "QFAI x."],
        ["a-two", "QFAI x."],
      ]).get("QFAI x."),
    ).toBe("a-two+b-one");
  });

  it("reads a qfai command's status from an echo of it right after the command", () => {
    expect(
      echoedStatus('npx qfai validate; echo "exit=$?"', "validate: 0 findings\nexit=1\n"),
    ).toBe(1);
    expect(echoedStatus("cd app && npx qfai workflow plan\necho $?", "plan\n0")).toBe(0);
    expect(echoedStatus("npx qfai validate; echo ${?}", "2")).toBe(2);
    expect(echoedStatus('npx qfai validate; echo "status: $LASTEXITCODE"', "status: 3")).toBe(3);
    // The status is unknown when the echo is not right after qfai, cannot expand, or did not print.
    expect(echoedStatus('npx qfai validate | tail -5; echo "exit=$?"', "exit=0")).toBeNull();
    expect(echoedStatus("npx qfai validate; echo 'exit=$?'", "exit=$?")).toBeNull();
    expect(echoedStatus('npx qfai validate; echo "exit=$?"', "exit=0\nmore")).toBeNull();
    expect(echoedStatus('npx qfai validate; echo "done"', "done")).toBeNull();
    expect(echoedStatus('npx qfai validate; echo "$? $?"', "1 1")).toBeNull();
    expect(echoedStatus("npx qfai validate; echo -n $?", "1")).toBeNull();
    // After `&` the status is the background start's, and after `||` the echo may not have run.
    expect(echoedStatus('npx qfai validate & echo "exit=$?"', "exit=0")).toBeNull();
    expect(echoedStatus("npx qfai validate || echo $?", "Found 3 issues\n3")).toBeNull();
    expect(echoedStatus("npx qfai validate && echo $?", "ok\n0")).toBe(0);
    expect(
      summarise(
        {
          ...emptyEvents(),
          calls: [{ id: "x", name: "Bash", command: 'npx qfai validate; echo "exit=$?"' }],
          results: [{ id: "x", isError: false, text: "found\nexit=1", exitCode: 0 }],
        },
        FACTS,
      ).qfaiCommands,
    ).toEqual([{ command: "qfai validate", runs: 1, exits: [{ name: "1", count: 1 }] }]);
  });

  it("matches English correction words whole, so a longer word is not one", () => {
    expect(correctionWords("Unstoppable and wrongful")).toEqual([]);
    expect(correctionWords("I said DO   NOT do that")).toEqual(["do not", "i said"]);
  });
});

// QFAI:EX-0001-0294-16
describe("what the report may carry", () => {
  const context = { root: "/home/dev/app", home: "/home/dev", platform: "linux" as const };

  it("writes the root and the home directory as placeholders", () => {
    expect(redact("/home/dev/app/.agents/rules/a.md and /home/dev/.claude", context)).toBe(
      "<root>/.agents/rules/a.md and ~/.claude",
    );
    expect(
      redact("C:\\Users\\Dev\\App\\x", {
        root: "c:/users/dev/app",
        home: "c:/users/dev",
        platform: "win32",
      }),
    ).toBe("<root>\\x");
  });

  it("replaces the root and home only at a path-segment boundary, and the Git Bash form on Windows", () => {
    expect(redact("/home/dev/app2/x and /home/developer/y", context)).toBe(
      "~/app2/x and /home/developer/y",
    );
    expect(
      redact("cat /c/Users/Dev/App/x", {
        root: "C:\\Users\\Dev\\App",
        home: "C:\\Users\\Dev",
        platform: "win32",
      }),
    ).toBe("cat <root>/x");
  });

  it("keeps a heading and a table cell on one line whatever a transcript string holds", () => {
    const events: SessionEvents = {
      records: 1,
      malformed: 0,
      hookContexts: [],
      calls: [{ id: "x", name: "tool\n## injected | cell" }],
      results: [{ id: "x", isError: true, text: "", exitCode: null }],
      userTurns: [],
    };
    const rendered = renderMarkdown(
      [{ agent: "codex", sessionId: "id\n# also", signals: summarise(events, FACTS) }],
      (text) => text,
    );
    expect(rendered).toContain("## codex-id # also\n");
    expect(rendered).toContain("| tool ## injected \\| cell | 1 | - |");
    expect(rendered).not.toMatch(/^## injected/m);
  });

  it("blanks every secret shape in the fixed set", () => {
    // Built at run time so no token-shaped literal sits in the repository.
    const samples = [
      `gh${"p"}_${"A".repeat(36)}`,
      `s${"k"}-${"b".repeat(24)}`,
      `AKI${"A"}${"C".repeat(16)}`,
      `ASI${"A"}${"D".repeat(16)}`,
      `github${"_"}pat_${"E".repeat(30)}`,
      `xo${"x"}b-${"1".repeat(12)}`,
      `ey${"J"}hbGciOi.eyJzdWIiOi.c2lnbmF0dXJl`,
      `Bearer ${"t".repeat(20)}`,
      `-----BEGIN ${"PRIVATE"} KEY-----\nabc\n-----END ${"PRIVATE"} KEY-----`,
      `password=${"hunter2"}`,
      `dev${"@"}example.com`,
    ];
    for (const sample of samples) {
      expect(redact(`before ${sample} after`, context), sample).toBe("before [redacted] after");
    }
  });

  it("emits no message text, and redacts a token a tool name carries", () => {
    const token = `gh${"p"}_${"Z".repeat(36)}`;
    const events: SessionEvents = {
      records: 3,
      malformed: 0,
      hookContexts: [],
      calls: [{ id: "x", name: `mcp__${token}__tool` }],
      results: [
        { id: "x", isError: true, text: "the secret plan in /home/dev/app/src", exitCode: null },
      ],
      userTurns: ["My private message: this is wrong."],
    };
    const sessions = [
      { agent: "claude" as const, sessionId: "s1", signals: summarise(events, FACTS) },
    ];
    const clean = (text: string): string => redact(text, context);
    for (const rendered of [renderJson(sessions, clean), renderMarkdown(sessions, clean)]) {
      expect(rendered).not.toContain("private message");
      expect(rendered).not.toContain("secret plan");
      expect(rendered).not.toContain(token);
      expect(rendered).toContain("mcp__[redacted]__tool");
      expect(rendered).toContain("wrong");
    }
  });
});

// QFAI:EX-0001-0294-18
describe("the same transcripts give the same bytes", () => {
  it("reports byte-identically whatever order the directories are listed in", async () => {
    const base = await tempDir();
    const root = path.join(base, "project");
    const env = environment(base);
    const slug = claudeProjectSlug(root);
    const stamp = new Date("2026-11-01T00:00:00Z");
    const body = await fixtureFor(CLAUDE_FIXTURE, root);
    for (const id of ["b-session", "a-session", "c-session"]) {
      await place(path.join(base, "claude", "projects", slug, `${id}.jsonl`), body, stamp);
    }
    const reversed = async (dir: string): Promise<string[]> => (await readdir(dir)).reverse();
    const shuffled = async (dir: string): Promise<string[]> => {
      const names = await readdir(dir);
      return [...names.slice(1), ...names.slice(0, 1)];
    };

    const reports: string[] = [];
    for (const list of [reversed, shuffled]) {
      const located = await locateSessions(root, ["claude", "codex"], env, list);
      const sessions = await Promise.all(
        located.map(async (session) => ({
          agent: session.agent,
          sessionId: session.sessionId,
          signals: summarise(await parseClaudeTranscript(session.file), { ...FACTS, root }),
        })),
      );
      const clean = (text: string): string =>
        redact(text, { root, home: env.home, platform: env.platform });
      reports.push(renderMarkdown(sessions, clean) + renderJson(sessions, clean));
    }
    expect(reports[0]).toBe(reports[1]);
    expect(reports[0]).toMatch(
      /## claude-a-session[\s\S]*## claude-b-session[\s\S]*## claude-c-session/,
    );
    expect(reports[0]).not.toMatch(/\d{2}:\d{2}:\d{2}|2026-/);
  });
});

/** The events a run of Codex rollout records leaves. */
function codexEvents(records: Record<string, unknown>[]): SessionEvents {
  const events = emptyEvents();
  for (const record of records) readCodexRecord(record, events);
  return events;
}

function codexCall(name: string, id: string, args: Record<string, unknown>) {
  return {
    type: "response_item",
    payload: { type: "function_call", name, call_id: id, arguments: JSON.stringify(args) },
  };
}

function codexOutput(id: string, output: unknown) {
  return { type: "response_item", payload: { type: "function_call_output", call_id: id, output } };
}

function commandExecution(id: string, status: string, exitCode?: number) {
  return {
    type: "event_msg",
    payload: {
      type: "item_completed",
      item: {
        type: "CommandExecution",
        id,
        command: ["bash", "-lc", "npx qfai validate"],
        status,
        ...(exitCode === undefined ? {} : { exit_code: exitCode }),
      },
    },
  };
}

// QFAI:EX-0001-0294-10
// QFAI:EX-0001-0294-11
// QFAI:EX-0001-0294-12
// QFAI:EX-0001-0294-14
describe("the gaps a host's record shapes and a shell line's syntax leave", () => {
  it("counts text the user typed beside a tool result in one Claude Code record", () => {
    const events = emptyEvents();
    readClaudeRecord(
      {
        type: "user",
        toolUseResult: { stdout: "ok" },
        message: {
          role: "user",
          content: [
            { type: "tool_result", tool_use_id: "t1", content: "ok" },
            { type: "text", text: "<system-reminder>note</system-reminder>" },
            { type: "text", text: "Wrong file, use the other one." },
          ],
        },
      },
      events,
    );
    readClaudeRecord({ type: "user", message: { role: "user", content: "Now stop." } }, events);
    expect(events.results).toEqual([expect.objectContaining({ id: "t1", isError: false })]);
    expect(events.userTurns).toEqual(["Wrong file, use the other one.", "Now stop."]);
    expect(summarise(events, FACTS).corrections).toEqual([
      { turn: 1, words: ["wrong"] },
      { turn: 2, words: ["stop"] },
    ]);
  });

  it("reads an unquoted # that starts a word as a comment to the end of its line", () => {
    expect(qfaiCommandsIn("echo ok # ignored; qfai validate")).toEqual([]);
    expect(qfaiCommandsIn("# npx qfai doctor\nnpx qfai validate # why")).toEqual(["qfai validate"]);
    expect(qfaiCommandsIn("echo a#b; npx qfai report")).toEqual(["qfai report"]);
    expect(qfaiCommandsIn("echo '# x'; npx qfai report")).toEqual(["qfai report"]);
    expect(qfaiCommandsIn("echo \\ #x; npx qfai report")).toEqual(["qfai report"]);
    expect(qfaiCommandsIn("echo \\;#x; npx qfai report")).toEqual(["qfai report"]);
  });

  it("counts qfai run through yarn and yarn exec, as a Plug'n'Play project runs it", () => {
    expect(qfaiCommandsIn("yarn qfai validate")).toEqual(["qfai validate"]);
    expect(qfaiCommandsIn("yarn exec qfai workflow plan")).toEqual(["qfai workflow plan"]);
  });

  it("splits a shell line at a background &, never at one inside a redirection", () => {
    const events = (command: string): SessionEvents => ({
      ...emptyEvents(),
      calls: [{ id: "x", name: "Bash", command }],
      results: [{ id: "x", isError: false, text: "", exitCode: 0 }],
    });
    for (const command of [
      "npx qfai validate 2>&1",
      "npx qfai validate &> log.txt",
      "npx qfai validate >log.txt 2>&1",
    ]) {
      expect(summarise(events(command), FACTS).qfaiCommands, command).toEqual([
        { command: "qfai validate", runs: 1, exits: [{ name: "0", count: 1 }] },
      ]);
    }
    expect(qfaiCommandsIn("npx qfai doctor & npx qfai report")).toEqual([
      "qfai doctor",
      "qfai report",
    ]);
  });

  it("counts a Codex read_file call on a rule file as a read, with its result bytes", () => {
    const events = codexEvents([
      codexCall("read_file", "r1", { file_path: "/work/app/.agents/rules/grilling.md" }),
      codexOutput("r1", "# Grilling"),
      codexCall("read_file", "r2", { path: ".agents/rules/grilling.md" }),
      codexOutput("r2", "Exit code: 1"),
    ]);
    expect(summarise(events, FACTS).reads).toEqual([
      { path: ".agents/rules/grilling.md", reads: 2, repeats: 1, bytes: 22 },
    ]);
    expect(summarise(events, FACTS).toolErrors).toEqual([]);
  });

  it("reads a Codex status line only from the header above the output", () => {
    const status = (output: string) =>
      codexEvents([
        codexCall("shell_command", "s", { command: "npx qfai validate" }),
        codexOutput("s", output),
      ]).results[0];
    expect(status("Exit code: 1\nWall time: 0.2 seconds\nOutput:\nboom")).toEqual(
      expect.objectContaining({ isError: true, exitCode: 1 }),
    );
    expect(
      status(
        "Chunk ID: a1\nWall time: 0.1 seconds\nProcess exited with code 0\nOutput:\nExit code: 1",
      ),
    ).toEqual(expect.objectContaining({ isError: false, exitCode: 0 }));
    expect(status("a log line\nExit code: 1")).toEqual(
      expect.objectContaining({ isError: false, exitCode: null }),
    );
  });

  it("takes a Codex command's status from its execution event, tied to its call", () => {
    const script = codexEvents([
      {
        type: "response_item",
        payload: {
          type: "custom_tool_call",
          name: "exec",
          call_id: "outer",
          input: 'text((await tools.exec_command({cmd:"npx qfai validate"})).output);',
        },
      },
      commandExecution("inner", "failed", 2),
      {
        type: "response_item",
        payload: { type: "custom_tool_call_output", call_id: "outer", output: "Script completed" },
      },
    ]);
    expect(script.results).toEqual([
      expect.objectContaining({ id: "outer", isError: true, exitCode: 2 }),
    ]);
    expect(summarise(script, FACTS).qfaiCommands).toEqual([
      { command: "qfai validate", runs: 1, exits: [{ name: "2", count: 1 }] },
    ]);
    expect(summarise(script, FACTS).toolErrors).toEqual([{ tool: "exec", count: 1, codes: [] }]);

    const late = codexEvents([
      codexCall("exec_command", "c", { cmd: "npx qfai doctor" }),
      codexOutput("c", "done"),
      commandExecution("c", "completed", 0),
    ]);
    expect(late.results).toEqual([expect.objectContaining({ isError: false, exitCode: 0 })]);

    const legacy = codexEvents([
      codexCall("exec_command", "l", { cmd: "npx qfai doctor" }),
      {
        type: "event_msg",
        payload: { type: "exec_command_end", call_id: "l", exit_code: 1, status: "failed" },
      },
      codexOutput("l", "done"),
    ]);
    expect(legacy.results).toEqual([expect.objectContaining({ isError: true, exitCode: 1 })]);
  });

  it("ties an execution to no call it cannot name: a stale script, a user's command, a file read", () => {
    const failedEnd = (id: string, source?: string) => ({
      type: "event_msg",
      payload: {
        type: "exec_command_end",
        call_id: id,
        exit_code: 3,
        status: "failed",
        ...(source === undefined ? {} : { source }),
      },
    });
    const stale = codexEvents([
      {
        type: "response_item",
        payload: {
          type: "custom_tool_call",
          name: "exec",
          call_id: "old",
          input: 'await tools.exec_command({cmd:"npx qfai doctor"});',
        },
      },
      codexCall("shell_command", "s1", { command: "ls" }),
      failedEnd("zzz"),
      {
        type: "response_item",
        payload: { type: "custom_tool_call_output", call_id: "old", output: "Script completed" },
      },
    ]);
    expect(stale.calls[0]?.executions).toBeUndefined();
    expect(stale.results).toEqual([expect.objectContaining({ id: "old", isError: false })]);

    const user = codexEvents([
      codexCall("exec_command", "u", { cmd: "npx qfai doctor" }),
      failedEnd("u", "user_shell"),
      codexOutput("u", "done"),
    ]);
    expect(user.results).toEqual([expect.objectContaining({ isError: false, exitCode: null })]);

    const read = codexEvents([
      codexCall("read_file", "r", { path: "notes.txt" }),
      codexOutput("r", "hi"),
      failedEnd("r"),
    ]);
    expect(read.results).toEqual([expect.objectContaining({ isError: false, exitCode: null })]);
  });
});

// QFAI:EX-0001-0294-16
describe("what the report may carry from the hosts' configured directories", () => {
  it("writes the configured transcript directories as placeholders", () => {
    expect(
      redact("/srv/claude/projects/x.jsonl and /opt/codex/sessions and /home/dev/.codex", {
        root: "/work/app",
        home: "/home/dev",
        claudeConfigDir: "/srv/claude",
        codexHome: "/opt/codex/",
        platform: "linux",
      }),
    ).toBe("$CLAUDE_CONFIG_DIR/projects/x.jsonl and $CODEX_HOME/sessions and ~/.codex");
  });

  it("replaces a configured directory only where a path starts and ends", () => {
    expect(
      redact("/prefix/srv/claude/x and /srv/claude/x", {
        root: "/work/app",
        home: "/home/dev",
        claudeConfigDir: "/srv/claude",
        platform: "linux",
      }),
    ).toBe("/prefix/srv/claude/x and $CLAUDE_CONFIG_DIR/x");
  });
});
