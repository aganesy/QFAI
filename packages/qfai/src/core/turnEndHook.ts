import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { findConfigRoot, loadConfig, readStopGate, resolvePath } from "./config.js";

/** One Standard command the project marks for turn end. */
export interface TurnEndCheck {
  readonly label: string;
  readonly command: string;
}

export interface TurnEndOptions {
  /** Where the hook process runs; the config search starts here when the event names no `cwd`. */
  readonly processDir: string;
  /** Where the last blocked failure of each session is kept. */
  readonly stateDir: string;
  /** How long one command may run. */
  readonly timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 60_000;
const TAIL_LINES = 40;
const TAIL_CHARS = 4000;
/** Output kept while a command runs; only the tail is ever reported. */
const KEEP_CHARS = 64 * 1024;
const COMMANDS_HEADING = /^##\s+Standard commands\b/i;
const TURN_END_LABEL = "turn-end check";

/**
 * The commands the Standard commands section of a tech.md marks for turn end, in the order its
 * `Turn-end check:` item lists their labels. A label the section does not list is skipped.
 */
export function readTurnEndChecks(techText: string): TurnEndCheck[] {
  const commands = new Map<string, string>();
  let marked: string[] = [];
  let inSection = false;
  for (const line of techText.split(/\r?\n/)) {
    if (/^#{1,2}\s/.test(line)) {
      inSection = COMMANDS_HEADING.test(line);
      continue;
    }
    if (!inSection) continue;
    const item = /^\s*-\s+([^:`]+):\s*(.*)$/.exec(line);
    if (item === null) continue;
    const label = (item[1] ?? "").trim();
    const rest = item[2] ?? "";
    if (label.toLowerCase() === TURN_END_LABEL) {
      marked = rest
        .split(",")
        .map((name) => name.replace(/`/g, "").trim())
        .filter((name) => name !== "");
      continue;
    }
    const command = /`([^`]+)`/.exec(rest)?.[1];
    if (command !== undefined) commands.set(label.toLowerCase(), command);
  }
  const checks: TurnEndCheck[] = [];
  for (const label of marked) {
    const command = commands.get(label.toLowerCase());
    if (command !== undefined) checks.push({ label, command });
  }
  return checks;
}

interface CommandResult {
  readonly code: number | null;
  readonly output: string;
  readonly timedOut: boolean;
}

/**
 * Stops a command and everything it started. A shell does not pass its own termination on to
 * the program it runs, so the whole tree is stopped: by process group on POSIX, by `taskkill /T`
 * on Windows.
 */
function stopTree(child: ChildProcess): void {
  const pid = child.pid;
  if (pid === undefined) return;
  try {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { windowsHide: true });
    } else {
      process.kill(-pid, "SIGKILL");
    }
  } catch {
    child.kill("SIGKILL");
  }
}

function runCommand(command: string, cwd: string, timeoutMs: number): Promise<CommandResult> {
  return new Promise((resolve) => {
    let output = "";
    let settled = false;
    const finish = (result: CommandResult): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const child = spawn(command, {
      cwd,
      shell: true,
      windowsHide: true,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const collect = (chunk: Buffer): void => {
      output = (output + chunk.toString("utf8")).slice(-KEEP_CHARS);
    };
    child.stdout?.on("data", collect);
    child.stderr?.on("data", collect);
    const timer = setTimeout(() => {
      stopTree(child);
      child.stdout?.destroy();
      child.stderr?.destroy();
      finish({ code: null, output, timedOut: true });
    }, timeoutMs);
    child.on("error", (error) => {
      finish({ code: null, output: `${output}${error.message}\n`, timedOut: false });
    });
    child.on("close", (code) => {
      finish({ code, output, timedOut: false });
    });
  });
}

/** The last lines of a command's output, within both bounds. */
function tail(output: string): string {
  const lines = output.replace(/\s+$/, "").split(/\r?\n/);
  return lines.slice(-TAIL_LINES).join("\n").slice(-TAIL_CHARS);
}

function stateFile(stateDir: string, session: string, agent: string): string {
  const name = ["qfai-turn-end", session, agent].join("-").replace(/[^\w.-]/g, "_");
  return path.join(stateDir, name);
}

async function readState(file: string | null): Promise<string | null> {
  if (file === null) return null;
  try {
    return (await readFile(file, "utf8")).trim();
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(event: Record<string, unknown>, key: string): string | undefined {
  const value = event[key];
  return typeof value === "string" && value !== "" ? value : undefined;
}

/**
 * What the turn-end hook prints for one Stop or SubagentStop event: an empty string to let the
 * turn end silently, or one JSON object that blocks the stop or releases it with a message.
 */
export async function runTurnEndHook(input: unknown, options: TurnEndOptions): Promise<string> {
  const event = isRecord(input) ? input : {};
  const found = await findConfigRoot(stringField(event, "cwd") ?? options.processDir);
  if (!found.found) return "";
  const loaded = await loadConfig(found.root);
  if (readStopGate(loaded.document) !== true) return "";
  let techText: string;
  try {
    techText = await readFile(
      path.join(resolvePath(found.root, loaded.config, "contractsDir"), "tech.md"),
      "utf8",
    );
  } catch {
    return "";
  }
  const checks = readTurnEndChecks(techText);
  const session = stringField(event, "session_id");
  const file =
    session === undefined
      ? null
      : stateFile(options.stateDir, session, stringField(event, "agent_id") ?? "main");
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  for (const check of checks) {
    const result = await runCommand(check.command, found.root, timeoutMs);
    if (!result.timedOut && result.code === 0) continue;
    const shown = tail(result.output);
    const ending = result.timedOut
      ? `did not finish within ${Math.round(timeoutMs / 1000)} seconds`
      : `ended with exit ${result.code ?? "unknown"}`;
    const digest = createHash("sha256")
      .update([check.label, ending, shown].join("\n").replace(/\d+/g, "#"))
      .digest("hex");
    const repeated =
      file === null ? event.stop_hook_active === true : (await readState(file)) === digest;
    if (repeated) {
      if (file !== null) await rm(file, { force: true });
      return `${JSON.stringify({
        systemMessage: `QFAI turn-end check: ${check.label} still fails the same way, so the hook stopped blocking. Run ${check.command} to see the failure.`,
      })}\n`;
    }
    if (file !== null) await writeFile(file, digest, "utf8");
    const reason = [
      `The turn-end check ${check.label} failed: ${check.command} ${ending}.`,
      shown === "" ? "It printed nothing." : `End of its output:\n${shown}`,
      "Fix the cause before ending the turn. The check is listed under Turn-end check in tech.md.",
    ].join("\n\n");
    return `${JSON.stringify({ decision: "block", reason })}\n`;
  }
  if (file !== null) await rm(file, { force: true });
  return "";
}
