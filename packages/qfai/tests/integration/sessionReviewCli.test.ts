/**
 * `qfai session-review` from the command line: which sessions it picks, where the report goes,
 * and how it exits. The hosts' homes point at a temporary directory, so no real transcript is read.
 */
// QFAI:AC-0001-0294-01
// QFAI:AC-0001-0294-02
// QFAI:AC-0001-0294-03
// QFAI:AC-0001-0294-04
// QFAI:AC-0001-0294-05

import { mkdir, mkdtemp, readdir, readFile, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { parseArgs } from "../../src/cli/lib/args.js";
import { run } from "../../src/cli/main.js";
import { claudeProjectSlug } from "../../src/core/sessionReview/locate.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(here, "..", "fixtures", "session-transcripts");
const FIXTURE_ROOT = "/work/app";
const CODEX_ID = "0199aaaa-bbbb-7ccc-8ddd-eeeeffff0000";

const tempDirs: string[] = [];
const savedEnv = { claude: process.env.CLAUDE_CONFIG_DIR, codex: process.env.CODEX_HOME };

type Setup = { base: string; root: string };

async function project(): Promise<Setup> {
  const base = await mkdtemp(path.join(os.tmpdir(), "qfai-session-review-cli-"));
  tempDirs.push(base);
  const root = path.join(base, "project");
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, "qfai.config.yaml"), "paths: {}\n", "utf-8");
  process.env.CLAUDE_CONFIG_DIR = path.join(base, "claude");
  process.env.CODEX_HOME = path.join(base, "codex");
  return { base, root };
}

async function transcript(fixture: string, root: string): Promise<string> {
  const text = await readFile(path.join(FIXTURES, fixture), "utf-8");
  return text.split(FIXTURE_ROOT).join(JSON.stringify(root).slice(1, -1));
}

async function place(file: string, body: string, when: string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body, "utf-8");
  await utimes(file, new Date(when), new Date(when));
}

/** Two Claude Code sessions, an older and a newer, and one Codex session of the root. */
async function sessions(setup: Setup): Promise<void> {
  const claudeDir = path.join(setup.base, "claude", "projects", claudeProjectSlug(setup.root));
  const claude = await transcript(path.join("claude", "session.jsonl"), setup.root);
  await place(path.join(claudeDir, "older.jsonl"), claude, "2026-10-01T00:00:00Z");
  await place(path.join(claudeDir, "newer.jsonl"), claude, "2026-11-05T00:00:00Z");
  await place(
    path.join(
      setup.base,
      "codex",
      "sessions",
      "2026",
      "11",
      "06",
      `rollout-2026-11-06T00-00-00-${CODEX_ID}.jsonl`,
    ),
    await transcript(path.join("codex", "rollout.jsonl"), setup.root),
    "2026-11-06T00:00:00Z",
  );
}

/** Run the CLI and keep what it printed. */
async function cli(
  args: string[],
  cwd: string,
): Promise<{ code: number; out: string; err: string }> {
  const out: string[] = [];
  const err: string[] = [];
  const stdout = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    out.push(String(chunk));
    return true;
  });
  const stderr = vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    err.push(String(chunk));
    return true;
  });
  process.exitCode = undefined;
  try {
    await run(args, cwd);
  } finally {
    stdout.mockRestore();
    stderr.mockRestore();
  }
  const code = Number(process.exitCode ?? 0);
  process.exitCode = undefined;
  return { code, out: out.join(""), err: err.join("") };
}

// The command must never reach the network: every client it could use throws.
const refuse = vi.hoisted(() => (): never => {
  throw new Error("session-review must not use the network");
});
vi.mock("node:http", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const blocked = { request: refuse, get: refuse };
  return { ...actual, ...blocked, default: { ...actual, ...blocked } };
});
vi.mock("node:https", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const blocked = { request: refuse, get: refuse };
  return { ...actual, ...blocked, default: { ...actual, ...blocked } };
});
vi.mock("node:net", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const blocked = { connect: refuse, createConnection: refuse };
  return { ...actual, ...blocked, default: { ...actual, ...blocked } };
});
vi.mock("node:tls", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const blocked = { connect: refuse };
  return { ...actual, ...blocked, default: { ...actual, ...blocked } };
});

beforeEach(() => {
  vi.stubGlobal("fetch", refuse);
});

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  process.env.CLAUDE_CONFIG_DIR = savedEnv.claude;
  process.env.CODEX_HOME = savedEnv.codex;
  if (savedEnv.claude === undefined) delete process.env.CLAUDE_CONFIG_DIR;
  if (savedEnv.codex === undefined) delete process.env.CODEX_HOME;
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

// QFAI:EX-0001-0294-05
// QFAI:EX-0001-0294-06
// QFAI:EX-0001-0294-07
// QFAI:EX-0001-0294-08
describe("qfai session-review chooses the sessions and the destination", () => {
  it("reports the latest session of each agent by default, and one agent with --agent", async () => {
    const setup = await project();
    await sessions(setup);

    const all = await cli(["session-review", "--root", setup.root], setup.root);
    expect(all.code).toBe(0);
    expect(all.out).toContain("## claude-newer");
    expect(all.out).toContain(`## codex-${CODEX_ID}`);
    expect(all.out).not.toContain("claude-older");

    const claudeOnly = await cli(
      ["session-review", "--root", setup.root, "--agent", "claude", "--format", "json"],
      setup.root,
    );
    const parsed: unknown = JSON.parse(claudeOnly.out);
    expect(parsed).toMatchObject({ sessions: [{ name: "claude-newer", agent: "claude" }] });
  });

  it("reports a named session or the sessions since a date or an instant", async () => {
    const setup = await project();
    await sessions(setup);

    const named = await cli(
      ["session-review", "--root", setup.root, "--session", "older"],
      setup.root,
    );
    expect(named.code).toBe(0);
    expect(named.out).toContain("## claude-older");
    expect(named.out).not.toContain("claude-newer");

    // A date alone is midnight UTC; a date and time carries its own offset.
    for (const since of ["2026-11-01", "2026-11-01T09:00:00+09:00"]) {
      const result = await cli(
        ["session-review", "--root", setup.root, "--since", since],
        setup.root,
      );
      expect(result.out, since).toContain("## claude-newer");
      expect(result.out, since).toContain(`## codex-${CODEX_ID}`);
      expect(result.out, since).not.toContain("claude-older");
    }

    const none = await cli(
      ["session-review", "--root", setup.root, "--since", "2026-12-01"],
      setup.root,
    );
    expect(none.code).toBe(0);
    expect(none.out.trim()).toBe(
      "qfai session-review: no session of this project changed at or after 2026-12-01.",
    );
  });

  it("refuses an unknown session, --session with --since, and a --since that is not ISO 8601 with a zone", async () => {
    const setup = await project();
    await sessions(setup);

    const unknown = await cli(
      ["session-review", "--root", setup.root, "--session", "nope"],
      setup.root,
    );
    expect(unknown.code).toBe(2);
    expect(unknown.err).toContain("no transcript of session nope");

    for (const args of [
      ["--session", "older", "--since", "2026-11-01"],
      ["--since", "not-a-date"],
      ["--since", "1"],
      ["--since", "Nov 1"],
      ["--since", "2026-11-01T00:00"],
      ["--since", "2026-02-30"],
      ["--agent", "copilot"],
      ["--format", "text"],
    ]) {
      const refused = await cli(["session-review", "--root", setup.root, ...args], setup.root);
      expect(refused.code, args.join(" ")).toBe(2);
    }
    expect(parseArgs(["validate", "--since", "2026-11-01"], setup.root).invalid).toBe(true);
  });

  it("says so in one line and exits 0 when no transcript belongs to the root", async () => {
    const setup = await project();
    const result = await cli(["session-review", "--root", setup.root], setup.root);
    expect(result.code).toBe(0);
    expect(result.out.trim()).toBe(
      "qfai session-review: no session transcript of this project was found.",
    );
    expect(await readdir(setup.root)).toEqual(["qfai.config.yaml"]);
  });

  it("writes the report to --out relative to the root and to no other file", async () => {
    const setup = await project();
    await sessions(setup);

    const printed = await cli(["session-review", "--root", setup.root], setup.root);
    expect(await readdir(setup.root)).toEqual(["qfai.config.yaml"]);

    const written = await cli(
      ["session-review", "--root", setup.root, "--out", "report.md"],
      setup.root,
    );
    expect(written.code).toBe(0);
    expect(written.out.trim()).toBe("qfai session-review: wrote report.md");
    expect((await readdir(setup.root)).sort()).toEqual(["qfai.config.yaml", "report.md"]);
    expect(await readFile(path.join(setup.root, "report.md"), "utf-8")).toBe(printed.out);
  });
});

// QFAI:EX-0001-0294-16
describe("qfai session-review redacts the paths it prints", () => {
  it("redacts the path in the --out message as it redacts every other string", async () => {
    const setup = await project();
    await sessions(setup);
    const name = `dev${"@"}example.com.md`;
    const written = await cli(
      ["session-review", "--root", setup.root, "--out", path.join("reports", name)],
      setup.root,
    );
    expect(written.code).toBe(0);
    expect(written.out.trim()).toBe("qfai session-review: wrote reports/[redacted]");
    expect(await readdir(path.join(setup.root, "reports"))).toEqual([name]);
  });

  // A path component longer than a POSIX file system allows makes the read fail with the path in
  // its message; Windows reports such a path as missing instead.
  it.skipIf(process.platform === "win32")(
    "names a configured transcript directory by its variable when it cannot be read",
    async () => {
      const setup = await project();
      process.env.CODEX_HOME = path.join(setup.base, "c".repeat(300));
      const result = await cli(["session-review", "--root", setup.root], setup.root);
      expect(result.code).toBe(1);
      expect(result.err).toContain("$CODEX_HOME");
      expect(result.err).not.toContain(setup.base);
    },
  );
});

// QFAI:EX-0001-0294-23
describe("qfai session-review exits 1 when a file is there but cannot be used", () => {
  it("exits 1 with no report when --out cannot be written, naming no local path", async () => {
    const setup = await project();
    await sessions(setup);
    const result = await cli(["session-review", "--root", setup.root, "--out", "."], setup.root);
    expect(result.code).toBe(1);
    expect(result.out).not.toContain("# Session review");
    expect(result.err).toMatch(/^qfai session-review: /);
    expect(result.err).not.toContain(setup.base);
  });

  it("exits 1 when the project's reminders.json is not a JSON object", async () => {
    const setup = await project();
    await sessions(setup);
    await mkdir(path.join(setup.root, ".agents", "rules"), { recursive: true });
    await writeFile(
      path.join(setup.root, ".agents", "rules", "reminders.json"),
      "{ broken",
      "utf-8",
    );
    const result = await cli(["session-review", "--root", setup.root], setup.root);
    expect(result.code).toBe(1);
    expect(result.err).toContain(".agents/rules/reminders.json is not valid JSON");
  });
});

// QFAI:EX-0001-0294-09
// QFAI:EX-0001-0294-12
// QFAI:EX-0001-0294-22
// QFAI:EX-0001-0294-25
describe("qfai session-review counts what the sessions show", () => {
  it("keys a reminder by the project's reminders.json and gives the JSON shape", async () => {
    const setup = await project();
    await sessions(setup);
    const reminders = {
      "api-budget": {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          additionalContext: "QFAI API budget (.agents/rules/api-budget.md). Ask git first.",
        },
      },
      "free-text-entry": {
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext:
            "QFAI free-text entry: for each new request, invoke the qfai-run skill first.",
        },
        briefContext: "For new requests the user wrote, use qfai-run to plan.",
      },
      // Two hooks that show one text count it under the part of their keys they share.
      ...Object.fromEntries(
        ["structured-question-plan", "structured-question-prompt"].map((key) => [
          key,
          {
            hookSpecificOutput: {
              hookEventName: "UserPromptSubmit",
              additionalContext:
                "QFAI user questions (.agents/rules/user-questions.md): ask only when the next step needs it.",
            },
            briefContext: "",
          },
        ]),
      ),
    };
    await mkdir(path.join(setup.root, ".agents", "rules"), { recursive: true });
    await writeFile(
      path.join(setup.root, ".agents", "rules", "reminders.json"),
      JSON.stringify(reminders),
      "utf-8",
    );

    const result = await cli(
      ["session-review", "--root", setup.root, "--agent", "claude", "--format", "json"],
      setup.root,
    );
    const parsed: unknown = JSON.parse(result.out);
    expect(parsed).toEqual({
      sessions: [
        {
          name: "claude-newer",
          agent: "claude",
          sessionId: "newer",
          records: 34,
          malformedLines: 2,
          typedTurns: 3,
          reminders: [
            { name: "api-budget", count: 2 },
            { name: "free-text-entry", count: 2 },
            { name: "structured-question", count: 1 },
            { name: "unregistered", count: 1 },
          ],
          reads: [
            { path: ".agents/rules/grilling.md", reads: 2, repeats: 1, bytes: 15 },
            { path: ".qfai/assistant/skill/qfai-run/SKILL.md", reads: 1, repeats: 0, bytes: 10 },
          ],
          toolErrors: [
            { tool: "Bash", count: 1, codes: [{ name: "QFAI-TRACE-002", count: 2 }] },
            { tool: "Edit", count: 1, codes: [] },
          ],
          qfaiCommands: [
            {
              command: "qfai validate",
              runs: 3,
              exits: [
                { name: "0", count: 1 },
                { name: "1", count: 1 },
                { name: "unknown", count: 1 },
              ],
            },
          ],
          questions: { calls: 1, items: 3 },
          corrections: [
            { turn: 2, words: ["instead", "wrong"] },
            // The third typed turn says "that is wrong" in Japanese.
            { turn: 3, words: [String.fromCodePoint(0x9055, 0x3046)] },
          ],
        },
      ],
    });
  });
});

/** Every source file `entry` reaches through relative imports. */
async function importGraph(entry: string): Promise<string[]> {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop();
    if (file === undefined || seen.has(file)) continue;
    seen.add(file);
    const text = await readFile(file, "utf-8");
    for (const match of text.matchAll(/from "(\.[^"]+)\.js"/g)) {
      if (match[1] !== undefined) queue.push(path.resolve(path.dirname(file), `${match[1]}.ts`));
    }
  }
  return [...seen].sort();
}

// QFAI:EX-0001-0294-16
// QFAI:EX-0001-0294-17
// QFAI:EX-0001-0294-18
describe("qfai session-review keeps the transcript on this machine", () => {
  it("runs with fetch and the network modules throwing, and prints no message text or local path", async () => {
    const setup = await project();
    await sessions(setup);

    const result = await cli(
      ["session-review", "--root", setup.root, "--format", "json"],
      setup.root,
    );
    expect(result.code).toBe(0);
    expect(result.out).not.toContain("Please add the export command");
    expect(result.out).not.toContain("a reference is missing");
    expect(result.out).not.toContain(setup.base);
    expect(result.out).toContain(".agents/rules/grilling.md");
  });

  it("imports no network module anywhere the command's source reaches", async () => {
    const sources = await importGraph(
      path.join(here, "..", "..", "src", "cli", "commands", "sessionReview.ts"),
    );
    expect(sources.length).toBeGreaterThan(5);
    for (const source of sources) {
      const text = await readFile(source, "utf-8");
      expect(text, source).not.toMatch(
        /["'](?:node:)?(?:http|https|http2|net|tls|dgram|dns|undici)["']/,
      );
      expect(text, source).not.toMatch(/\bfetch\s*\(/);
    }
  });

  it("prints byte-identical reports on two runs", async () => {
    const setup = await project();
    await sessions(setup);
    const first = await cli(["session-review", "--root", setup.root], setup.root);
    const second = await cli(["session-review", "--root", setup.root], setup.root);
    expect(second.out).toBe(first.out);
  });
});
