import { expect } from "vitest";

/** Removes only the exact additional graph guard before comparing reminder settings. */
export function reminderSettings(text: string, host: "claude" | "codex"): string {
  const value: unknown = JSON.parse(text);
  if (!object(value) || !object(value.hooks) || !Array.isArray(value.hooks.PreToolUse))
    throw new Error("Settings have no PreToolUse groups.");
  const groups: unknown[] = value.hooks.PreToolUse;
  const guard = groups.filter(
    (group) =>
      object(group) &&
      Array.isArray(group.hooks) &&
      group.hooks.some(
        (hook: unknown) => object(hook) && hook.statusMessage === "QFAI graph exploration",
      ),
  );
  expect(guard).toEqual([
    host === "claude"
      ? {
          matcher: "Bash|PowerShell|Grep",
          hooks: [
            {
              type: "command",
              statusMessage: "QFAI graph exploration",
              command: "node",
              args: ["${CLAUDE_PROJECT_DIR}/.qfai/tools/graph-hook.mjs", "claude"],
            },
          ],
        }
      : {
          matcher:
            "^(Bash|PowerShell|exec_command|Grep|grep|rg|grep_search|search_files|file_search)$",
          hooks: [
            {
              type: "command",
              statusMessage: "QFAI graph exploration",
              command: "node .qfai/tools/graph-hook.mjs codex",
            },
          ],
        },
  ]);
  return (
    JSON.stringify(
      {
        ...value,
        hooks: {
          ...value.hooks,
          PreToolUse: groups.filter((group) => group !== guard[0]),
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
