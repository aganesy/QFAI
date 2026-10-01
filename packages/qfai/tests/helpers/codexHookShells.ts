/**
 * Runs a `.codex/hooks.json` entry the way Codex does.
 *
 * Codex takes one command string per entry and hands it to the session's shell.
 * On Windows it takes `commandWindows` in place of `command` when an entry has
 * one. The shell is the one Codex detected for the session, or the platform
 * default when there is none:
 *
 * - `sh -c <line>`, or `$SHELL -lc <line>` as the default outside Windows;
 * - `cmd.exe /C "<line>"`, the line verbatim inside one pair of quotes, which
 *   `cmd.exe` strips before parsing the rest as typed;
 * - `powershell -NoProfile -Command <line>`, or `pwsh`, with the line quoted
 *   as one argument by the Windows argument rules, which Node.js applies here
 *   as Codex applies them.
 *
 * Every shell this platform has is exercised. `cmd.exe` and Windows PowerShell
 * exist only on Windows, and PowerShell 7 only where it is installed.
 */

import { existsSync } from "node:fs";
import path from "node:path";

import { type Spawned, spawnCaptured } from "./spawnCaptured.js";

export type CodexShell = "sh" | "cmd" | "powershell" | "pwsh";

/** Whether an executable named `name` is on `PATH`. */
function onPath(name: string): boolean {
  const file = process.platform === "win32" ? `${name}.exe` : name;
  return (process.env.PATH ?? "")
    .split(path.delimiter)
    .some((dir) => dir !== "" && existsSync(path.join(dir, file)));
}

function platformShells(): CodexShell[] {
  if (process.platform !== "win32") return ["sh"];
  const shells: CodexShell[] = ["sh", "cmd", "powershell"];
  if (onPath("pwsh")) shells.push("pwsh");
  return shells;
}

/** The shells whose Codex line this platform can run. */
export const CODEX_SHELLS: readonly CodexShell[] = platformShells();

/** The line Codex runs for `entry` on this platform. */
export function codexLine(entry: Readonly<Record<string, unknown>>): string {
  const windows = process.platform === "win32" ? entry.commandWindows : undefined;
  const line = typeof windows === "string" ? windows : entry.command;
  if (typeof line !== "string") throw new Error("entry has no command string");
  return line;
}

/** What `shell` reports for the entry's line, run in `cwd` with `input` on stdin. */
export async function runCodexLine(
  entry: Readonly<Record<string, unknown>>,
  shell: CodexShell,
  cwd: string,
  input: string,
): Promise<Spawned> {
  const line = codexLine(entry);
  switch (shell) {
    case "sh":
      return await spawnCaptured("sh", ["-c", line], { cwd, input });
    case "cmd":
      return await spawnCaptured(process.env.ComSpec ?? "cmd.exe", ["/C", `"${line}"`], {
        cwd,
        input,
        windowsVerbatimArguments: true,
      });
    case "powershell":
    case "pwsh":
      return await spawnCaptured(shell, ["-NoProfile", "-Command", line], { cwd, input });
  }
}

/** What every shell of this platform reports for the entry's line, run side by side. */
export async function runOnEveryShell(
  entry: Readonly<Record<string, unknown>>,
  cwd: string,
  input: string,
): Promise<{ readonly shell: CodexShell; readonly result: Spawned }[]> {
  return await Promise.all(
    CODEX_SHELLS.map(async (shell) => ({
      shell,
      result: await runCodexLine(entry, shell, cwd, input),
    })),
  );
}
