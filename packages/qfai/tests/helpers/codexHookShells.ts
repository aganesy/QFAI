/**
 * Runs a `.codex/hooks.json` entry the way Codex does.
 *
 * Codex takes one command string per entry and hands it to a shell: `$SHELL -lc`
 * elsewhere, and `%COMSPEC% /C "<line>"` on Windows, where it runs
 * `commandWindows` in place of `command`. The Windows line is passed verbatim,
 * wrapped in one pair of quotes, so `cmd.exe` strips that pair and parses the
 * rest as typed.
 *
 * Both shells are exercised where both exist. `cmd.exe` exists only on
 * Windows, so a suite run there covers both lines and a run elsewhere covers
 * `command` alone.
 */

import { type Spawned, spawnCaptured } from "./spawnCaptured.js";

export type CodexShell = "sh" | "cmd";

/** The shells whose Codex line this platform can run. */
export const CODEX_SHELLS: readonly CodexShell[] =
  process.platform === "win32" ? ["sh", "cmd"] : ["sh"];

/** The line Codex runs for `entry` in `shell`. */
export function codexLine(entry: Readonly<Record<string, unknown>>, shell: CodexShell): string {
  const line = shell === "cmd" ? entry.commandWindows : entry.command;
  if (typeof line !== "string") throw new Error(`entry has no ${shell} command string`);
  return line;
}

/** What `shell` reports for the entry's line, run in `cwd` with `input` on stdin. */
export async function runCodexLine(
  entry: Readonly<Record<string, unknown>>,
  shell: CodexShell,
  cwd: string,
  input: string,
): Promise<Spawned> {
  const line = codexLine(entry, shell);
  if (shell === "sh") return await spawnCaptured("sh", ["-c", line], { cwd, input });
  return await spawnCaptured(process.env.ComSpec ?? "cmd.exe", ["/C", `"${line}"`], {
    cwd,
    input,
    windowsVerbatimArguments: true,
  });
}
