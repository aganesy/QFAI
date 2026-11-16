import { HOOK_STATUS as RELEASE_MERGE_HOOK_STATUS } from "../../../../scripts/release-merge-ask.mjs";

/**
 * Removes the release-merge check this repository alone carries (`releaseMergeAsk.test.ts`) before
 * comparing reminder settings.
 */
export function reminderSettings(text: string): string {
  const value: unknown = JSON.parse(text);
  if (!object(value) || !object(value.hooks) || !Array.isArray(value.hooks.PreToolUse))
    throw new Error("Settings have no PreToolUse groups.");
  const groups: unknown[] = value.hooks.PreToolUse;
  return (
    JSON.stringify(
      {
        ...value,
        hooks: {
          ...value.hooks,
          PreToolUse: groups.filter(
            (group) =>
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
