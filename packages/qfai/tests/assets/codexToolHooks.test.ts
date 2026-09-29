// QFAI:EX-0001-0196-37
// QFAI:EX-0001-0196-38
// QFAI:EX-0001-0196-40
/**
 * The tool-time reminders in the Codex hook file.
 *
 * Codex names its tools differently from Claude Code, so each group is matched
 * against the name Codex writes into the hook input: `apply_patch` for a file
 * edit, `spawn_agent` for a sub-agent, `Bash` for a shell command and
 * `mcp__<server>__<tool>` for an MCP tool. Codex hooks have no `if` condition,
 * so an entry that must stay quiet for some calls of its tool reads the call
 * from stdin itself. These tests run every such command through a real shell
 * with the input Codex sends.
 */

import { copyFile, mkdir, mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  API_BUDGET_HOOK_MARKER,
  DOCUMENTATION_CLARITY_HOOK_MARKER,
  GRILLING_DELEGATION_HOOK_MARKER,
  GRILLING_DESIGN_ARTIFACT_HOOK_MARKER,
  GRILLING_PLAN_HOOK_MARKER,
  MINIMAL_IMPLEMENTATION_HOOK_MARKER,
} from "../../src/core/claudeCodeHooks.js";
import { EXIT_ZERO, spawnCaptured } from "../helpers/spawnCaptured.js";
import { removeTempTree } from "../helpers/tempTree.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const SHIPPED_MESSAGES = "packages/qfai/assets/init/root/.agents/rules/reminders.json";
const SHIPPED_SETTINGS = "packages/qfai/assets/init/.claude/settings.json";
const SHIPPED_CODEX = "packages/qfai/assets/init/.codex/hooks.json";
const TOOL_EVENTS = ["PreToolUse", "PostToolUse"] as const;
const READER_END = ' "$(git rev-parse --show-toplevel)/.agents/rules/reminders.json" ';

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

/** The message key a Codex entry passes to its reader, and the key a Claude Code entry does. */
function codexKey(entry: Entry): string | undefined {
  return commandOf(entry).split(" ").at(-1);
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

/** The event named in what the entry prints, or `null` when it prints nothing; it must exit 0. */
async function firedEvent(entry: Entry, cwd: string, input: string): Promise<string | null> {
  const result = await spawnCaptured("sh", ["-c", commandOf(entry)], { cwd, input });
  expect(result.outcome, result.stderr).toBe(EXIT_ZERO);
  if (result.stdout.trim() === "") return null;
  const payload = asRecord(JSON.parse(result.stdout), "the output");
  const output = asRecord(payload.hookSpecificOutput, "hookSpecificOutput");
  expect(typeof output.additionalContext).toBe("string");
  return String(output.hookEventName);
}

function patch(header: string): string {
  return `*** Begin Patch\n${header}\n@@\n-old\n+new\n*** End Patch\n`;
}

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

  it("keep every reader free of what a shell would expand or cut", async () => {
    for (const event of TOOL_EVENTS) {
      for (const entry of (await readGroups(SHIPPED_CODEX, event)).flatMap((g) => g.hooks)) {
        const command = commandOf(entry);
        expect(command.startsWith('node -e "')).toBe(true);
        const end = command.indexOf(READER_END);
        expect(end).toBeGreaterThan(0);
        const reader = command.slice('node -e "'.length, end - 1);
        expect(reader).not.toMatch(/[$`%"]/);
        expect(reader).not.toContain("\\\\");
        expect(reader).not.toContain("additionalContext");
        expect(entry.type).toBe("command");
        expect(entry.timeout).toBeGreaterThan(0);
        expect(entry.timeout).toBeLessThanOrEqual(30);
      }
    }
  });

  it("remind about the API budget only for a command that names the forge", async () => {
    const entry = await codexEntry("PreToolUse", "api-budget");
    await withProject(async (cwd) => {
      for (const [command, fires] of [
        ["gh api repos/o/r", true],
        ["curl https://api.github.com/x", true],
        ["git status && echo sigh", false],
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
        ["*** Add File: docs/a.md", "PostToolUse", null],
        ["*** Update File: README.md", null, "PostToolUse"],
        ["*** Update File: src/a.ts", null, null],
      ] as const;
      for (const [header, writeFires, editFires] of cases) {
        const post = codexInput("PostToolUse", "apply_patch", patch(header));
        expect(await firedEvent(write, cwd, post), header).toBe(writeFires);
        expect(await firedEvent(edit, cwd, post), header).toBe(editFires);
        expect(await firedEvent(minimal, cwd, post), header).toBe("PostToolUse");
        const pre = codexInput("PreToolUse", "apply_patch", patch(header));
        expect(await firedEvent(grilling, cwd, pre), header).toBe("PreToolUse");
      }
    });
  });
});
