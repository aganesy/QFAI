import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";

export type PlaywrightCliLauncherOrigin =
  | "project-wrapper"
  | "node_modules/.bin"
  | "PATH"
  | "npx --no-install";

export type PlaywrightCliLauncherCandidate = {
  origin: PlaywrightCliLauncherOrigin;
  executable: string;
  args: string[];
  path?: string;
};

export type PlaywrightCliLauncherProbe = {
  ok: boolean;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  durationMs: number;
  stdout: string;
  stderr: string;
  error?: string;
};

export type PlaywrightCliLauncherAttempt = PlaywrightCliLauncherCandidate & {
  displayCommand: string;
  probe: PlaywrightCliLauncherProbe;
};

export type PlaywrightCliLauncherResolution = {
  status: "resolved" | "not_found" | "not_runnable";
  lookedIn: {
    scriptsDir: string;
    localBinDir: string;
    path: string;
  };
  attempts: PlaywrightCliLauncherAttempt[];
  resolved?: PlaywrightCliLauncherAttempt;
};

type ResolvePlaywrightCliLauncherOptions = {
  timeoutMs?: number;
};

const PROJECT_WRAPPER_CANDIDATES = [
  "playwright-cli",
  "playwright-cli.cmd",
  "playwright-cli.bat",
] as const;

export async function resolvePlaywrightCliLauncher(
  root: string,
  options: ResolvePlaywrightCliLauncherOptions = {},
): Promise<PlaywrightCliLauncherResolution> {
  const timeoutMs = options.timeoutMs ?? 5_000;
  const scriptsDir = path.join(root, "scripts");
  const localBinDir = path.join(root, "node_modules", ".bin");
  const lookedIn = {
    scriptsDir,
    localBinDir,
    path: process.env.PATH ?? "",
  };
  const candidates = await collectCandidates(root);
  const attempts: PlaywrightCliLauncherAttempt[] = [];

  if (candidates.length === 0) {
    return {
      status: "not_found",
      lookedIn,
      attempts,
    };
  }

  for (const candidate of candidates) {
    const probe = await probeLauncherCandidate(candidate, timeoutMs);
    const attempt = {
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

async function collectCandidates(root: string): Promise<PlaywrightCliLauncherCandidate[]> {
  const candidates: PlaywrightCliLauncherCandidate[] = [];
  const scriptsDir = path.join(root, "scripts");
  const localBinDir = path.join(root, "node_modules", ".bin");

  for (const fileName of PROJECT_WRAPPER_CANDIDATES) {
    const wrapperPath = path.join(scriptsDir, fileName);
    if (await exists(wrapperPath)) {
      candidates.push({
        origin: "project-wrapper",
        executable: wrapperPath,
        args: [],
        path: wrapperPath,
      });
    }
  }

  const localCandidate = await findCommandInDir(localBinDir, "playwright-cli");
  if (localCandidate) {
    candidates.push({
      origin: "node_modules/.bin",
      executable: localCandidate,
      args: [],
      path: localCandidate,
    });
  }

  const pathCandidate = await findCommandInPath("playwright-cli");
  if (pathCandidate) {
    candidates.push({
      origin: "PATH",
      executable: pathCandidate,
      args: [],
      path: pathCandidate,
    });
  }

  const npxCandidate = await findCommandInPath("npx");
  if (npxCandidate) {
    candidates.push({
      origin: "npx --no-install",
      executable: npxCandidate,
      args: ["--no-install", "playwright-cli"],
      path: npxCandidate,
    });
  }

  return candidates;
}

async function probeLauncherCandidate(
  candidate: PlaywrightCliLauncherCandidate,
  timeoutMs: number,
): Promise<PlaywrightCliLauncherProbe> {
  const startedAt = Date.now();
  const args = [...candidate.args, "--help"];
  const useShell = process.platform === "win32" && /\.(cmd|bat)$/i.test(candidate.executable);

  return new Promise((resolve) => {
    const child = spawn(candidate.executable, args, {
      shell: useShell,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;
    let closed = false;
    let escalateTimeout: NodeJS.Timeout | undefined;

    const finish = (result: Omit<PlaywrightCliLauncherProbe, "durationMs">) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      resolve({
        ...result,
        durationMs: Date.now() - startedAt,
      });
    };

    const timeout = setTimeout(() => {
      timedOut = true;
      terminateTimedOutChild(child);
      escalateTimeout = setTimeout(
        () => {
          if (closed) {
            return;
          }
          terminateTimedOutChild(child, "SIGKILL");
        },
        Math.min(250, timeoutMs),
      );
      escalateTimeout.unref();
      finish({
        ok: false,
        exitCode: null,
        signal: null,
        timedOut: true,
        stdout,
        stderr,
        error: `timed out after ${timeoutMs}ms`,
      });
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout = appendOutput(stdout, chunk);
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr = appendOutput(stderr, chunk);
    });

    child.on("error", (error) => {
      finish({
        ok: false,
        exitCode: null,
        signal: null,
        timedOut: false,
        stdout,
        stderr,
        error: error.message,
      });
    });

    child.on("close", (exitCode, signal) => {
      closed = true;
      if (escalateTimeout) {
        clearTimeout(escalateTimeout);
      }
      finish({
        ok: !timedOut && exitCode === 0,
        exitCode,
        signal,
        timedOut,
        stdout,
        stderr,
        ...(timedOut ? { error: `timed out after ${timeoutMs}ms` } : {}),
      });
    });
  });
}

function terminateTimedOutChild(child: ReturnType<typeof spawn>, signal?: NodeJS.Signals): void {
  child.unref();
  child.stdout?.destroy();
  child.stderr?.destroy();
  try {
    child.kill(signal);
  } catch {
    // Probe cleanup should not mask the original timeout failure.
  }
}

async function findCommandInPath(command: string): Promise<string | null> {
  const searchPath = process.env.PATH ?? "";
  const dirs = searchPath.split(path.delimiter).filter((entry) => entry.length > 0);
  for (const dir of dirs) {
    const candidate = await findCommandInDir(dir, command);
    if (candidate) {
      return candidate;
    }
  }
  return null;
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
    return [`${command}.cmd`, `${command}.exe`, `${command}.bat`, command];
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
