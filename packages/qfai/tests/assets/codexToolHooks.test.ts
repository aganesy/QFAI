/**
 * The tool-time reminders in the Codex hook file.
 *
 * Codex names its tools differently from Claude Code, so each group is matched
 * against the name Codex writes into the hook input: `apply_patch` for a file
 * edit, `spawn_agent` for a sub-agent, `Bash` for a shell command and
 * `mcp__<server>__<tool>` for an MCP tool. Codex hooks have no `if` condition,
 * so an entry that must stay quiet for some calls of its tool reads the call
 * from stdin itself. These tests run every such command with the input Codex
 * sends, through every shell this platform has: `sh`, and on Windows also
 * `cmd.exe /C` and PowerShell.
 */

import { createHash, randomUUID } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

import {
  API_BUDGET_HOOK_MARKER,
  DOCUMENTATION_CLARITY_HOOK_MARKER,
  GRILLING_DELEGATION_HOOK_MARKER,
  GRILLING_DESIGN_ARTIFACT_HOOK_MARKER,
  GRILLING_PLAN_HOOK_MARKER,
  MINIMAL_IMPLEMENTATION_HOOK_MARKER,
} from "../../src/core/claudeCodeHooks.js";
import {
  CODEX_SHELLS,
  type CodexShell,
  runCodexLine,
  runOnEveryShell,
} from "../helpers/codexHookShells.js";
import { EXIT_ZERO, spawnCaptured } from "../helpers/spawnCaptured.js";
import { removeTempTree } from "../helpers/tempTree.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const SHIPPED_MESSAGES = "packages/qfai/assets/init/root/.agents/rules/reminders.json";
const SHIPPED_SETTINGS = "packages/qfai/assets/init/.claude/settings.json";
const SHIPPED_CODEX = "packages/qfai/assets/init/.codex/hooks.json";
const TOOL_EVENTS = ["PreToolUse", "PostToolUse"] as const;
const ALL_EVENTS = ["UserPromptSubmit", ...TOOL_EVENTS] as const;
/** An entry's one line: `node -e`, its program in double quotes, and one message key. */
const LINE = /^node -e "([^"]*)" ([a-z-]+)$/;

type Entry = Record<string, unknown>;
type Group = { readonly matcher: unknown; readonly hooks: readonly Entry[] };

function asRecord(value: unknown, what: string): Entry {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${what} is not an object`);
  }
  return { ...value };
}

async function readGroups(rel: string, event: string): Promise<Group[]> {
  const parsed: unknown = JSON.parse(await readFile(path.join(repoRoot, rel), "utf-8"));
  const groups = asRecord(asRecord(parsed, rel).hooks, `${rel}: hooks`)[event];
  if (!Array.isArray(groups)) throw new Error(`${rel}: ${event} is not an array`);
  return groups.map((group: unknown) => {
    const record = asRecord(group, `${rel}: a ${event} group`);
    if (!Array.isArray(record.hooks)) throw new Error(`${rel}: a ${event} group has no entries`);
    return {
      matcher: record.matcher,
      hooks: record.hooks.map((entry: unknown) => asRecord(entry, `${rel}: an entry`)),
    };
  });
}

function markersOf(group: Group): string {
  return JSON.stringify(group.hooks.map((entry) => entry.statusMessage).sort());
}

function commandOf(entry: Entry): string {
  const command = entry.command;
  if (typeof command !== "string") throw new Error("entry has no command string");
  return command;
}

/** The program and the message key of an entry's line. */
function partsOf(entry: Entry): { readonly program: string; readonly key: string } {
  const match = LINE.exec(commandOf(entry));
  if (match === null) throw new Error(`not a one-line reader: ${commandOf(entry)}`);
  return { program: match[1] ?? "", key: match[2] ?? "" };
}

/** The message key a Codex entry passes to its reader, and the key a Claude Code entry does. */
function codexKey(entry: Entry): string {
  return partsOf(entry).key;
}
function claudeKey(entry: Entry): string | undefined {
  const args = entry.args;
  return Array.isArray(args) ? String(args.at(-1)) : undefined;
}

/** The one Codex entry under `event` that runs `key`. */
async function codexEntry(event: string, key: string): Promise<Entry> {
  const entries = (await readGroups(SHIPPED_CODEX, event))
    .flatMap((group) => group.hooks)
    .filter((entry) => codexKey(entry) === key);
  expect(entries, `no ${event} entry for ${key}`).toHaveLength(1);
  const entry = entries[0];
  if (entry === undefined) throw new Error(`no ${event} entry for ${key}`);
  return entry;
}

/** The hook input Codex writes to stdin for one tool call. */
function codexInput(
  event: string,
  toolName: string,
  command: string,
  sessionId: string | null = "s",
): string {
  return JSON.stringify({
    ...(sessionId === null ? {} : { session_id: sessionId }),
    turn_id: "t",
    transcript_path: null,
    cwd: "/project",
    hook_event_name: event,
    model: "m",
    permission_mode: "default",
    tool_name: toolName,
    tool_use_id: "call",
    tool_input: { command },
    ...(event === "PostToolUse" ? { tool_response: "" } : {}),
  });
}

/** A git repository holding the shipped message table, and a subdirectory of it to run from. */
async function withProject(run: (cwd: string) => Promise<void>): Promise<void> {
  const project = await mkdtemp(path.join(os.tmpdir(), "qfai-codex-tool-hooks-"));
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
    await run(subdirectory);
  } finally {
    await removeTempTree(project);
  }
}

/**
 * The event named in what the entry prints, or `null` when it prints nothing.
 *
 * Every shell this platform has must exit 0 and print the same thing.
 */
async function firedEvent(entry: Entry, cwd: string, input: string): Promise<string | null> {
  const outputs = new Set<string>();
  for (const { shell, result } of await runOnEveryShell(entry, cwd, input)) {
    expect(result.outcome, `${shell}: ${result.stderr}`).toBe(EXIT_ZERO);
    expect(result.stderr, shell).toBe("");
    outputs.add(result.stdout);
  }
  expect(outputs.size).toBe(1);
  return eventOf([...outputs][0] ?? "");
}

/** The event named in what an entry printed, or `null` when it printed nothing. */
function eventOf(stdout: string): string | null {
  if (stdout.trim() === "") return null;
  const payload = asRecord(JSON.parse(stdout), "the output");
  const output = asRecord(payload.hookSpecificOutput, "hookSpecificOutput");
  expect(typeof output.additionalContext).toBe("string");
  return String(output.hookEventName);
}

/**
 * Like `firedEvent`, one shell after another and with an input of each shell's own.
 *
 * An entry that remembers what it printed cannot be run by every shell at once on one input:
 * the shell that runs second would find the first one's mark.
 */
async function firedPerShell(
  entry: Entry,
  cwd: string,
  inputFor: (shell: CodexShell) => string,
): Promise<string | null> {
  const events = new Set<string | null>();
  for (const shell of CODEX_SHELLS) {
    const result = await runCodexLine(entry, shell, cwd, inputFor(shell));
    expect(result.outcome, `${shell}: ${result.stderr}`).toBe(EXIT_ZERO);
    expect(result.stderr, shell).toBe("");
    events.add(eventOf(result.stdout));
  }
  expect(events.size).toBe(1);
  return [...events][0] ?? null;
}

/** The files the grilling entry leaves in the system temporary directory, one per session. */
const sessionMarkers: string[] = [];
function freshSession(label: string): string {
  const id = `${label}-${randomUUID()}`;
  const digest = createHash("sha256").update(id).digest("hex").slice(0, 32);
  sessionMarkers.push(path.join(os.tmpdir(), `qfai-grilling-${digest}`));
  return id;
}

afterAll(async () => {
  await Promise.all(sessionMarkers.map((marker) => rm(marker, { force: true })));
});

function patch(header: string): string {
  return `*** Begin Patch\n${header}\n@@\n-old\n+new\n*** End Patch\n`;
}

// QFAI:EX-0001-0196-37
// QFAI:EX-0001-0196-38
// QFAI:EX-0001-0196-40
// QFAI:EX-0001-0196-41
describe("the Codex tool-time reminders", () => {
  it("mirror each Claude Code tool-time group that has a Codex moment", async () => {
    const expected: Record<string, [string, string][]> = {
      PreToolUse: [
        ["mcp__github__", DOCUMENTATION_CLARITY_HOOK_MARKER],
        ["apply_patch", GRILLING_DESIGN_ARTIFACT_HOOK_MARKER],
        ["spawn_agent", GRILLING_DELEGATION_HOOK_MARKER],
        ["Bash", API_BUDGET_HOOK_MARKER],
      ],
      PostToolUse: [
        ["apply_patch", DOCUMENTATION_CLARITY_HOOK_MARKER],
        ["apply_patch", MINIMAL_IMPLEMENTATION_HOOK_MARKER],
      ],
    };
    for (const event of TOOL_EVENTS) {
      const codex = await readGroups(SHIPPED_CODEX, event);
      const claude = await readGroups(SHIPPED_SETTINGS, event);
      expect(
        codex.map((group) => [
          String(group.matcher).startsWith("mcp__github__") ? "mcp__github__" : group.matcher,
          group.hooks[0]?.statusMessage,
        ]),
      ).toEqual(expected[event]);

      for (const group of codex) {
        const twin = claude.filter((candidate) => markersOf(candidate) === markersOf(group));
        expect(twin, `${event} ${markersOf(group)}`).toHaveLength(1);
        expect(group.hooks.map(codexKey)).toEqual(twin[0]?.hooks.map(claudeKey));
      }
    }
    const post = (await readGroups(SHIPPED_CODEX, "PreToolUse")).find((group) =>
      String(group.matcher).startsWith("mcp__github__"),
    );
    const claudePost = (await readGroups(SHIPPED_SETTINGS, "PreToolUse")).find(
      (group) => markersOf(group) === JSON.stringify([DOCUMENTATION_CLARITY_HOOK_MARKER]),
    );
    expect(post?.matcher).toBe(claudePost?.matcher);
  });

  it("carry no plan reminder, which Codex has no tool call for", async () => {
    const text = await readFile(path.join(repoRoot, SHIPPED_CODEX), "utf-8");
    expect(text).not.toContain(GRILLING_PLAN_HOOK_MARKER);
    expect(text).not.toContain("grilling-plan");
    expect(text).not.toContain("ExitPlanMode");
  });

  it("keep every program free of what a shell would expand or cut", async () => {
    for (const event of ALL_EVENTS) {
      for (const entry of (await readGroups(SHIPPED_CODEX, event)).flatMap((g) => g.hooks)) {
        const { program } = partsOf(entry);
        // `$`, a backtick and `!` expand in `sh` or PowerShell, `%` in cmd.exe, and `"` would
        // end the quoted program in all of them. A doubled backslash is one backslash to `sh`
        // and two to the others.
        expect(program).not.toMatch(/[$`%!"]/);
        expect(program).not.toContain("\\\\");
        expect(program).not.toContain("additionalContext");
        expect(entry.type).toBe("command");
        expect(entry.timeout).toBeGreaterThan(0);
        expect(entry.timeout).toBeLessThanOrEqual(30);
      }
    }
  });

  it("run one line on every platform, each program finding the message file the same way", async () => {
    const entries: Entry[] = [];
    for (const event of ALL_EVENTS) {
      entries.push(...(await readGroups(SHIPPED_CODEX, event)).flatMap((g) => g.hooks));
    }
    // Codex runs `commandWindows` in place of `command` on Windows; with none, the same line runs.
    for (const entry of entries) expect(entry.commandWindows).toBeUndefined();

    const programs = entries.map((entry) => partsOf(entry).program);
    // The filtered readers read the tool call first; the install check looks for the launcher.
    const unfiltered = new Set(
      programs.filter(
        (program) => !program.includes("readFileSync(0") && !program.includes("'.bin'"),
      ),
    );
    expect(unfiltered.size).toBe(1);
    const reader = [...unfiltered][0] ?? "";
    expect(reader.startsWith("try{") && reader.endsWith("}catch{}")).toBe(true);
    // The walk that finds the message file, up to where each program decides what to print.
    const locate = reader.slice("try{".length, reader.indexOf("if(r){"));
    expect(locate.length).toBeGreaterThan(100);
    for (const program of programs) expect(program).toContain(locate);
  });

  it("print nothing and exit 0 outside a repository", async () => {
    const outside = await mkdtemp(path.join(os.tmpdir(), "qfai-codex-tool-outside-"));
    try {
      for (const event of TOOL_EVENTS) {
        for (const entry of (await readGroups(SHIPPED_CODEX, event)).flatMap((g) => g.hooks)) {
          const input = codexInput(event, "Bash", "gh api repos/o/r");
          expect(await firedEvent(entry, outside, input)).toBeNull();
        }
      }
    } finally {
      await removeTempTree(outside);
    }
  });

  it("remind about the API budget only for a command that names the forge", async () => {
    const entry = await codexEntry("PreToolUse", "api-budget");
    await withProject(async (cwd) => {
      for (const [command, fires] of [
        ["gh api repos/o/r", true],
        ["curl https://api.github.com/x", true],
        ["gh api repos/o/r | jq .x > out & echo ^(y) <in", true],
        ["echo %PATH% $env:X `id` && gh pr list", true],
        ["gh", true],
        ["git status && echo sigh", false],
        ["ghost", false],
        ["npm run gh-pages", false],
        ["echo %PATH% $env:X | findstr x > nul & type <in", false],
      ] as const) {
        const event = await firedEvent(entry, cwd, codexInput("PreToolUse", "Bash", command));
        expect(event, command).toBe(fires ? "PreToolUse" : null);
      }
    });
  });

  it("remind about writing only for a patch that adds or changes a Markdown file", async () => {
    const write = await codexEntry("PostToolUse", "documentation-clarity-after-write");
    const edit = await codexEntry("PostToolUse", "documentation-clarity-after-edit");
    const minimal = await codexEntry("PostToolUse", "minimal-implementation");
    const grilling = await codexEntry("PreToolUse", "grilling-design-artifact");
    await withProject(async (cwd) => {
      const cases = [
        ["*** Add File: docs/a.md", "PostToolUse", null, null],
        ["*** Update File: README.md", null, "PostToolUse", null],
        ["*** Update File: src/a.ts", null, null, "PostToolUse"],
        ["*** Add File: docs/a.mdx", null, null, null],
      ] as const;
      for (const [header, writeFires, editFires, minimalFires] of cases) {
        const post = codexInput("PostToolUse", "apply_patch", patch(header));
        expect(await firedEvent(write, cwd, post), header).toBe(writeFires);
        expect(await firedEvent(edit, cwd, post), header).toBe(editFires);
        expect(await firedEvent(minimal, cwd, post), header).toBe(minimalFires);
        const fired = await firedPerShell(grilling, cwd, (shell) =>
          codexInput("PreToolUse", "apply_patch", patch(header), freshSession(shell)),
        );
        expect(fired, header).toBe("PreToolUse");
      }
    });
  });

  // QFAI:EX-0001-0196-53
  it("remind about implementation only for a patch that touches product source", async () => {
    const minimal = await codexEntry("PostToolUse", "minimal-implementation");
    await withProject(async (cwd) => {
      for (const [header, fires] of [
        ["*** Update File: src/a.ts", true],
        ["*** Add File: docs/a.md\n*** Update File: src/a.ts", true],
        ["*** Update File: src/a.ts\n*** Move to: tmp/a.ts", true],
        ["*** Update File: tmp/x.py", false],
        ["*** Update File: tests/a.ts", false],
        ["*** Update File: src/a.test.ts", false],
        ["*** Add File: README.md\n*** Update File: package.json", false],
        ["*** Add File: .env.example", false],
        ["*** Update File: ../../../../outside.ts", false],
      ] as const) {
        const input = codexInput("PostToolUse", "apply_patch", patch(header));
        expect(await firedEvent(minimal, cwd, input), header).toBe(fires ? "PostToolUse" : null);
      }
      // A call that names no file is not a reason to stay silent.
      const none = codexInput("PostToolUse", "apply_patch", "*** Begin Patch\n*** End Patch\n");
      expect(await firedEvent(minimal, cwd, none)).toBe("PostToolUse");
    });
  });

  // QFAI:EX-0001-0196-54
  it("remind about grilling before a patch once per session", async () => {
    const grilling = await codexEntry("PreToolUse", "grilling-design-artifact");
    await withProject(async (cwd) => {
      const input = (sessionId: string | null): string =>
        codexInput("PreToolUse", "apply_patch", patch("*** Update File: src/a.ts"), sessionId);
      for (const shell of CODEX_SHELLS) {
        const first = freshSession(shell);
        const events: (string | null)[] = [];
        for (const sessionId of [first, first, freshSession(shell), null, null]) {
          const result = await runCodexLine(grilling, shell, cwd, input(sessionId));
          expect(result.outcome, `${shell}: ${result.stderr}`).toBe(EXIT_ZERO);
          expect(result.stderr, shell).toBe("");
          events.push(eventOf(result.stdout));
        }
        expect(events, shell).toEqual([
          "PreToolUse",
          null,
          "PreToolUse",
          "PreToolUse",
          "PreToolUse",
        ]);
      }
    });
  });
});
