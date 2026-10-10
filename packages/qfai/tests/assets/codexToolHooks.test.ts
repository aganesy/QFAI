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

import { randomUUID } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
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
import { CODEX_SHELLS, type CodexShell, runCodexLine } from "../helpers/codexHookShells.js";
import { EXIT_ZERO, type Spawned, spawnCaptured } from "../helpers/spawnCaptured.js";
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
function codexInput(event: string, toolName: string, command: string): string {
  return JSON.stringify({
    session_id: "s",
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

/** Session ids this file made, so the counters they left in the temp directory can go. */
const sessions: string[] = [];

function newSession(): string {
  const id = `codex-${randomUUID()}`;
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

/** The input with `session_id` set to `session`, or removed when `session` is `null`. */
function inSession(input: string, session: string | null): string {
  const record = asRecord(JSON.parse(input), "the input");
  delete record.session_id;
  if (session !== null) record.session_id = session;
  return JSON.stringify(record);
}

/** The event named in what one shell's run printed, or `null` when it printed nothing. */
function eventOf(shell: string, result: Spawned): string | null {
  expect(result.outcome, `${shell}: ${result.stderr}`).toBe(EXIT_ZERO);
  expect(result.stderr, shell).toBe("");
  if (result.stdout.trim() === "") return null;
  const payload = asRecord(JSON.parse(result.stdout), "the output");
  const output = asRecord(payload.hookSpecificOutput, "hookSpecificOutput");
  expect(typeof output.additionalContext).toBe("string");
  return String(output.hookEventName);
}

/**
 * The event named in what the entry prints on a session's first call, or `null` when it
 * prints nothing.
 *
 * Every shell this platform has runs it in a session of its own, and must exit 0 and
 * print the same thing.
 */
async function firedEvent(entry: Entry, cwd: string, input: string): Promise<string | null> {
  const events = await Promise.all(
    CODEX_SHELLS.map(async (shell) =>
      eventOf(shell, await runCodexLine(entry, shell, cwd, inSession(input, newSession()))),
    ),
  );
  expect(new Set(events).size).toBe(1);
  return events[0] ?? null;
}

/** What one shell prints for `input` exactly as given, so the session is the caller's. */
async function firedEventIn(
  entry: Entry,
  shell: CodexShell,
  cwd: string,
  input: string,
): Promise<string | null> {
  return eventOf(shell, await runCodexLine(entry, shell, cwd, input));
}

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
    const codexGithubGroup = (await readGroups(SHIPPED_CODEX, "PreToolUse")).find((group) =>
      String(group.matcher).startsWith("mcp__github__"),
    );
    const claudeGithubGroup = (await readGroups(SHIPPED_SETTINGS, "PreToolUse")).find(
      (group) => markersOf(group) === JSON.stringify([DOCUMENTATION_CLARITY_HOOK_MARKER]),
    );
    expect(codexGithubGroup?.matcher).toBe(claudeGithubGroup?.matcher);
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

  it("stop looking for the message file at a nested checkout whose .git is a file", async () => {
    const entry = await codexEntry("PreToolUse", "api-budget");
    await withProject(async (cwd) => {
      const nested = path.join(cwd, "vendor", "checkout");
      await mkdir(nested, { recursive: true });
      await writeFile(path.join(nested, ".git"), "gitdir: ../../.git/modules/checkout\n");
      const input = codexInput("PreToolUse", "Bash", "gh api repos/o/r");
      expect(await firedEvent(entry, cwd, input)).toBe("PreToolUse");
      expect(await firedEvent(entry, nested, input)).toBeNull();
    });
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
        ["*** Delete File: x.md", null, null, null],
      ] as const;
      for (const [header, writeFires, editFires, minimalFires] of cases) {
        const post = codexInput("PostToolUse", "apply_patch", patch(header));
        expect(await firedEvent(write, cwd, post), header).toBe(writeFires);
        expect(await firedEvent(edit, cwd, post), header).toBe(editFires);
        expect(await firedEvent(minimal, cwd, post), header).toBe(minimalFires);
        const pre = codexInput("PreToolUse", "apply_patch", patch(header));
        expect(await firedEvent(grilling, cwd, pre), header).toBe("PreToolUse");
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
});

/** Calls between two prints of one reminder, after the first. */
const PERIOD = 20;

/** Entries whose existing limited schedule is unchanged. */
const LIMITED = [
  ["PostToolUse", "documentation-clarity-after-write", "apply_patch", patch("*** Add File: a.md")],
  [
    "PostToolUse",
    "documentation-clarity-after-edit",
    "apply_patch",
    patch("*** Update File: a.md"),
  ],
  ["PostToolUse", "minimal-implementation", "apply_patch", patch("*** Update File: src/a.ts")],
] as const;

const POINTERS = [
  [
    "PreToolUse",
    "grilling-design-artifact",
    "apply_patch",
    patch("*** Update File: src/a.ts"),
    ".agents/rules/grilling.md",
  ],
  ["PreToolUse", "grilling-delegation", "spawn_agent", "delegate", ".agents/rules/grilling.md"],
  ["PreToolUse", "api-budget", "Bash", "gh api repos/o/r", ".agents/rules/api-budget.md"],
  ["UserPromptSubmit", "free-text-entry", "", "Fix the failing test", "qfai-run"],
  [
    "UserPromptSubmit",
    "structured-question",
    "",
    "Fix the failing test",
    ".agents/rules/user-questions.md",
  ],
] as const;

async function fullContext(key: string): Promise<string> {
  const messages = asRecord(
    JSON.parse(await readFile(path.join(repoRoot, SHIPPED_MESSAGES), "utf-8")),
    "messages",
  );
  const output = asRecord(asRecord(messages[key], key).hookSpecificOutput, "hookSpecificOutput");
  if (typeof output.additionalContext !== "string") throw new Error("no additionalContext");
  return output.additionalContext;
}

async function firedContext(
  entry: Entry,
  shell: CodexShell,
  cwd: string,
  input: string,
  event: string,
): Promise<string> {
  const result = await runCodexLine(entry, shell, cwd, input);
  expect(eventOf(shell, result)).toBe(event);
  const output = asRecord(
    asRecord(JSON.parse(result.stdout), "envelope").hookSpecificOutput,
    "hookSpecificOutput",
  );
  if (typeof output.additionalContext !== "string") throw new Error("no additionalContext");
  return output.additionalContext;
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

// QFAI:EX-0001-0196-40
describe("the Codex tool-time reminders that repeat", () => {
  it.each(POINTERS)(
    "prints %s/%s in full once, then a pointer under every shell",
    async (event, key, tool, command, reference) => {
      const entry = await codexEntry(event, key);
      const full = await fullContext(key);
      await withProject(async (cwd) => {
        for (const shell of CODEX_SHELLS) {
          const input = inSession(codexInput(event, tool, command), newSession());
          expect(await firedContext(entry, shell, cwd, input, event)).toBe(full);
          for (let call = 2; call <= PERIOD + 1; call += 1) {
            expectPointer(await firedContext(entry, shell, cwd, input, event), full, reference);
          }
        }
      });
    },
  );

  it("isolates selected counters by session, agent and message key", async () => {
    await withProject(async (cwd) => {
      const session = newSession();
      for (const [event, key, tool, command, reference] of POINTERS) {
        const entry = await codexEntry(event, key);
        const full = await fullContext(key);
        const main = inSession(codexInput(event, tool, command), session);
        const helper = JSON.stringify({
          ...asRecord(JSON.parse(main), "input"),
          agent_id: "helper",
        });
        for (const input of [main, helper, inSession(main, newSession())]) {
          expect(await firedContext(entry, "sh", cwd, input, event)).toBe(full);
          expectPointer(await firedContext(entry, "sh", cwd, input, event), full, reference);
        }
      }
    });
  });

  it("prints full context on every selected trigger without an identity", async () => {
    await withProject(async (cwd) => {
      for (const [event, key, tool, command] of POINTERS) {
        const entry = await codexEntry(event, key);
        const full = await fullContext(key);
        const input = inSession(codexInput(event, tool, command), null);
        expect(await firedContext(entry, "sh", cwd, input, event)).toBe(full);
        expect(await firedContext(entry, "sh", cwd, input, event)).toBe(full);
      }
    });
  });

  it("prints full context and exits zero when selected counter storage fails", async () => {
    await withProject(async (cwd) => {
      for (const [event, key, tool, command] of POINTERS) {
        const entry = await codexEntry(event, key);
        const session = newSession();
        const counter = path.join(os.tmpdir(), `qfai-reminder-${session}-main-${key}`);
        await mkdir(counter);
        try {
          const input = inSession(codexInput(event, tool, command), session);
          const full = await fullContext(key);
          expect(await firedContext(entry, "sh", cwd, input, event)).toBe(full);
          expect(await firedContext(entry, "sh", cwd, input, event)).toBe(full);
        } finally {
          await rm(counter, { recursive: true, force: true });
        }
      }
    });
  });

  it("print on a session's first call and not on its second, under every shell", async () => {
    await withProject(async (cwd) => {
      for (const [event, key, tool, command] of LIMITED) {
        const entry = await codexEntry(event, key);
        for (const shell of CODEX_SHELLS) {
          const input = inSession(codexInput(event, tool, command), newSession());
          expect(await firedEventIn(entry, shell, cwd, input), `${key}, ${shell}, first`).toBe(
            event,
          );
          expect(await firedEventIn(entry, shell, cwd, input), `${key}, ${shell}, second`).toBe(
            null,
          );
        }
      }
    });
  });

  it("print again on the call after a full period, and not before it", async () => {
    const entry = await codexEntry("PostToolUse", "minimal-implementation");
    await withProject(async (cwd) => {
      const input = inSession(
        codexInput("PostToolUse", "apply_patch", patch("*** Update File: src/a.ts")),
        newSession(),
      );
      const printed: number[] = [];
      for (let call = 1; call <= PERIOD + 1; call += 1) {
        if ((await firedEventIn(entry, "sh", cwd, input)) !== null) printed.push(call);
      }
      expect(printed).toEqual([1, PERIOD + 1]);
    });
  });

  it("print on every call when the input names no session", async () => {
    await withProject(async (cwd) => {
      for (const [event, key, tool, command] of LIMITED) {
        const entry = await codexEntry(event, key);
        const input = inSession(codexInput(event, tool, command), null);
        expect(await firedEventIn(entry, "sh", cwd, input), `${key}, first`).toBe(event);
        expect(await firedEventIn(entry, "sh", cwd, input), `${key}, second`).toBe(event);
      }
    });
  });

  it("count only the calls they would print for", async () => {
    await withProject(async (cwd) => {
      const cases = [
        ["PostToolUse", "minimal-implementation", patch("*** Update File: tmp/x.py"), "src/a.ts"],
        ["PreToolUse", "api-budget", "git status", "gh api repos/o/r"],
      ] as const;
      for (const [event, key, silent, loud] of cases) {
        const entry = await codexEntry(event, key);
        const tool = key === "api-budget" ? "Bash" : "apply_patch";
        const session = newSession();
        const call = (command: string) =>
          firedEventIn(entry, "sh", cwd, inSession(codexInput(event, tool, command), session));
        for (let n = 0; n < 3; n += 1) expect(await call(silent), `${key}, silent`).toBeNull();
        const first = key === "api-budget" ? loud : patch(`*** Update File: ${loud}`);
        expect(
          await firedContext(
            entry,
            "sh",
            cwd,
            inSession(codexInput(event, tool, first), session),
            event,
          ),
          `${key}, first loud call`,
        ).toBe(await fullContext(key));
      }
    });
  });
});
