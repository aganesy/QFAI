/**
 * Runs a reminder hook entry from a settings file the way Claude Code does.
 *
 * The entries carry no message: each runs a fixed reader over
 * `${CLAUDE_PROJECT_DIR}/.agents/rules/reminders.json`. What a reminder says is
 * therefore only visible by running it against the project the settings file
 * belongs to.
 *
 * The host spawns a hook with the event's JSON on the program's stdin, so this
 * writes one and closes the stream. Closing it is what the caller needs most: an
 * entry that reads its input waits for the end of it, and a stdin nobody closes
 * is a hook that never returns.
 */

import { spawn } from "node:child_process";
import path from "node:path";

/** The placeholder Claude Code substitutes into each exec-form argument. */
export const PROJECT_DIR_PLACEHOLDER = "${CLAUDE_PROJECT_DIR}";

/**
 * The hook input every call supplies unless the caller names another.
 *
 * A `Bash` call naming the forge's CLI, because one entry prints only for such a
 * command and the rest ignore their input altogether. One payload therefore
 * reaches every entry's message.
 */
export const DEFAULT_HOOK_INPUT = JSON.stringify({
  hook_event_name: "PreToolUse",
  tool_name: "Bash",
  tool_input: { command: "gh api repos/owner/repo/actions/runs" },
});

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
  input: string = DEFAULT_HOOK_INPUT,
): Promise<string> {
  const args = (entry.args ?? []).map((arg) => arg.split(PROJECT_DIR_PLACEHOLDER).join(projectDir));
  return await new Promise<string>((resolve, reject) => {
    const child = spawn(entry.command ?? "", args, { stdio: ["pipe", "pipe", "pipe"] });
    const { stdin, stdout, stderr } = child;
    if (stdin === null || stdout === null || stderr === null) {
      reject(new Error("the hook was spawned without pipes"));
      return;
    }
    let out = "";
    let err = "";
    stdout.setEncoding("utf-8");
    stdout.on("data", (chunk: string) => {
      out += chunk;
    });
    stderr.setEncoding("utf-8");
    stderr.on("data", (chunk: string) => {
      err += chunk;
    });
    child.on("error", reject);
    // An entry that ignores its input exits with the pipe still open, so the
    // write fails. That is the entry finishing, not the entry failing.
    stdin.on("error", () => {});
    stdin.end(input);
    child.on("close", (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`${entry.command ?? "the hook"} exited ${String(code)}: ${err}`));
    });
  });
}
