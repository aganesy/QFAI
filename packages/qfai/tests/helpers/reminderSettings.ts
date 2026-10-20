import { expect } from "vitest";
import {
  CLAUDE_GRAPH_HOOK_GROUP,
  CODEX_GRAPH_HOOK_GROUP,
  GRAPH_HOOK_MARKER,
} from "../../src/core/graph/hookCommands.js";
import { HOOK_STATUS as RELEASE_MERGE_HOOK_STATUS } from "../../../../scripts/release-merge-ask.mjs";

/**
 * Removes only the exact additional graph guard before comparing reminder settings, and the
 * release-merge check this repository alone carries (`releaseMergeAsk.test.ts`).
 */
export function reminderSettings(text: string, host: "claude" | "codex"): string {
  const value: unknown = JSON.parse(text);
  if (!object(value) || !object(value.hooks) || !Array.isArray(value.hooks.PreToolUse))
    throw new Error("Settings have no PreToolUse groups.");
  const groups: unknown[] = value.hooks.PreToolUse;
  const guard = groups.filter(
    (group) =>
      object(group) &&
      Array.isArray(group.hooks) &&
      group.hooks.some((hook: unknown) => object(hook) && hook.statusMessage === GRAPH_HOOK_MARKER),
  );
  expect(guard).toEqual([host === "claude" ? CLAUDE_GRAPH_HOOK_GROUP : CODEX_GRAPH_HOOK_GROUP]);
  return (
    JSON.stringify(
      {
        ...value,
        hooks: {
          ...value.hooks,
          PreToolUse: groups.filter(
            (group) =>
              group !== guard[0] &&
              !(
                object(group) &&
                Array.isArray(group.hooks) &&
                group.hooks.some(
                  (hook: unknown) =>
                    object(hook) && hook.statusMessage === RELEASE_MERGE_HOOK_STATUS,
                )
              ),
          ),
        },
      },
      null,
      2,
    ) + "\n"
  );
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
