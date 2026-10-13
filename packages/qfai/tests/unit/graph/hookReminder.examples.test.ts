import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";
import { runReminderHook } from "../../helpers/reminderHooks.js";
import { enforceGraphExploration, graphHookOutput } from "../../../src/core/graph/hooks.js";

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("Expected shipped hook configuration");
  return { ...value };
}

// QFAI:EX-0001-0235-24
// Mutation: packages/qfai/src/core/graph/hooks.ts `function denyExploration(operation: string, target: string): GraphHookDecision {` -> `function denyExploration(operation: string, target: string): GraphHookDecision { return { decision: "allow", state: "configured", operation, target, message: "Exploration allowed." };` fails "keeps shipped reminders at exit zero beside independent host denial responses"
it("keeps shipped reminders at exit zero beside independent host denial responses", async () => {
  const settings: unknown = JSON.parse(
    await readFile(path.resolve("assets/init/.claude/settings.json"), "utf8"),
  );
  const groups = record(record(settings).hooks).PostToolUse;
  if (!Array.isArray(groups)) throw new Error("Missing shipped reminder groups");
  const entries = groups.flatMap((group: unknown) => {
    const hooks = record(group).hooks;
    if (!Array.isArray(hooks)) throw new Error("Missing shipped reminder entries");
    return hooks.map((hook: unknown) => record(hook));
  });
  const entry = entries.find(
    (hook) => hook.statusMessage === "QFAI minimal-implementation reminder",
  );
  if (
    !entry ||
    typeof entry.command !== "string" ||
    !Array.isArray(entry.args) ||
    !entry.args.every((arg: unknown) => typeof arg === "string")
  )
    throw new Error("Missing shipped minimal-implementation reminder");
  const args: string[] = entry.args;
  const input = { tool_name: "Bash", tool_input: { command: "rg authorize packages/" } };
  const reminder = await runReminderHook(
    { command: entry.command, args },
    path.resolve("assets/init/root"),
    JSON.stringify(input),
  );
  expect(reminder).toContain("additionalContext");
  expect(reminder).not.toContain("permissionDecision");
  const denial = enforceGraphExploration(input, {
    kind: "graph-enforcement",
    denyExploration: true,
  });
  expect(graphHookOutput("claude", denial)).toMatchObject({
    hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny" },
  });
  expect(graphHookOutput("copilot", denial)).toMatchObject({ permissionDecision: "deny" });
});
