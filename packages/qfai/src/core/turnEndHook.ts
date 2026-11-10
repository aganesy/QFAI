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
/** How long output is still read after a command exits, for a child that keeps the pipes open. */
const EXIT_GRACE_MS = 1000;
/** Blocks in one continued turn after which the hook lets the turn end whatever the failure. */
const MAX_CONTINUED_BLOCKS = 3;
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
  readonly signal: NodeJS.Signals | null;
  /** stdout and stderr in the order they arrived, as shown to the agent. */
  readonly output: string;
  /** stdout, then stderr: the same failure gives the same text whatever the interleaving. */
  readonly ordered: string;
  readonly timedOut: boolean;
}

/**
 * Stops a command and everything it started. A shell does not pass its own termination on to
 * the program it runs, so the whole tree is stopped: by process group on POSIX, by `taskkill /T`
 * on Windows, falling back to the shell alone where neither works.
 */
function stopTree(child: ChildProcess): void {
  const pid = child.pid;
  if (pid === undefined) return;
  try {
    if (process.platform === "win32") {
      const killed = spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], {
        windowsHide: true,
      });
      if (killed.status !== 0) child.kill("SIGKILL");
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
    let stdout = "";
    let stderr = "";
    let settled = false;
    let grace: ReturnType<typeof setTimeout> | undefined;
    const child = spawn(command, {
      cwd,
      shell: true,
      windowsHide: true,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const finish = (
      code: number | null,
      signal: NodeJS.Signals | null,
      timedOut: boolean,
      extra = "",
    ): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(grace);
      child.stdout.destroy();
      child.stderr.destroy();
      resolve({
        code,
        signal,
        output: output + extra,
        ordered: stdout + stderr + extra,
        timedOut,
      });
    };
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      output = (output + chunk).slice(-KEEP_CHARS);
      stdout = (stdout + chunk).slice(-KEEP_CHARS);
    });
    child.stderr.on("data", (chunk: string) => {
      output = (output + chunk).slice(-KEEP_CHARS);
      stderr = (stderr + chunk).slice(-KEEP_CHARS);
    });
    const timer = setTimeout(() => {
      stopTree(child);
      finish(null, null, true);
    }, timeoutMs);
    child.on("error", (error) => {
      finish(null, null, false, `${error.message}\n`);
    });
    // The exit code is settled when the command exits. A program it left running may still hold
    // the pipes, so the output is read a little longer and, on POSIX, what is left of the process
    // group is stopped.
    // SIMPLIFIED: on Windows the tree cannot be reached once the shell has exited: `taskkill /T`
    // needs a live root, and the shell's pid may already be reused. The leftover program keeps
    // running. Lift with a Job Object that holds the whole tree.
    child.on("exit", (code, signal) => {
      clearTimeout(timer);
      grace = setTimeout(() => {
        if (process.platform !== "win32") stopTree(child);
        finish(code, signal, false);
      }, EXIT_GRACE_MS);
    });
    child.on("close", (code, signal) => {
      finish(code, signal, false);
    });
  });
}

/** How a failed command ended, in words. */
function endingOf(result: CommandResult, timeoutMs: number): string {
  if (result.timedOut) {
    const seconds = Math.max(1, Math.round(timeoutMs / 1000));
    return `did not finish within ${seconds} second${seconds === 1 ? "" : "s"}`;
  }
  if (result.code !== null) return `ended with exit ${result.code}`;
  return result.signal === null ? "ended with exit unknown" : `was stopped by ${result.signal}`;
}

/** The last lines of a command's output, within both bounds. */
function tail(output: string): string {
  const lines = output.replace(/\s+$/, "").split(/\r?\n/);
  return lines.slice(-TAIL_LINES).join("\n").slice(-TAIL_CHARS);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(event: Record<string, unknown>, key: string): string | undefined {
  const value = event[key];
  return typeof value === "string" && value !== "" ? value : undefined;
}

/**
 * Whose turn a state file belongs to. A subagent's stop is kept apart from the main agent's even
 * when the host sends no agent id, so a subagent's block never releases the main agent's turn.
 */
function agentKey(event: Record<string, unknown>): string {
  const agent = stringField(event, "agent_id");
  if (agent !== undefined) return agent;
  return event.hook_event_name === "SubagentStop" ? "subagent" : "main";
}

function stateFile(stateDir: string, session: string, agent: string): string {
  const name = ["qfai-turn-end", session, agent].join("-").replace(/[^\w.-]/g, "_");
  return path.join(stateDir, name);
}

/** The failure the hook last blocked on for one session and agent, and the blocks in a row. */
interface BlockState {
  readonly digest: string;
  readonly blocks: number;
}

async function readState(file: string | null): Promise<BlockState | null> {
  if (file === null) return null;
  try {
    const value: unknown = JSON.parse(await readFile(file, "utf8"));
    if (!isRecord(value)) return null;
    const { digest, blocks } = value;
    return typeof digest === "string" && typeof blocks === "number" ? { digest, blocks } : null;
  } catch {
    return null;
  }
}

/**
 * What the turn-end hook prints for one Stop or SubagentStop event: an empty string to let the
 * turn end silently, or one JSON object that blocks the stop or lets it through with a message.
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
  } catch (error) {
    // A project without tech.md lists no check; any other read error is reported by the caller.
    if (isRecord(error) && error.code === "ENOENT") return "";
    throw error;
  }
  const checks = readTurnEndChecks(techText);
  const session = stringField(event, "session_id");
  const file = session === undefined ? null : stateFile(options.stateDir, session, agentKey(event));
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  for (const check of checks) {
    const result = await runCommand(check.command, found.root, timeoutMs);
    if (!result.timedOut && result.code === 0) continue;
    const shown = tail(result.output);
    const ending = endingOf(result, timeoutMs);
    const digest = createHash("sha256")
      .update([check.label, ending, tail(result.ordered)].join("\n").replace(/\d+/g, "#"))
      .digest("hex");
    const continued = event.stop_hook_active === true;
    const last = await readState(file);
    const blocks = continued && last !== null ? last.blocks + 1 : 1;
    const release =
      file === null
        ? continued
        : continued && (last?.digest === digest || blocks > MAX_CONTINUED_BLOCKS);
    if (release) {
      if (file !== null) await rm(file, { force: true });
      return `${JSON.stringify({
        systemMessage: `QFAI turn-end check: ${check.label} still fails, and the turn ended anyway. Run ${check.command} in ${found.root} to see the failure.`,
      })}\n`;
    }
    if (file !== null) await writeFile(file, JSON.stringify({ digest, blocks }), "utf8");
    const reason = [
      `The turn-end check ${check.label} failed: ${check.command} ${ending}.`,
      shown === "" ? "It printed nothing." : `End of its output:\n${shown}`,
      event.hook_event_name === "SubagentStop"
        ? "Fix the cause before ending the turn. If fixing it is outside your task, say so in your reply and end the turn. The check is listed under Turn-end check in tech.md."
        : "Fix the cause before ending the turn. The check is listed under Turn-end check in tech.md.",
    ].join("\n\n");
    return `${JSON.stringify({ decision: "block", reason })}\n`;
  }
  if (file !== null) await rm(file, { force: true });
  return "";
}
