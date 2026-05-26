import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";

/**
 * Playwright launcher resolver.
 *
 * Probe order (from least surprising to most-deprecated):
 *   1. `playwright` — project-local `node_modules/.bin/playwright`
 *      (Windows shims: `.cmd` / `.bat` / `.ps1`), then PATH.
 *   2. `npx --no-install playwright --version` — fallback when a partial
 *      node_modules tree is present but no direct shim exists.
 *   3. `playwright-cli` — deprecated probe. Still accepted during the
 *      deprecation window (sunset: 1.10.0). When resolved through this
 *      stage the doctor emits `D-DEPRECATED-PROBE` (severity warning).
 *
 * The legacy export `resolvePlaywrightCliLauncher` is retained as a thin
 * alias for the deprecation window so external callers do not break.
 */

export type PlaywrightLauncherStage = "primary" | "npx-fallback" | "deprecated-cli";

export type PlaywrightLauncherOrigin =
  | "project-wrapper"
  | "node_modules/.bin"
  | "PATH"
  | "npx --no-install";

export type PlaywrightLauncherCandidate = {
  stage: PlaywrightLauncherStage;
  origin: PlaywrightLauncherOrigin;
  executable: string;
  args: string[];
  path?: string;
};

export type PlaywrightLauncherProbe = {
  ok: boolean;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  durationMs: number;
  stdout: string;
  stderr: string;
  error?: string;
};

export type PlaywrightLauncherAttempt = PlaywrightLauncherCandidate & {
  displayCommand: string;
  probe: PlaywrightLauncherProbe;
};

export type PlaywrightLauncherResolution = {
  status: "resolved" | "not_found" | "not_runnable";
  lookedIn: {
    scriptsDir: string;
    localBinDir: string;
    path: string;
  };
  attempts: PlaywrightLauncherAttempt[];
  resolved?: PlaywrightLauncherAttempt;
};

type ResolveOptions = {
  timeoutMs?: number;
};

const PRIMARY_NAME = "playwright";
const DEPRECATED_NAME = "playwright-cli";
const PROJECT_WRAPPER_CANDIDATES_PRIMARY = [
  "playwright",
  "playwright.cmd",
  "playwright.bat",
  "playwright.ps1",
] as const;
const PROJECT_WRAPPER_CANDIDATES_DEPRECATED = [
  "playwright-cli",
  "playwright-cli.cmd",
  "playwright-cli.bat",
] as const;

/** Canonical probe order used by doctor for documentation / observability. */
export function getProbeOrder(): string[] {
  return ["playwright", "npx fallback", "playwright-cli (deprecated)"];
}

export async function resolvePlaywrightLauncher(
  root: string,
  options: ResolveOptions = {},
): Promise<PlaywrightLauncherResolution> {
  const timeoutMs = options.timeoutMs ?? 5_000;
  const scriptsDir = path.join(root, "scripts");
  const localBinDir = path.join(root, "node_modules", ".bin");
  const lookedIn = {
    scriptsDir,
    localBinDir,
    path: process.env.PATH ?? "",
  };
  const candidates = await collectCandidates(root);
  const attempts: PlaywrightLauncherAttempt[] = [];

  if (candidates.length === 0) {
    return {
      status: "not_found",
      lookedIn,
      attempts,
    };
  }

  for (const candidate of candidates) {
    const probe = await probeCandidate(candidate, timeoutMs);
    const attempt: PlaywrightLauncherAttempt = {
      ...candidate,
      displayCommand: renderCommand(candidate.executable, candidate.args),
      probe,
    };
    attempts.push(attempt);
    if (probe.ok) {
      return {
        status: "resolved",
        lookedIn,
        attempts,
        resolved: attempt,
      };
    }
  }

  return {
    status: "not_runnable",
    lookedIn,
    attempts,
  };
}

/**
 * Deprecated alias. Retained during the deprecation window so external
 * callers continue to compile; new code MUST use `resolvePlaywrightLauncher`.
 * Sunset: 1.10.0.
 *
 * @deprecated Use `resolvePlaywrightLauncher` instead.
 */
export async function resolvePlaywrightCliLauncher(
  root: string,
  options: ResolveOptions = {},
): Promise<PlaywrightLauncherResolution> {
  return resolvePlaywrightLauncher(root, options);
}

async function collectCandidates(root: string): Promise<PlaywrightLauncherCandidate[]> {
  const scriptsDir = path.join(root, "scripts");
  const localBinDir = path.join(root, "node_modules", ".bin");
  return [
    ...(await collectPrimaryCandidates(scriptsDir, localBinDir)),
    ...(await collectNpxCandidates()),
    ...(await collectDeprecatedCandidates(scriptsDir, localBinDir)),
  ];
}

async function collectPrimaryCandidates(
  scriptsDir: string,
  localBinDir: string,
): Promise<PlaywrightLauncherCandidate[]> {
  const candidates: PlaywrightLauncherCandidate[] = [];
  for (const fileName of PROJECT_WRAPPER_CANDIDATES_PRIMARY) {
    const wrapperPath = path.join(scriptsDir, fileName);
    if (await exists(wrapperPath)) {
      candidates.push({
        stage: "primary",
        origin: "project-wrapper",
        executable: wrapperPath,
        args: [],
        path: wrapperPath,
      });
    }
  }
  const localPrimary = await findCommandInDir(localBinDir, PRIMARY_NAME);
  if (localPrimary) {
    candidates.push({
      stage: "primary",
      origin: "node_modules/.bin",
      executable: localPrimary,
      args: [],
      path: localPrimary,
    });
  }
  for (const pathCandidate of await findCommandsInPath(PRIMARY_NAME)) {
    candidates.push({
      stage: "primary",
      origin: "PATH",
      executable: pathCandidate,
      args: [],
      path: pathCandidate,
    });
  }
  return candidates;
}

async function collectNpxCandidates(): Promise<PlaywrightLauncherCandidate[]> {
  const candidates: PlaywrightLauncherCandidate[] = [];
  for (const npxCandidate of await findCommandsInPath("npx")) {
    candidates.push({
      stage: "npx-fallback",
      origin: "npx --no-install",
      executable: npxCandidate,
      args: ["--no-install", PRIMARY_NAME, "--version"],
      path: npxCandidate,
    });
  }
  return candidates;
}

async function collectDeprecatedCandidates(
  scriptsDir: string,
  localBinDir: string,
): Promise<PlaywrightLauncherCandidate[]> {
  const candidates: PlaywrightLauncherCandidate[] = [];
  for (const fileName of PROJECT_WRAPPER_CANDIDATES_DEPRECATED) {
    const wrapperPath = path.join(scriptsDir, fileName);
    if (await exists(wrapperPath)) {
      candidates.push({
        stage: "deprecated-cli",
        origin: "project-wrapper",
        executable: wrapperPath,
        args: [],
        path: wrapperPath,
      });
    }
  }
  const localDeprecated = await findCommandInDir(localBinDir, DEPRECATED_NAME);
  if (localDeprecated) {
    candidates.push({
      stage: "deprecated-cli",
      origin: "node_modules/.bin",
      executable: localDeprecated,
      args: [],
      path: localDeprecated,
    });
  }
  for (const pathCandidate of await findCommandsInPath(DEPRECATED_NAME)) {
    candidates.push({
      stage: "deprecated-cli",
      origin: "PATH",
      executable: pathCandidate,
      args: [],
      path: pathCandidate,
    });
  }
  for (const npxCandidate of await findCommandsInPath("npx")) {
    candidates.push({
      stage: "deprecated-cli",
      origin: "npx --no-install",
      executable: npxCandidate,
      args: ["--no-install", DEPRECATED_NAME],
      path: npxCandidate,
    });
  }
  return candidates;
}

async function probeCandidate(
  candidate: PlaywrightLauncherCandidate,
  timeoutMs: number,
): Promise<PlaywrightLauncherProbe> {
  const startedAt = Date.now();
  const args = buildProbeArgs(candidate);
  return spawnProbe(candidate, args, timeoutMs, startedAt);
}

function buildProbeArgs(candidate: PlaywrightLauncherCandidate): string[] {
  // Primary/deprecated direct shims still accept `--help`; npx fallback already
  // bakes `--version` into args.
  return candidate.stage === "npx-fallback" ? [...candidate.args] : [...candidate.args, "--help"];
}

function spawnProbe(
  candidate: PlaywrightLauncherCandidate,
  args: string[],
  timeoutMs: number,
  startedAt: number,
): Promise<PlaywrightLauncherProbe> {
  return new Promise((resolve) => {
    const child = spawnProbeChild(candidate, args);
    const state: ProbeState = {
      stdout: "",
      stderr: "",
      settled: false,
      timedOut: false,
      closed: false,
    };
    const finish = (result: Omit<PlaywrightLauncherProbe, "durationMs">): void => {
      if (state.settled) {
        return;
      }
      state.settled = true;
      if (state.timeout) {
        clearTimeout(state.timeout);
      }
      resolve({ ...result, durationMs: Date.now() - startedAt });
    };
    state.timeout = scheduleProbeTimeout(child, state, timeoutMs, finish);
    wireProbeStreams(child, state, timeoutMs, finish);
  });
}

function spawnProbeChild(
  candidate: PlaywrightLauncherCandidate,
  args: string[],
): ReturnType<typeof spawn> {
  const useCmdShim = process.platform === "win32" && /\.(cmd|bat|ps1)$/i.test(candidate.executable);
  if (useCmdShim) {
    return spawn(
      process.env.ComSpec ?? "cmd.exe",
      ["/d", "/s", "/c", toCmdCommand(candidate, args)],
      { stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
    );
  }
  return spawn(candidate.executable, args, {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
}

function scheduleProbeTimeout(
  child: ReturnType<typeof spawn>,
  state: ProbeState,
  timeoutMs: number,
  finish: (result: Omit<PlaywrightLauncherProbe, "durationMs">) => void,
): NodeJS.Timeout {
  return setTimeout(() => {
    state.timedOut = true;
    terminateTimedOutChild(child);
    state.escalateTimeout = setTimeout(
      () => {
        if (state.closed) {
          return;
        }
        terminateTimedOutChild(child, "SIGKILL");
      },
      Math.min(250, timeoutMs),
    );
    state.escalateTimeout.unref();
    finish({
      ok: false,
      exitCode: null,
      signal: null,
      timedOut: true,
      stdout: state.stdout,
      stderr: state.stderr,
      error: `timed out after ${timeoutMs}ms`,
    });
  }, timeoutMs);
}

function wireProbeStreams(
  child: ReturnType<typeof spawn>,
  state: ProbeState,
  timeoutMs: number,
  finish: (result: Omit<PlaywrightLauncherProbe, "durationMs">) => void,
): void {
  child.stdout?.on("data", (chunk: Buffer | string) => {
    state.stdout = appendOutput(state.stdout, chunk);
  });
  child.stderr?.on("data", (chunk: Buffer | string) => {
    state.stderr = appendOutput(state.stderr, chunk);
  });
  child.on("error", (error) => {
    finish({
      ok: false,
      exitCode: null,
      signal: null,
      timedOut: false,
      stdout: state.stdout,
      stderr: state.stderr,
      error: error.message,
    });
  });
  child.on("close", (exitCode, signal) => {
    state.closed = true;
    if (state.escalateTimeout) {
      clearTimeout(state.escalateTimeout);
    }
    finish({
      ok: !state.timedOut && exitCode === 0,
      exitCode,
      signal,
      timedOut: state.timedOut,
      stdout: state.stdout,
      stderr: state.stderr,
      ...(state.timedOut ? { error: `timed out after ${timeoutMs}ms` } : {}),
    });
  });
}

type ProbeState = {
  stdout: string;
  stderr: string;
  settled: boolean;
  timedOut: boolean;
  closed: boolean;
  escalateTimeout?: NodeJS.Timeout;
  timeout?: NodeJS.Timeout;
};

function quoteCmdArg(value: string): string {
  if (!/[\s"&<>|^]/.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '\\"')}"`;
}

function toCmdCommand(candidate: PlaywrightLauncherCandidate, args: string[]): string {
  return [quoteCmdArg(candidate.executable), ...args.map(quoteCmdArg)].join(" ");
}

function terminateTimedOutChild(child: ReturnType<typeof spawn>, signal?: NodeJS.Signals): void {
  child.unref();
  child.stdout?.destroy();
  child.stderr?.destroy();
  try {
    child.kill(signal);
  } catch {
    // Probe cleanup must not mask the original timeout failure.
  }
}

async function findCommandsInPath(command: string): Promise<string[]> {
  const searchPath = process.env.PATH ?? "";
  const dirs = searchPath.split(path.delimiter).filter((entry) => entry.length > 0);
  const matches: string[] = [];
  const seen = new Set<string>();
  for (const dir of dirs) {
    const candidate = await findCommandInDir(dir, command);
    if (candidate && !seen.has(candidate)) {
      seen.add(candidate);
      matches.push(candidate);
    }
  }
  return matches;
}

async function findCommandInDir(dir: string, command: string): Promise<string | null> {
  for (const fileName of commandCandidates(command)) {
    const candidate = path.join(dir, fileName);
    if (await exists(candidate)) {
      return candidate;
    }
  }
  return null;
}

function commandCandidates(command: string): string[] {
  if (process.platform === "win32") {
    return [`${command}.cmd`, `${command}.exe`, `${command}.bat`, `${command}.ps1`, command];
  }
  return [command, `${command}.cmd`, `${command}.exe`, `${command}.bat`];
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function appendOutput(current: string, chunk: Buffer | string): string {
  const next = current + String(chunk);
  return next.length > 4_000 ? next.slice(-4_000) : next;
}

function renderCommand(executable: string, args: string[]): string {
  return [quoteToken(executable), ...args.map((arg) => quoteToken(arg))].join(" ");
}

function quoteToken(value: string): string {
  return /^[A-Za-z0-9._:\\/-]+$/.test(value) ? value : JSON.stringify(value);
}
