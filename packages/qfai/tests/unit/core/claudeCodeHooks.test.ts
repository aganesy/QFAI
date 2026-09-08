/**
 * The merge that carries the documentation-clarity hooks into a project that
 * already has a `.claude/settings.json`.
 *
 * A settings file is the project's own configuration, so the assertions here
 * are as much about what the merge leaves alone as about what it adds: every
 * key it did not come for survives, existing hook entries keep their order and
 * position, and any shape the merge cannot read stops it rather than being
 * overwritten on a guess.
 */

import { describe, expect, it } from "vitest";

import {
  DOCUMENTATION_CLARITY_HOOK_MARKER,
  carriesDocumentationClarityHooks,
  mergeDocumentationClarityHooks,
  serializeClaudeSettings,
} from "../../../src/core/claudeCodeHooks.js";

/** A template shaped like the shipped one, small enough to assert against. */
const TEMPLATE = JSON.stringify({
  hooks: {
    PreToolUse: [
      {
        matcher: "mcp__github__(create_pull_request)",
        hooks: [
          {
            type: "command",
            statusMessage: DOCUMENTATION_CLARITY_HOOK_MARKER,
            command: "node",
            args: ["-e", "console.log('{}')"],
          },
        ],
      },
    ],
    PostToolUse: [
      {
        matcher: "Write|Edit",
        hooks: [
          {
            type: "command",
            if: "Write(**/*.md)",
            statusMessage: DOCUMENTATION_CLARITY_HOOK_MARKER,
            command: "node",
            args: ["-e", "console.log('{}')"],
          },
        ],
      },
    ],
  },
});

function mergedSettings(existing: string): Record<string, unknown> {
  const result = mergeDocumentationClarityHooks(existing, TEMPLATE);
  if (result.outcome !== "merged") {
    throw new Error(`expected a merge, got ${result.outcome}`);
  }
  return result.settings;
}

/**
 * The hook groups the merged settings hold for `event`.
 *
 * Read back through JSON so the assertions below work on plain data rather than
 * on a value the compiler only knows as `unknown`.
 */
function groupsFor(settings: Record<string, unknown>, event: string): unknown[] {
  const parsed: unknown = JSON.parse(JSON.stringify(settings));
  if (typeof parsed !== "object" || parsed === null || !("hooks" in parsed)) {
    throw new Error("merged settings carry no hooks table");
  }
  const hooks: unknown = parsed.hooks;
  if (typeof hooks !== "object" || hooks === null || !(event in hooks)) {
    throw new Error(`merged settings carry no ${event} entry`);
  }
  const groups: unknown = Reflect.get(hooks, event);
  if (!Array.isArray(groups)) {
    throw new Error(`${event} is not an array`);
  }
  return groups;
}

describe("mergeDocumentationClarityHooks", () => {
  it("adds both events to a settings file that has no hooks at all", () => {
    const result = mergeDocumentationClarityHooks(
      JSON.stringify({ permissions: { allow: ["Bash(git status)"] } }),
      TEMPLATE,
    );

    expect(result.outcome).toBe("merged");
    if (result.outcome !== "merged") return;
    expect(result.events).toEqual(["PreToolUse", "PostToolUse"]);
    // The key the merge did not come for is untouched.
    expect(result.settings.permissions).toEqual({ allow: ["Bash(git status)"] });
    expect(carriesDocumentationClarityHooks(result.settings)).toBe(true);
  });

  it("appends after the project's own entries for the same event", () => {
    const own = { matcher: "Bash", hooks: [{ type: "command", command: "./own.sh" }] };
    const settings = mergedSettings(JSON.stringify({ hooks: { PreToolUse: [own] } }));

    const groups = groupsFor(settings, "PreToolUse");
    expect(groups).toHaveLength(2);
    // The project's entry is still first, and exactly what it was.
    expect(groups[0]).toEqual(own);
    expect(JSON.stringify(groups[1])).toContain(DOCUMENTATION_CLARITY_HOOK_MARKER);
  });

  it("adds an event array the project does not have without touching the one it does", () => {
    const own = { matcher: "Bash", hooks: [{ type: "command", command: "./own.sh" }] };
    const settings = mergedSettings(JSON.stringify({ hooks: { PostToolUse: [own] } }));

    expect(groupsFor(settings, "PostToolUse")[0]).toEqual(own);
    expect(groupsFor(settings, "PostToolUse")).toHaveLength(2);
    expect(groupsFor(settings, "PreToolUse")).toHaveLength(1);
  });

  it("is a no-op on a second run", () => {
    const first = mergedSettings(JSON.stringify({ hooks: {} }));
    const again = mergeDocumentationClarityHooks(serializeClaudeSettings(first), TEMPLATE);

    expect(again.outcome).toBe("already-present");
  });

  it("treats a marker written by hand as already present", () => {
    const byHand = JSON.stringify({
      hooks: {
        PreToolUse: [
          {
            matcher: "Bash",
            hooks: [{ type: "command", statusMessage: DOCUMENTATION_CLARITY_HOOK_MARKER }],
          },
        ],
      },
    });

    expect(mergeDocumentationClarityHooks(byHand, TEMPLATE).outcome).toBe("already-present");
  });

  it.each([
    ["not JSON at all", "{ this is not json"],
    ["a JSON array rather than an object", "[]"],
    ["a `hooks` value that is not an object", JSON.stringify({ hooks: "off" })],
    ["an event whose value is not an array", JSON.stringify({ hooks: { PreToolUse: {} } })],
  ])("refuses a settings file that is %s", (_label, existing) => {
    const result = mergeDocumentationClarityHooks(existing, TEMPLATE);

    expect(result.outcome).toBe("unreadable");
    if (result.outcome !== "unreadable") return;
    expect(result.reason.length).toBeGreaterThan(0);
  });

  it("refuses a template that declares no hooks", () => {
    expect(mergeDocumentationClarityHooks("{}", JSON.stringify({ hooks: {} })).outcome).toBe(
      "unreadable",
    );
    expect(mergeDocumentationClarityHooks("{}", "{}").outcome).toBe("unreadable");
  });

  it("copies the template rather than aliasing it", () => {
    const settings = mergedSettings("{}");
    const group = groupsFor(settings, "PreToolUse")[0];
    if (typeof group !== "object" || group === null) throw new Error("group is not an object");

    // Editing the merged result must leave the template text able to produce
    // the same entry again on the next project.
    Reflect.set(group, "matcher", "changed");
    const again = groupsFor(mergedSettings("{}"), "PreToolUse")[0];
    expect(JSON.stringify(again)).toContain("mcp__github__(create_pull_request)");
  });
});

describe("serializeClaudeSettings", () => {
  it("writes two-space JSON ending in a newline", () => {
    const text = serializeClaudeSettings({ hooks: { PreToolUse: [] } });

    expect(text.endsWith("\n")).toBe(true);
    expect(text).toContain('\n  "hooks"');
    expect(JSON.parse(text)).toEqual({ hooks: { PreToolUse: [] } });
  });
});
