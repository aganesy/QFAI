/**
 * `qfai session-review` core: where transcripts are found, what is counted in them, and what the
 * report may carry. The fixtures are synthetic transcripts in each host's record shape.
 */
import { mkdir, mkdtemp, readdir, readFile, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { SessionEvents } from "../../src/core/sessionReview/events.js";
import {
  claudeProjectSlug,
  locateSessions,
  sameDirectory,
  type LocateEnvironment,
} from "../../src/core/sessionReview/locate.js";
import { parseClaudeTranscript } from "../../src/core/sessionReview/parseClaude.js";
import { parseCodexTranscript } from "../../src/core/sessionReview/parseCodex.js";
import { redact } from "../../src/core/sessionReview/redact.js";
import { renderJson, renderMarkdown } from "../../src/core/sessionReview/render.js";
import {
  correctionWords,
  pathsInCommand,
  qfaiCommandsIn,
  summarise,
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
  ["QFAI API budget (.agents/rules/api-budget.md): ask git first, then REST.", "api-budget"],
  [
    "QFAI user questions (.agents/rules/user-questions.md): ask only when needed.",
    "structured-question",
  ],
  ["QFAI grilling (.agents/rules/grilling.md): one.", "grilling-plan"],
  ["QFAI grilling (.agents/rules/grilling.md): two.", "grilling-delegation"],
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

// QFAI:EX-0001-0240-01
// QFAI:EX-0001-0240-02
// QFAI:EX-0001-0240-03
// QFAI:EX-0001-0240-04
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

  it("falls back to the transcript whose recorded cwd is the root when no directory has its name", async () => {
    const base = await tempDir();
    const root = path.join(base, "project");
    const env = environment(base);
    await place(
      path.join(base, "claude", "projects", "shortened-name", "found.jsonl"),
      await fixtureFor(CLAUDE_FIXTURE, root),
    );
    await place(
      path.join(base, "claude", "projects", "another", "elsewhere.jsonl"),
      await fixtureFor(CLAUDE_FIXTURE, path.join(base, "elsewhere")),
    );

    const found = await locateSessions(root, ["claude"], env);
    expect(found.map((session) => session.sessionId)).toEqual(["found"]);
  });

  it("matches the recorded cwd with other letter case and slashes on Windows", async () => {
    const base = await tempDir();
    const root = path.join(base, "Project");
    const env = { ...environment(base), platform: "win32" as const };
    const recorded = root.toLowerCase().replace(/\\/g, "/");
    await place(
      path.join(base, "claude", "projects", "other-name", "cased.jsonl"),
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

// QFAI:EX-0001-0240-09
// QFAI:EX-0001-0240-10
// QFAI:EX-0001-0240-11
// QFAI:EX-0001-0240-12
// QFAI:EX-0001-0240-13
// QFAI:EX-0001-0240-14
// QFAI:EX-0001-0240-15
describe("what a Claude Code transcript shows", () => {
  async function claudeSignals(): Promise<ReturnType<typeof summarise>> {
    return summarise(await parseClaudeTranscript(CLAUDE_FIXTURE), FACTS);
  }

  it("counts each QFAI reminder under its key and leaves the project's own hook context out", async () => {
    expect((await claudeSignals()).reminders).toEqual([
      { name: "api-budget", count: 2 },
      { name: "structured-question", count: 1 },
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

  it("lists each qfai command with its exit status, and a skill name is no command", async () => {
    expect((await claudeSignals()).qfaiCommands).toEqual([
      {
        command: "qfai validate",
        runs: 2,
        exits: [
          { name: "0", count: 1 },
          { name: "1", count: 1 },
        ],
      },
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

describe("what a Codex rollout shows", () => {
  it("counts the hook context, the shell-named rule file, the failed call and the questions", async () => {
    const signals = summarise(await parseCodexTranscript(CODEX_FIXTURE), FACTS);
    expect(signals.records).toBe(13);
    expect(signals.malformed).toBe(1);
    expect(signals.reminders).toEqual([{ name: "api-budget", count: 1 }]);
    expect(signals.reads.map((read) => [read.path, read.reads])).toEqual([
      [".agents/rules/grilling.md", 1],
    ]);
    expect(signals.toolErrors).toEqual([
      { tool: "exec_command", count: 1, codes: [{ name: "QFAI-SCAN-002", count: 1 }] },
    ]);
    expect(signals.qfaiCommands).toEqual([
      { command: "qfai validate", runs: 1, exits: [{ name: "1", count: 1 }] },
    ]);
    expect(signals.questions).toEqual({ calls: 1, items: 2 });
    expect(signals.typedTurns).toBe(2);
    expect(signals.corrections).toEqual([{ turn: 2, words: ["revert", "stop"] }]);
  });
});

describe("the signal helpers", () => {
  it("reads a watched path named under the root in either slash style, never one a patch writes", () => {
    const facts = { root: "C:\\Work\\App", platform: "win32" as const };
    expect(pathsInCommand("type c:\\work\\app\\.claude\\rules\\scoped\\a.md", facts)).toEqual([
      ".claude/rules/scoped/a.md",
    ]);
    expect(pathsInCommand("cat ./.agents/rules/*.md .agents/rules/", facts)).toEqual([]);
    expect(pathsInCommand("apply_patch .agents/rules/a.md", facts)).toEqual([]);
  });

  it("matches English correction words whole, so a longer word is not one", () => {
    expect(correctionWords("Unstoppable and wrongful")).toEqual([]);
    expect(correctionWords("I said DO   NOT do that")).toEqual(["do not", "i said"]);
  });
});

// QFAI:EX-0001-0240-16
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

  it("blanks every secret shape in the fixed set", () => {
    // Built at run time so no token-shaped literal sits in the repository.
    const samples = [
      `gh${"p"}_${"A".repeat(36)}`,
      `s${"k"}-${"b".repeat(24)}`,
      `AKI${"A"}${"C".repeat(16)}`,
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

// QFAI:EX-0001-0240-18
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
