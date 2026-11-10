/**
 * `qfai session-review` from the command line: which sessions it picks, where the report goes,
 * and how it exits. The hosts' homes point at a temporary directory, so no real transcript is read.
 */
// QFAI:AC-0001-0240-01
// QFAI:AC-0001-0240-02
// QFAI:AC-0001-0240-03
// QFAI:AC-0001-0240-04
// QFAI:AC-0001-0240-05

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

beforeEach(() => {
  // The command must never reach the network: any fetch fails the run.
  vi.stubGlobal("fetch", () => {
    throw new Error("session-review must not use the network");
  });
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

// QFAI:EX-0001-0240-05
// QFAI:EX-0001-0240-06
// QFAI:EX-0001-0240-07
// QFAI:EX-0001-0240-08
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

  it("reports a named session or the sessions since a date", async () => {
    const setup = await project();
    await sessions(setup);

    const named = await cli(
      ["session-review", "--root", setup.root, "--session", "older"],
      setup.root,
    );
    expect(named.code).toBe(0);
    expect(named.out).toContain("## claude-older");
    expect(named.out).not.toContain("claude-newer");

    const since = await cli(
      ["session-review", "--root", setup.root, "--since", "2026-11-01"],
      setup.root,
    );
    expect(since.out).toContain("## claude-newer");
    expect(since.out).toContain(`## codex-${CODEX_ID}`);
    expect(since.out).not.toContain("claude-older");
  });

  it("refuses an unknown session, --session with --since, and a --since that is no date", async () => {
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

// QFAI:EX-0001-0240-09
// QFAI:EX-0001-0240-12
describe("qfai session-review counts what the sessions show", () => {
  it("keys a reminder by the project's reminders.json and counts the qfai commands", async () => {
    const setup = await project();
    await sessions(setup);
    const reminders = {
      "structured-question": {
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext:
            "QFAI user questions (.agents/rules/user-questions.md): ask only when the next step needs it.",
        },
      },
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
    expect(JSON.parse(result.out)).toMatchObject({
      sessions: [
        {
          name: "claude-newer",
          malformedLines: 2,
          reminders: [
            { name: "api-budget", count: 2 },
            { name: "structured-question", count: 1 },
          ],
          qfaiCommands: [{ command: "qfai validate", runs: 2 }],
          questions: { calls: 1, items: 3 },
        },
      ],
    });
  });
});

// QFAI:EX-0001-0240-16
// QFAI:EX-0001-0240-17
// QFAI:EX-0001-0240-18
describe("qfai session-review keeps the transcript on this machine", () => {
  it("runs with the network unavailable and prints no message text or local path", async () => {
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

  it("imports no network module anywhere in the command", async () => {
    const sources = [
      path.join(here, "..", "..", "src", "cli", "commands", "sessionReview.ts"),
      ...(await readdir(path.join(here, "..", "..", "src", "core", "sessionReview"))).map((name) =>
        path.join(here, "..", "..", "src", "core", "sessionReview", name),
      ),
    ];
    for (const source of sources) {
      const text = await readFile(source, "utf-8");
      expect(text, source).not.toMatch(/from "node:(?:http|https|net|tls|dgram|dns)"|\bfetch\(/);
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
