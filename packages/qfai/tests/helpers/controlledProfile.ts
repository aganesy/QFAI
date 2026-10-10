import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { outcomeOf } from "./spawnCaptured.js";

export type ControlledProfileResult = {
  pid: number | null;
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  startedAt: number;
  wallMs: number;
  timedOut: boolean;
  closed: boolean;
  outcome: string;
  terminationErrors: string[];
  error: { name: string; message: string } | null;
};

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function windowsTree(pid: number): Promise<void> {
  const systemRoot = process.env.SystemRoot;
  if (!systemRoot)
    throw new Error("SystemRoot is missing; the owned Windows process tree cannot be terminated");
  await new Promise<void>((resolve, reject) => {
    // Force the complete tree before its root disappears and loses descendant ownership.
    execFile(
      path.join(systemRoot, "System32", "taskkill.exe"),
      ["/PID", String(pid), "/T", "/F"],
      { timeout: 2_000, windowsHide: true },
      (error) => (error === null ? resolve() : reject(error)),
    );
  });
}

/** Only the PID/tree or POSIX group created by this invocation may be terminated. */
export async function runControlledProfile(
  command: string,
  args: readonly string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv; timeoutMs: number; ownGroup?: boolean },
): Promise<ControlledProfileResult> {
  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0)
    throw new Error("A positive profiling deadline is required");
  const startedAt = Date.now();
  const started = performance.now();
  const child = spawn(command, [...args], {
    cwd: options.cwd,
    env: options.env ?? process.env,
    detached: process.platform !== "win32" && options.ownGroup !== false,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const result: ControlledProfileResult = {
    pid: child.pid ?? null,
    code: null,
    signal: null,
    stdout: "",
    stderr: "",
    startedAt,
    wallMs: 0,
    timedOut: false,
    closed: false,
    outcome: "not closed",
    terminationErrors: [],
    error: null,
  };
  let termination: Promise<void> | undefined;
  let deadline: NodeJS.Timeout | undefined;
  let closeGuard: NodeJS.Timeout | undefined;
  const note = (error: unknown) => {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH")
      result.terminationErrors.push(error instanceof Error ? error.message : String(error));
  };
  const killChild = () => {
    try {
      child.kill("SIGKILL");
    } catch (error: unknown) {
      note(error);
    }
  };
  const posixSignal = (signal: NodeJS.Signals) => {
    if (result.pid === null) return;
    try {
      process.kill(options.ownGroup === false ? result.pid : -result.pid, signal);
    } catch (error: unknown) {
      note(error);
    }
  };
  // Event callbacks retain and adopt the termination promise, including rejected native calls.
  const requestStop = (): void => {
    if (termination !== undefined) return;
    termination = (async () => {
      if (result.pid === null) return;
      if (process.platform === "win32") {
        try {
          await windowsTree(result.pid);
        } catch (error: unknown) {
          note(error);
          killChild();
        }
      } else {
        posixSignal("SIGTERM");
        await delay(100);
        // A descendant may ignore SIGTERM even after its parent closes.
        posixSignal("SIGKILL");
      }
    })().catch((error: unknown) => {
      note(error);
      result.error ??= {
        name: "ProfileTerminationFailure",
        message: "Owned process termination failed",
      };
      killChild();
    });
  };
  let retainUnclosed: (() => void) | undefined;
  const closed = new Promise<void>((resolve) => {
    retainUnclosed = resolve;
    child.once("error", (error) => {
      result.error = { name: error.name, message: error.message };
    });
    child.once("close", (code, signal) => {
      result.code = code;
      result.signal = signal;
      result.closed = true;
      result.outcome = outcomeOf(code, signal);
      if (deadline !== undefined) clearTimeout(deadline);
      if (closeGuard !== undefined) clearTimeout(closeGuard);
      resolve();
    });
  });
  let outputBytes = 0;
  const collect = (stream: "stdout" | "stderr", chunk: string) => {
    outputBytes += Buffer.byteLength(chunk);
    if (outputBytes > 32 * 1024 * 1024) {
      result.error = {
        name: "ProfileOutputLimit",
        message: "The profiling child exceeded 32 MiB of output",
      };
      requestStop();
      return;
    }
    result[stream] += chunk;
  };
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => collect("stdout", chunk));
  child.stderr.on("data", (chunk: string) => collect("stderr", chunk));
  deadline = setTimeout(() => {
    result.timedOut = true;
    requestStop();
  }, options.timeoutMs);
  closeGuard = setTimeout(() => {
    result.error = {
      name: "ProfileCleanupDeadline",
      message:
        "The owned child did not close after bounded tree termination; cleanup is unconfirmed",
    };
    killChild();
    child.stdout.destroy();
    child.stderr.destroy();
    child.unref();
    retainUnclosed?.();
  }, options.timeoutMs + 7_000);
  await closed;
  if (termination !== undefined) await termination;
  if (process.platform !== "win32" && options.ownGroup !== false) posixSignal("SIGKILL");
  if (deadline !== undefined) clearTimeout(deadline);
  if (closeGuard !== undefined) clearTimeout(closeGuard);
  result.wallMs = performance.now() - started;
  return result;
}

export class ProfileArtifactError extends Error {
  constructor(
    readonly result: ControlledProfileResult,
    cause: unknown,
  ) {
    super("The profiling result could not be saved", { cause });
    this.name = "ProfileArtifactError";
  }
}

/** A checkpoint is data from the isolated child, including a failed or partial run. */
export async function saveProfileArtifact(
  dir: string,
  result: ControlledProfileResult,
  checkpointFile?: string,
): Promise<string> {
  let checkpoint: unknown = null;
  let checkpointRaw: string | null = null;
  let checkpointError: string | null = null;
  if (checkpointFile !== undefined) {
    try {
      checkpointRaw = await readFile(checkpointFile, "utf8");
      checkpoint = JSON.parse(checkpointRaw) as unknown;
      checkpointRaw = null;
    } catch (error: unknown) {
      checkpointError = error instanceof Error ? error.message : String(error);
    }
  }
  try {
    await mkdir(dir, { recursive: true });
    const file = path.join(
      dir,
      `validation-profile-${process.platform}-${process.version}-${randomUUID()}.json`,
    );
    await writeFile(
      file,
      JSON.stringify(
        {
          node: process.version,
          platform: process.platform,
          process: result,
          checkpoint,
          checkpointRaw,
          checkpointError,
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    return file;
  } catch (error: unknown) {
    throw new ProfileArtifactError(result, error);
  }
}
