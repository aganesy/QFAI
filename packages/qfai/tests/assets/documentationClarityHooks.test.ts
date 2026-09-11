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
  MINIMAL_IMPLEMENTATION_HOOK_MARKER,
} from "../../src/core/claudeCodeHooks.js";

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
    expect([...hooks.keys()].sort()).toEqual(["PostToolUse", "PreToolUse"]);

    const preToolUse = hooks.get("PreToolUse") ?? [];
    expect(preToolUse).toHaveLength(1);
    expect(preToolUse[0].matcher).toContain("mcp__github__");
    // Tool-name matching only. A `Bash` entry would need a shell-argument
    // condition, which also matches compound commands unrelated to GitHub.
    expect(preToolUse[0].matcher).not.toContain("Bash");
    for (const entry of preToolUse[0].hooks) {
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
          expect([DOCUMENTATION_CLARITY_HOOK_MARKER, MINIMAL_IMPLEMENTATION_HOOK_MARKER]).toContain(
            entry.statusMessage,
          );
        }
      }
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
          expect(context).toContain(
            entry.statusMessage === MINIMAL_IMPLEMENTATION_HOOK_MARKER
              ? "minimal-implementation.md"
              : "documentation-clarity.md",
          );
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
