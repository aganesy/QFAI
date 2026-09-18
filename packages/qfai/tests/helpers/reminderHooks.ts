/**
 * Runs a reminder hook entry from a settings file the way Claude Code does.
 *
 * The entries carry no message: each runs a fixed reader over
 * `${CLAUDE_PROJECT_DIR}/.agents/rules/reminders.json`. What a reminder says is
 * therefore only visible by running it against the project the settings file
 * belongs to.
 */

import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

/** The placeholder Claude Code substitutes into each exec-form argument. */
export const PROJECT_DIR_PLACEHOLDER = "${CLAUDE_PROJECT_DIR}";

/** The project each settings file serves, relative to the repository root. */
const PROJECT_DIR_OF: ReadonlyMap<string, string> = new Map([
  [".claude/settings.json", "."],
  ["packages/qfai/assets/init/.claude/settings.json", "packages/qfai/assets/init/root"],
]);

/** The project directory a settings file's hooks run against. */
export function projectDirOf(repoRoot: string, settingsRel: string): string {
  const relative = PROJECT_DIR_OF.get(settingsRel);
  if (relative === undefined) throw new Error(`no project directory known for ${settingsRel}`);
  return path.join(repoRoot, relative);
}

/** What the entry prints on stdout when run against `projectDir`. Rejects on a non-zero exit. */
export async function runReminderHook(
  entry: { readonly command?: string; readonly args?: readonly string[] },
  projectDir: string,
): Promise<string> {
  const args = (entry.args ?? []).map((arg) => arg.split(PROJECT_DIR_PLACEHOLDER).join(projectDir));
  const { stdout } = await run(entry.command ?? "", args);
  return stdout;
}
