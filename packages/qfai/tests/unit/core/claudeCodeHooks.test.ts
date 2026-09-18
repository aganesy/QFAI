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

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  DOCUMENTATION_CLARITY_HOOK_MARKER,
  MINIMAL_IMPLEMENTATION_HOOK_MARKER,
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

  it("adds a group the project is missing to a file that carries the other one", () => {
    // The population an upgrade is for: a project that installed an earlier
    // template. Deciding per file would see the first group, call the file
    // done, and withhold every group added after it.
    const first = groupsFor(mergedSettings("{}"), "PreToolUse")[0];
    const settings = mergedSettings(JSON.stringify({ hooks: { PreToolUse: [first] } }));

    expect(groupsFor(settings, "PreToolUse")).toHaveLength(1);
    expect(groupsFor(settings, "PostToolUse")).toHaveLength(1);
    expect(JSON.stringify(groupsFor(settings, "PostToolUse")[0])).toContain("Write(**/*.md)");
  });

  it("names only the events it actually added to", () => {
    const first = groupsFor(mergedSettings("{}"), "PreToolUse")[0];
    const result = mergeDocumentationClarityHooks(
      JSON.stringify({ hooks: { PreToolUse: [first] } }),
      TEMPLATE,
    );

    expect(result.outcome).toBe("merged");
    if (result.outcome !== "merged") return;
    expect(result.events).toEqual(["PostToolUse"]);
  });

  it("recognises a group whose reminder text the project has reworded", () => {
    // Identity is the status message, not the whole group. The reminder body is
    // prose a project may reasonably adjust, and re-appending it would leave two
    // of the same hook running.
    const reworded = {
      matcher: "mcp__github__(create_pull_request)",
      hooks: [
        {
          type: "command",
          statusMessage: DOCUMENTATION_CLARITY_HOOK_MARKER,
          command: "node",
          args: ["-e", "console.log('our own wording')"],
        },
      ],
    };
    const settings = mergedSettings(JSON.stringify({ hooks: { PreToolUse: [reworded] } }));

    expect(groupsFor(settings, "PreToolUse")).toEqual([reworded]);
  });

  it("keeps an older same-marker implementation reminder without adding a duplicate", () => {
    const own = { matcher: "Bash", hooks: [{ type: "command", command: "./own.sh" }] };
    const older = {
      matcher: "Edit",
      customSetting: "keep",
      hooks: [
        {
          type: "command",
          statusMessage: MINIMAL_IMPLEMENTATION_HOOK_MARKER,
          command: "project-node",
          args: ["-e", "console.log('older reminder')"],
        },
      ],
    };
    const current = {
      matcher: "Write|Edit",
      hooks: [
        {
          type: "command",
          statusMessage: MINIMAL_IMPLEMENTATION_HOOK_MARKER,
          command: "node",
          args: ["-e", "console.log('current safety-floor pointer')"],
        },
      ],
    };
    const missing = {
      matcher: "Write|Edit",
      hooks: [{ type: "command", statusMessage: DOCUMENTATION_CLARITY_HOOK_MARKER }],
    };
    const template = JSON.stringify({ hooks: { PostToolUse: [current, missing] } });
    const existing = JSON.stringify({
      permissions: { allow: ["Bash(git status)"] },
      hooks: { PostToolUse: [own, older] },
    });

    const result = mergeDocumentationClarityHooks(existing, template);
    expect(result.outcome).toBe("merged");
    if (result.outcome !== "merged") return;
    expect(result.events).toEqual(["PostToolUse"]);
    expect(groupsFor(result.settings, "PostToolUse")).toEqual([own, older, missing]);
    expect(result.settings.permissions).toEqual({ allow: ["Bash(git status)"] });
    expect(
      mergeDocumentationClarityHooks(serializeClaudeSettings(result.settings), template).outcome,
    ).toBe("already-present");
  });

  it("includes repeated markers in a hook group's identity", () => {
    const entry = {
      type: "command",
      statusMessage: DOCUMENTATION_CLARITY_HOOK_MARKER,
      command: "project-node",
      args: ["--project-option", "-e", "console.log('our reminder')"],
    };
    const existingGroup = { matcher: "Edit", hooks: [entry, { ...entry, command: "other-node" }] };
    const singleMarkerGroup = { matcher: "Write|Edit", hooks: [{ ...entry, command: "node" }] };
    const existing = JSON.stringify({ hooks: { PostToolUse: [existingGroup] } });
    const sameMarkers = JSON.stringify({
      hooks: { PostToolUse: [{ matcher: "Write|Edit", hooks: [entry, entry] }] },
    });
    expect(mergeDocumentationClarityHooks(existing, sameMarkers).outcome).toBe("already-present");

    const template = JSON.stringify({ hooks: { PostToolUse: [singleMarkerGroup] } });
    const result = mergeDocumentationClarityHooks(existing, template);
    expect(result.outcome).toBe("merged");
    if (result.outcome !== "merged") return;
    expect(groupsFor(result.settings, "PostToolUse")).toEqual([existingGroup, singleMarkerGroup]);
    expect(
      mergeDocumentationClarityHooks(serializeClaudeSettings(result.settings), template).outcome,
    ).toBe("already-present");
  });

  it("treats a marker written by hand as carrying that group", () => {
    // The hand-written group answers for the event it is under. The other event
    // has nothing, so it is still added.
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

    const result = mergeDocumentationClarityHooks(byHand, TEMPLATE);
    expect(result.outcome).toBe("merged");
    if (result.outcome !== "merged") return;
    expect(result.events).toEqual(["PostToolUse"]);
    expect(groupsFor(result.settings, "PreToolUse")).toHaveLength(1);
  });

  it("refuses a template group that carries no status message", () => {
    // Without one there is nothing to recognise the group by, so the next run
    // would append it again.
    const anonymous = JSON.stringify({
      hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "./x.sh" }] }] },
    });

    const result = mergeDocumentationClarityHooks("{}", anonymous);
    expect(result.outcome).toBe("unreadable");
    if (result.outcome !== "unreadable") return;
    expect(result.reason).toContain("status message");
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

// tests/unit/core/<this file> -> tests -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** The template this release ships. */
const SHIPPED = readFileSync(path.join(packageRoot, "assets/init/.claude/settings.json"), "utf-8");

/**
 * Every hook group an earlier template held, each exactly as that template
 * wrote it, taken from the history of the shipped settings file.
 */
const EARLIER: Record<string, unknown> = JSON.parse(
  readFileSync(
    path.join(packageRoot, "tests/fixtures/claude-settings/earlier-reminder-groups.json"),
    "utf-8",
  ),
);

const EVENTS = ["UserPromptSubmit", "PreToolUse", "PostToolUse"];

/** A group's markers, sorted, as the merge compares them. */
function markersOf(group: unknown): string {
  const entries: unknown =
    typeof group === "object" && group !== null ? Reflect.get(group, "hooks") : undefined;
  if (!Array.isArray(entries)) return "";
  return JSON.stringify(
    entries
      .map((entry: unknown) =>
        typeof entry === "object" && entry !== null
          ? String(Reflect.get(entry, "statusMessage"))
          : "",
      )
      .sort(),
  );
}

/** The shipped group under `event` whose markers match `group`'s. */
function shippedCounterpart(event: string, group: unknown): unknown {
  const shipped: Record<string, unknown> = JSON.parse(SHIPPED);
  return groupsFor(shipped, event).find((candidate) => markersOf(candidate) === markersOf(group));
}

describe("an earlier release's hook groups", () => {
  const cases = EVENTS.flatMap((event) =>
    groupsFor(EARLIER, event).map((group, index) => ({ event, index, group })),
  );

  it("covers every group the fixture holds", () => {
    expect(cases).toHaveLength(9);
  });

  it.each(cases)("replaces $event group $index where it stands", ({ event, group }) => {
    const own = { matcher: "Bash", hooks: [{ type: "command", command: "./own.sh" }] };
    const existing = JSON.stringify({ hooks: { [event]: [own, group, own] } });

    const result = mergeDocumentationClarityHooks(existing, SHIPPED);
    expect(result.outcome).toBe("merged");
    if (result.outcome !== "merged") return;
    const groups = groupsFor(result.settings, event);
    // Same place, this release's content, and the project's groups untouched.
    expect(groups[0]).toEqual(own);
    expect(groups[1]).toEqual(shippedCounterpart(event, group));
    expect(groups[2]).toEqual(own);
    expect(result.edited).toEqual([]);
    // The replacement carries no message of its own.
    expect(JSON.stringify(groups[1])).not.toContain("additionalContext");
  });

  it("brings a whole earlier file to the shipped hooks, and a second run changes nothing", () => {
    const result = mergeDocumentationClarityHooks(JSON.stringify(EARLIER), SHIPPED);
    expect(result.outcome).toBe("merged");
    if (result.outcome !== "merged") return;
    // The fixture holds two spellings of some groups. Each becomes the shipped
    // group where it stands.
    for (const event of EVENTS) {
      for (const [index, group] of groupsFor(EARLIER, event).entries()) {
        expect(groupsFor(result.settings, event)[index]).toEqual(shippedCounterpart(event, group));
      }
    }
    expect(result.edited).toEqual([]);

    const again = mergeDocumentationClarityHooks(serializeClaudeSettings(result.settings), SHIPPED);
    expect(again).toEqual({ outcome: "already-present", edited: [] });
  });

  it("keeps a group that differs from every spelling a release shipped, and names it", () => {
    const first: unknown = groupsFor(EARLIER, "PreToolUse")[0];
    if (typeof first !== "object" || first === null) throw new Error("fixture has no group");
    expect(markersOf(first)).toBe(JSON.stringify([DOCUMENTATION_CLARITY_HOOK_MARKER]));
    const edited = { ...first, matcher: "mcp__github__(create_pull_request)" };
    const existing = JSON.stringify({ hooks: { PreToolUse: [edited] } });

    const result = mergeDocumentationClarityHooks(existing, SHIPPED);
    expect(result.outcome).toBe("merged");
    if (result.outcome !== "merged") return;
    expect(groupsFor(result.settings, "PreToolUse")[0]).toEqual(edited);
    expect(result.edited).toEqual([`PreToolUse "${DOCUMENTATION_CLARITY_HOOK_MARKER}"`]);
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
