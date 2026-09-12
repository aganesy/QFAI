/**
 * The Claude Code hooks `qfai init` seeds, checked as configuration and as
 * something that runs.
 *
 * A hook that parses but prints nothing Claude Code can read is silently dead:
 * plain stdout from a tool-loop hook reaches the debug log and nowhere else, so
 * the only evidence the reminder arrives is a run whose stdout parses as the
 * documented JSON envelope. Every shipped entry is executed here for exactly
 * that reason.
 *
 * The matcher set is pinned too. A shell-argument condition matches compound
 * commands it was never meant to, so the entries filter on tool name and on
 * file path, which do not have that failure. Widening them back is a change a
 * reader should see.
 */

import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { beforeAll, describe, expect, it } from "vitest";

import {
  DOCUMENTATION_CLARITY_HOOK_MARKER,
  GRILLING_DELEGATION_HOOK_MARKER,
  GRILLING_DESIGN_ARTIFACT_HOOK_MARKER,
  GRILLING_PLAN_HOOK_MARKER,
  MINIMAL_IMPLEMENTATION_HOOK_MARKER,
  STRUCTURED_QUESTION_HOOK_MARKER,
} from "../../src/core/claudeCodeHooks.js";

/**
 * The rule master each reminder restates, by the marker its entries carry.
 *
 * The last two cases below hold a property of every entry in the file rather
 * than of a named one, so a reminder added later is covered without touching
 * them. What it costs is a row here, and a marker absent from this table is
 * itself the failure those cases report.
 */
const RESTATES: ReadonlyMap<string, string> = new Map([
  [DOCUMENTATION_CLARITY_HOOK_MARKER, "documentation-clarity.md"],
  [MINIMAL_IMPLEMENTATION_HOOK_MARKER, "minimal-implementation.md"],
  [GRILLING_DESIGN_ARTIFACT_HOOK_MARKER, "grilling.md"],
  [GRILLING_DELEGATION_HOOK_MARKER, "grilling.md"],
  [GRILLING_PLAN_HOOK_MARKER, "grilling.md"],
  [STRUCTURED_QUESTION_HOOK_MARKER, "user-questions.md"],
]);

const run = promisify(execFile);

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** The shipped template, and this repository's own copy of it. */
const SETTINGS_PATHS = ["packages/qfai/assets/init/.claude/settings.json", ".claude/settings.json"];

interface HookEntry {
  readonly type: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly statusMessage: string;
  readonly if?: string;
}

interface HookGroup {
  readonly matcher: string;
  readonly hooks: readonly HookEntry[];
}

/** The parsed `hooks` table, rejecting anything the shape below does not cover. */
function readHooks(text: string): ReadonlyMap<string, readonly HookGroup[]> {
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== "object" || parsed === null || !("hooks" in parsed)) {
    throw new Error("settings file carries no hooks table");
  }
  const hooks: unknown = parsed.hooks;
  if (typeof hooks !== "object" || hooks === null) {
    throw new Error("hooks is not an object");
  }
  const byEvent = new Map<string, readonly HookGroup[]>();
  for (const [event, groups] of Object.entries(hooks)) {
    if (!Array.isArray(groups)) throw new Error(`${event} is not an array`);
    byEvent.set(event, groups.map(toGroup));
  }
  return byEvent;
}

function toGroup(value: unknown): HookGroup {
  if (typeof value !== "object" || value === null) throw new Error("hook group is not an object");
  const matcher: unknown = Reflect.get(value, "matcher");
  const entries: unknown = Reflect.get(value, "hooks");
  if (typeof matcher !== "string") throw new Error("hook group has no matcher");
  if (!Array.isArray(entries)) throw new Error("hook group has no entries");
  return { matcher, hooks: entries.map(toEntry) };
}

function toEntry(value: unknown): HookEntry {
  if (typeof value !== "object" || value === null) throw new Error("hook entry is not an object");
  const type: unknown = Reflect.get(value, "type");
  const command: unknown = Reflect.get(value, "command");
  const args: unknown = Reflect.get(value, "args");
  const statusMessage: unknown = Reflect.get(value, "statusMessage");
  const condition: unknown = Reflect.get(value, "if");
  if (typeof type !== "string" || typeof command !== "string") {
    throw new Error("hook entry has no type or command");
  }
  if (!Array.isArray(args) || !args.every((arg): arg is string => typeof arg === "string")) {
    throw new Error("hook entry args are not strings");
  }
  if (typeof statusMessage !== "string") throw new Error("hook entry has no statusMessage");
  return {
    type,
    command,
    args,
    statusMessage,
    ...(typeof condition === "string" ? { if: condition } : {}),
  };
}

describe.each(SETTINGS_PATHS)("%s", (rel) => {
  let hooks: ReadonlyMap<string, readonly HookGroup[]>;

  beforeAll(async () => {
    hooks = readHooks(await readFile(path.join(repoRoot, rel), "utf-8"));
  });

  it("wires the reminder to a GitHub post and to a Markdown edit", () => {
    expect([...hooks.keys()].sort()).toEqual(["PostToolUse", "PreToolUse", "UserPromptSubmit"]);

    // Selected by matcher rather than by position: other reminders share the
    // event, and asserting this one is the only entry made every later hook a
    // failure of this test rather than of its own.
    const preToolUse = hooks.get("PreToolUse") ?? [];
    const github = preToolUse.filter((group) => group.matcher.includes("mcp__github__"));
    expect(github).toHaveLength(1);
    // Tool-name matching only. A `Bash` entry would need a shell-argument
    // condition, which also matches compound commands unrelated to GitHub.
    expect(github[0].matcher).not.toContain("Bash");
    for (const entry of github[0].hooks) {
      expect(entry.if).toBeUndefined();
    }

    const postToolUse = hooks.get("PostToolUse") ?? [];
    expect(postToolUse).toHaveLength(2);
    expect(postToolUse.map((group) => group.matcher)).toEqual(["Write|Edit", "Write|Edit"]);
    expect(postToolUse[0].hooks.map((entry) => entry.if)).toEqual([
      "Write(**/*.md)",
      "Edit(**/*.md)",
    ]);
  });

  it("restates the implementation rule on every write, with no path condition", () => {
    const postToolUse = hooks.get("PostToolUse") ?? [];
    const group = postToolUse[1];

    expect(group.hooks).toHaveLength(1);
    expect(group.hooks[0].statusMessage).toBe(MINIMAL_IMPLEMENTATION_HOOK_MARKER);
    // No `if`, deliberately. The condition is a permission-rule scope matched
    // against the path, so naming source by extension means enumerating a
    // language set — and a language left out is a hook that is silently absent
    // exactly where the rule is needed. The cost of the broader match is one
    // extra line on a Markdown edit, beside the clarity reminder already there.
    expect(group.hooks[0].if).toBeUndefined();
  });

  it("runs a program directly, with no shell and no arguments of its own", () => {
    for (const [, groups] of hooks) {
      for (const group of groups) {
        for (const entry of group.hooks) {
          expect(entry.type).toBe("command");
          // `args` present means exec form: the payload never reaches a shell,
          // so quoting cannot differ between platforms.
          expect(entry.command).toBe("node");
          expect(entry.args[0]).toBe("-e");
          expect([...RESTATES.keys()]).toContain(entry.statusMessage);
        }
      }
    }
  });

  it("gives every group under one event its own set of markers", () => {
    // How the upgrade merge tells one group from another. Two groups under the
    // same event with the same markers are one group to it, so a project
    // holding either is credited with both and never receives the other.
    for (const [event, groups] of hooks) {
      const identities = groups.map((group) =>
        JSON.stringify([...group.hooks.map((entry) => entry.statusMessage)].sort()),
      );
      expect(new Set(identities).size, `two ${event} groups share a marker set`).toBe(
        identities.length,
      );
    }
  });

  it("prints the documented envelope for its own event", async () => {
    for (const [event, groups] of hooks) {
      for (const group of groups) {
        for (const entry of group.hooks) {
          const { stdout } = await run(entry.command, [...entry.args]);
          const payload: unknown = JSON.parse(stdout);
          if (typeof payload !== "object" || payload === null) {
            throw new Error("hook printed something other than an object");
          }
          const output: unknown = Reflect.get(payload, "hookSpecificOutput");
          if (typeof output !== "object" || output === null) {
            throw new Error("hook printed no hookSpecificOutput");
          }
          expect(Reflect.get(output, "hookEventName")).toBe(event);
          const context: unknown = Reflect.get(output, "additionalContext");
          expect(typeof context).toBe("string");
          if (typeof context !== "string") return;
          // The reminder names the rule it restates, and stays short enough to
          // sit in front of the model on every fire.
          const master = RESTATES.get(entry.statusMessage);
          expect(master, `no rule master recorded for ${entry.statusMessage}`).toBeDefined();
          expect(context).toContain(master);
          expect(context.length).toBeLessThan(1000);
        }
      }
    }
  });
});

describe("shipped template and this repository agree", () => {
  it("carries the same hooks in both copies", async () => {
    const [shipped, own] = await Promise.all(
      SETTINGS_PATHS.map((rel) => readFile(path.join(repoRoot, rel), "utf-8")),
    );

    expect(JSON.parse(own)).toEqual(JSON.parse(shipped));
  });
});
