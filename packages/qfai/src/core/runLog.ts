import { randomBytes } from "node:crypto";
import {
  chmod,
  lstat,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  utimes,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import type { FailOn, QfaiConfig } from "./config.js";
import { resolvePath } from "./config.js";
import { hasErrnoCode, isEnoent } from "./fs/errno.js";
import { findUnsafeHostFileComponent } from "./init/fsGuards.js";
import { toRelativePath } from "./paths.js";
import { isStoryTreeId, STORY_TREE_ID_KINDS, type StoryTreeIdKind } from "./storyTree/ids.js";
import type { Issue, ValidationResult } from "./types.js";
import { isInside } from "./validators/utils.js";

/**
 * `incomplete` is a run that did not finish. It is a state of its own because
 * `--fail-on never` lets such a run exit 0, and a status derived from the exit
 * code would record it as a pass.
 */
export type RunLogResultStatus = "pass" | "fail" | "incomplete";

type RunLogIssue = {
  code: string;
  path?: string;
  message: string;
  evidence?: string;
};

type TraceabilityNode = {
  id: string;
  layer: string;
  path?: string;
};

export type ValidateRunLog = {
  runId: string;
  reportDir: string;
};

export async function writeValidateRunLog(input: {
  root: string;
  config: QfaiConfig;
  result: ValidationResult;
  startedAt: Date;
  command?: string;
  status?: RunLogResultStatus;
  /**
   * The effective threshold that decided this run's pass/fail. It is the result
   * of the caller reconciling the flag with the config, recorded so a downstream
   * consumer that reads only the artifact can reproduce the basis for `status`.
   * `null` when not passed.
   */
  failOn?: FailOn;
}): Promise<ValidateRunLog> {
  const root = path.resolve(input.root);
  const outDir = resolvePath(root, input.config, "outDir");
  const logPath = path.join(outDir, VALIDATE_LOG_NAME);
  await refuseLinkedDestination(root, logPath, RUN_LOG_LABEL);
  await mkdir(outDir, { recursive: true });
  // Again after `mkdir`, which narrows the window a link swapped in can use
  // but does not close it (see `refuseLinkedDestination`).
  await refuseLinkedDestination(root, logPath, RUN_LOG_LABEL);
  const { runId, reportDir } = await allocateRunReportDir(outDir, input.startedAt);

  const relativeSpecsRoot = toRelativePath(root, resolvePath(root, input.config, "specsDir"));

  const status = resolveStatus(input.result, input.status);
  const errors = toRunLogIssues(root, input.result.issues, "error");
  const warnings = toRunLogIssues(root, input.result.issues, "warning");
  const relativeReportDir = toRelativePath(root, reportDir);

  const runJson = {
    schema_version: 1,
    run_id: runId,
    started_at: input.startedAt.toISOString(),
    command: input.command ?? "/qfai-validate",
    repo_root: ".",
    inputs: {
      specs_root: relativeSpecsRoot,
    },
    outputs: {
      report_dir: relativeReportDir,
    },
    result: {
      status,
      errors: input.result.counts.error,
      warnings: input.result.counts.warning,
      fail_on: input.failOn ?? null,
    },
  };

  const validatorJson = {
    schema_version: 1,
    status,
    errors,
    warnings,
  };

  const traceabilityJson = buildTraceabilityJson(root, input.result.issues);
  const summaryMd = buildSummaryMarkdown({
    runId,
    startedAt: input.startedAt.toISOString(),
    status,
    relativeReportDir,
    errors,
    warnings,
  });

  await writeJson(path.join(reportDir, "run.json"), runJson);
  await writeJson(path.join(reportDir, "validator.json"), validatorJson);
  await writeJson(path.join(reportDir, "traceability.json"), traceabilityJson);
  await writeNewFile(path.join(reportDir, "summary.md"), `${summaryMd}\n`);

  // Validate Hard Gate evidence. Written on every run so it can never go stale:
  // it always points at the newest run-log directory. Relying on `| tee` for it
  // would not do: the Hard Gate command line omits it, and it is not portable to
  // PowerShell.
  await publishLatestRunPointer({
    runRoot: outDir,
    run: { runId, startedAtMs: input.startedAt.getTime() },
    pointerPath: logPath,
    runIdLine: VALIDATE_RUN_ID_LINE,
    startedAtLine: VALIDATE_STARTED_AT_LINE,
    readStartedAtMs: readRunStartedAtMs,
    buildContents: () =>
      `${buildValidateLog({
        runId,
        startedAt: input.startedAt.toISOString(),
        status,
        relativeReportDir,
        command: runJson.command,
        errorCount: input.result.counts.error,
        warningCount: input.result.counts.warning,
        summaryMd,
      })}\n`,
  });

  return {
    runId,
    reportDir,
  };
}

const VALIDATE_LOG_NAME = "validate.log";
const RUN_LOG_LABEL = "qfai validate: the run log";
/** The `- run_id:` and `- started_at:` lines `buildValidateLog` writes. */
export const VALIDATE_RUN_ID_LINE = /^-\s*run_id:\s*(run-\d{17})\s*$/m;
export const VALIDATE_STARTED_AT_LINE = /^-\s*started_at:\s*(\S+)\s*$/m;
const RUN_DIR_RE = /^run-\d{17}$/;

/**
 * Point `pointerPath`, a "latest run" file such as `validate.log` or
 * `preflight_summary.md`, at `run` unless a run that started after it already
 * exists. Every writer of such a pointer goes through here.
 *
 * Two runs on the same root race here. Run directories are named from the
 * run's START time, so a long run A started before a short run B finishes
 * after it, and an unconditional write would leave the pointer on A's older
 * `run-*` directory while B's newer one sits beside it.
 *
 * Two freshness checks decide: a `run-*` directory under `runRoot` for a
 * newer run (a run's directory exists from the moment it is allocated, so a
 * newer run still in flight is seen), and the run the existing pointer names
 * by `runIdLine` and `startedAtLine` (a newer run whose directory was pruned
 * after it wrote). "Newer" is decided by absolute start time, as
 * `startedAfter` says, not by run id: the id is a local timestamp, which a
 * daylight-saving fall-back repeats. An unreadable or unparseable pointer
 * counts as "no newer run", so a truncated or hand-edited file self-heals on
 * the next run.
 *
 * The checks and the write happen under one exclusive guard, so an older run
 * that passed the checks cannot write after a newer run that started checking
 * later. `buildContents` runs inside it, after the checks.
 */
export async function publishLatestRunPointer(input: {
  runRoot: string;
  run: RunStart;
  pointerPath: string;
  runIdLine: RegExp;
  startedAtLine: RegExp;
  readStartedAtMs: RunStartReader;
  buildContents: () => string | Promise<string>;
  /** Overrides for tests; every caller in the package leaves this out. */
  guard?: PointerGuardOptions;
}): Promise<void> {
  await withPointerGuard(
    input.pointerPath,
    async () => {
      if (await hasNewerRunDir(input.runRoot, input.run, input.readStartedAtMs)) return;
      const existing = await readPointerRunStart(input);
      if (existing !== null && startedAfter(existing, input.run)) return;
      await replaceFile(input.pointerPath, await input.buildContents());
    },
    input.guard,
  );
}

async function readPointerRunStart(input: {
  pointerPath: string;
  runIdLine: RegExp;
  startedAtLine: RegExp;
}): Promise<RunStart | null> {
  try {
    return recordedRunStart(
      await readFile(input.pointerPath, "utf-8"),
      input.runIdLine,
      input.startedAtLine,
    );
  } catch {
    return null;
  }
}

/**
 * How old a guard file that names no process must be before a waiting run
 * treats it as abandoned.
 */
const POINTER_GUARD_STALE_MS = 10_000;
/** How long a run waits for the guard before it stops with an error. */
const POINTER_GUARD_WAIT_MS = 30_000;
const POINTER_GUARD_RETRY_MS = 20;

export type PointerGuardOptions = {
  waitMs?: number;
  platform?: NodeJS.Platform;
  /** Creates the guard file exclusively; `writeNewFile` unless a test replaces it. */
  createGuard?: (guardPath: string, contents: string) => Promise<void>;
};

/**
 * Run `action` while holding `<pointerPath>.lock`, a file created exclusively
 * that names this process and a token of this call. A run that finds it held
 * retries until it is released or the wait limit passes. The guarded work is
 * a directory listing, one read and one rename, so a guard whose process no
 * longer exists, or one older than `POINTER_GUARD_STALE_MS` that names no
 * process, was left by a crashed run and is removed. A guard whose process
 * still exists is waited on however old it is.
 *
 * On Windows the exclusive create also fails with `EPERM` or `EACCES` while
 * the previous guard is being deleted, and on some file systems in place of
 * `EEXIST`; there those count as held too.
 *
 * Removing the guard afterwards is best effort and only while it still holds
 * this call's token, so a failed removal never replaces the action's own
 * result or error; the guard it leaves is taken over once its process ends.
 *
 * Ceiling: removing an abandoned guard is itself not exclusive. Two runs that
 * both find the same abandoned guard can both remove it, and the second
 * removal can take away the guard the first has just created. That needs a
 * crashed run and two runs arriving within the same retry interval after it;
 * an atomic compare-and-delete in the file system would lift it. A crashed
 * run whose process id was reused by a live process holds the guard until the
 * wait limit, and the error then names the file to remove.
 */
async function withPointerGuard<T>(
  pointerPath: string,
  action: () => Promise<T>,
  options: PointerGuardOptions = {},
): Promise<T> {
  const guardPath = `${pointerPath}.lock`;
  const createGuard = options.createGuard ?? writeNewFile;
  const platform = options.platform ?? process.platform;
  const owner = JSON.stringify({ pid: process.pid, token: randomBytes(8).toString("hex") });
  const deadline = Date.now() + (options.waitMs ?? POINTER_GUARD_WAIT_MS);
  for (;;) {
    try {
      await createGuard(guardPath, owner);
      break;
    } catch (error) {
      if (!isGuardHeldError(error, platform)) throw error;
    }
    if (await isAbandonedGuard(guardPath)) {
      await rm(guardPath, { force: true });
      continue;
    }
    if (Date.now() >= deadline) throw guardRefusal(guardPath, "is held by another run");
    await delay(POINTER_GUARD_RETRY_MS);
  }
  try {
    return await action();
  } finally {
    await releasePointerGuard(guardPath, owner);
  }
}

function isGuardHeldError(error: unknown, platform: NodeJS.Platform): boolean {
  if (!hasErrnoCode(error)) return false;
  if (error.code === "EEXIST" || error.code === "EISDIR") return true;
  return platform === "win32" && (error.code === "EPERM" || error.code === "EACCES");
}

function guardRefusal(guardPath: string, reason: string): Error {
  return new Error(
    `${guardPath} ${reason}. Remove it if no qfai run is in progress, and run again.`,
  );
}

async function releasePointerGuard(guardPath: string, owner: string): Promise<void> {
  try {
    if ((await readFile(guardPath, "utf-8")) === owner) await rm(guardPath, { force: true });
  } catch {
    // Left for the next run, which takes it over once this process has ended.
  }
}

/**
 * Whether the guard at `guardPath` was left by a crashed run. Throws the
 * guard refusal when something other than a file sits at the guard's name.
 */
async function isAbandonedGuard(guardPath: string): Promise<boolean> {
  let mtimeMs: number;
  let text: string;
  try {
    const stats = await lstat(guardPath);
    if (!stats.isFile()) throw guardRefusal(guardPath, "is not a file");
    mtimeMs = stats.mtimeMs;
    text = await readFile(guardPath, "utf-8");
  } catch (error) {
    // A guard released meanwhile, or one Windows is still deleting, is retried.
    if (hasErrnoCode(error)) return false;
    throw error;
  }
  const pid = guardOwnerPid(text);
  if (pid === undefined) return Date.now() - mtimeMs > POINTER_GUARD_STALE_MS;
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    // `EPERM` means the process exists under another user.
    return hasErrnoCode(error) && error.code === "ESRCH";
  }
}

/** The process id a guard file names, or nothing for one still being written or edited. */
function guardOwnerPid(text: string): number | undefined {
  let owner: unknown;
  try {
    owner = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (typeof owner !== "object" || owner === null || !("pid" in owner)) return undefined;
  const { pid } = owner;
  return typeof pid === "number" && Number.isSafeInteger(pid) && pid > 0 ? pid : undefined;
}

/**
 * Stop before anything is written when the directory `filePath` goes in, a
 * directory between the project root and it, or `filePath` itself is a
 * symbolic link or junction, or when one of those directories is not a
 * directory.
 *
 * `mkdir` and `writeFile` follow a link, so a linked component would put the
 * file, or overwrite another one, wherever the link points. Thrown with the
 * component's path relative to the root, which is the message the operator
 * sees, after `label`, which names what was not written. A directory outside
 * the root is checked from its own name down, since the directories above it
 * are not the project's.
 *
 * Ceiling: this is a check, then writes. Another process that swaps the
 * directory, a directory above it or the new run directory for a link after
 * the check is not caught: `mkdir`, the exclusive creates and the rename all
 * follow a linked parent directory. The exclusive creates and the rename only
 * keep a link at the file name itself from being written through. Closing the
 * window needs directory handles opened without following links, which Node
 * does not offer portably; lift this if it does.
 */
async function refuseLinkedDestination(
  root: string,
  filePath: string,
  label: string,
): Promise<void> {
  const directory = path.dirname(filePath);
  const insideRoot = isInside(root, directory);
  const base = insideRoot ? root : path.dirname(directory);
  const relative = path.relative(base, directory);
  const segments = [...(relative === "" ? [] : relative.split(path.sep)), path.basename(filePath)];
  const unsafe = await findUnsafeHostFileComponent(base, segments);
  if (unsafe === undefined) {
    return;
  }
  const shown = insideRoot ? unsafe.relativePath : path.join(base, unsafe.relativePath);
  const what = unsafe.symlink ? "is a symbolic link or junction" : "is not a directory";
  throw new Error(
    `${label} was not written: ${shown} ${what}. Remove it, create a real directory where one belongs, and run again.`,
  );
}

/**
 * Write the same report, such as `validate.json` and its profile-suffixed
 * sibling, at every path in `filePaths`, refusing a destination reached
 * through a link the way the run log does. Every path is checked by
 * `refuseLinkedDestination` before any of them is written, so one linked path
 * leaves all of them as they were; each is checked again after its directory
 * is created, and replaced by `replaceFile`, so a second name at the path is
 * replaced rather than written through. `label` names the files in the error,
 * as in `qfai validate: the validation result`. The ceiling of
 * `refuseLinkedDestination` applies.
 */
export async function writeReportFiles(
  root: string,
  filePaths: readonly string[],
  contents: string,
  label: string,
): Promise<void> {
  for (const filePath of filePaths) {
    await refuseLinkedDestination(root, filePath, label);
  }
  for (const filePath of filePaths) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await refuseLinkedDestination(root, filePath, label);
    await replaceFile(filePath, contents);
  }
}

/**
 * Put `contents` at `filePath` by writing a new file beside it and renaming it
 * into place. A rename replaces the name, so a link or a hard link at
 * `filePath` is replaced rather than written through, and a reader never sees a
 * half-written file. Exported for every writer of a report file that a link
 * could have replaced, such as the SDD preflight summaries, and for the
 * migration's overwrites of a project's documents.
 *
 * A regular file at `filePath` keeps its permission bits: the new file is
 * created `0600` and widened to them once complete, so its content is never
 * readable under a mode the original did not carry. A link or an absent file
 * gives the new file the default mode.
 *
 * The new file's name does not include the target's, so a target whose name is
 * already near the file system's name length limit can still be replaced.
 */
export async function replaceFile(filePath: string, contents: string): Promise<void> {
  const mode = await regularFileMode(filePath);
  const tempPath = path.join(
    path.dirname(filePath),
    `.qfai-replace-${randomBytes(6).toString("hex")}.tmp`,
  );
  try {
    await writeNewFile(tempPath, contents, mode === undefined ? undefined : 0o600);
    if (mode !== undefined) await chmod(tempPath, mode);
    await rename(tempPath, filePath);
  } finally {
    await rm(tempPath, { force: true });
  }
}

/** The permission bits of the regular file at `filePath`, or nothing for any other entry. */
async function regularFileMode(filePath: string): Promise<number | undefined> {
  try {
    const stats = await lstat(filePath);
    return stats.isFile() ? stats.mode & 0o7777 : undefined;
  } catch (error) {
    if (isEnoent(error)) return undefined;
    throw error;
  }
}

/** Create `filePath`; fail rather than open whatever, a link included, is already there. */
async function writeNewFile(filePath: string, contents: string, mode?: number): Promise<void> {
  await writeFile(filePath, contents, {
    encoding: "utf-8",
    flag: "wx",
    ...(mode === undefined ? {} : { mode }),
  });
}

/** A run, by its id and its absolute start time in epoch milliseconds. */
export type RunStart = { runId: string; startedAtMs: number };

/** The start time a run directory records, in epoch milliseconds, or `null` when it records none. */
export type RunStartReader = (runDir: string) => Promise<number | null>;

/**
 * Whether `candidate` started after `run`.
 *
 * Decided by absolute start time, with the run id breaking a tie. The run id
 * alone does not do: it is `run-<17-digit LOCAL timestamp>`, and a
 * daylight-saving fall-back, or a clock set back, gives a run that starts later
 * a smaller id. The run-log retention check in `qfai doctor --clean` orders runs
 * by the same instant.
 */
export function startedAfter(candidate: RunStart, run: RunStart): boolean {
  if (candidate.startedAtMs !== run.startedAtMs) {
    return candidate.startedAtMs > run.startedAtMs;
  }
  return candidate.runId > run.runId;
}

/**
 * The run a "latest run" pointer's text names: its run id and its start
 * instant, read with the two line patterns the pointer is written with. `null`
 * when either is missing or the instant does not parse, so a truncated or
 * hand-edited pointer counts as naming no run.
 */
export function recordedRunStart(
  text: string,
  runIdLine: RegExp,
  startedAtLine: RegExp,
): RunStart | null {
  const runId = runIdLine.exec(text)?.[1];
  const startedAt = startedAtLine.exec(text)?.[1];
  if (runId === undefined || startedAt === undefined) {
    return null;
  }
  const startedAtMs = Date.parse(startedAt);
  return Number.isFinite(startedAtMs) ? { runId, startedAtMs } : null;
}

/**
 * True when `runRoot` already holds a `run-*` directory for a run that started
 * after `run`, as `startedAfter` decides.
 *
 * `allocateRunDir` creates the directory at the START of a run, so a newer
 * concurrent run is visible here before it finishes. `readStartedAtMs` reads the start time a directory's
 * files record. A directory that records none yet, as one still in flight,
 * counts from its modification time, which `allocateRunDir` sets to the run's
 * start, so an in-flight run and a finished one are compared by the same
 * instant. Directories are read in descending id order and the first newer one
 * ends the scan, which in the usual case reads one directory.
 *
 * Ceiling: between `mkdir` and that `utimes`, and between the moment a run
 * creates its first file and the moment the file is complete, a reader sees
 * the time of that write rather than the run's start, so it may take that run
 * as newer. `publishLatestRunPointer` calls this under its guard once its own
 * run's files are complete, so two runs can no longer each be inside that
 * window while the other checks. What is left needs a run that started
 * earlier to still be allocating its directory while a later run publishes;
 * both then leave the pointer as it was. Recording the start time in the
 * directory atomically with its creation would lift it.
 */
async function hasNewerRunDir(
  runRoot: string,
  run: RunStart,
  readStartedAtMs: RunStartReader,
): Promise<boolean> {
  let entries;
  try {
    entries = await readdir(runRoot, { withFileTypes: true });
  } catch {
    // An unreadable run root cannot prove a newer run exists; fall through to
    // the caller's own pointer guard rather than skipping the write and losing
    // evidence.
    return false;
  }
  const names = entries
    .filter(
      (entry) => entry.isDirectory() && RUN_DIR_RE.test(entry.name) && entry.name !== run.runId,
    )
    .map((entry) => entry.name)
    .sort((a, b) => b.localeCompare(a));
  for (const name of names) {
    const runDir = path.join(runRoot, name);
    const startedAtMs = (await readStartedAtMs(runDir)) ?? (await modifiedAtMs(runDir));
    if (startedAtMs !== null && startedAfter({ runId: name, startedAtMs }, run)) {
      return true;
    }
  }
  return false;
}

/** The modification time of `entryPath`, or `null` when it is gone. */
async function modifiedAtMs(entryPath: string): Promise<number | null> {
  try {
    return (await stat(entryPath)).mtimeMs;
  } catch {
    return null;
  }
}

function hasStartedAt(value: unknown): value is { started_at: unknown } {
  return typeof value === "object" && value !== null && "started_at" in value;
}

/**
 * `run.json#started_at` of the validate run directory `runDir`, in epoch
 * milliseconds. `null` for every failure mode (absent file, unreadable file,
 * invalid JSON, missing or unparseable field), so a caller falls back to an
 * ordering key that is always available rather than drop the run.
 */
export async function readRunStartedAtMs(runDir: string): Promise<number | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(path.join(runDir, "run.json"), "utf-8"));
    if (!hasStartedAt(parsed) || typeof parsed.started_at !== "string") {
      return null;
    }
    const startedAtMs = Date.parse(parsed.started_at);
    return Number.isFinite(startedAtMs) ? startedAtMs : null;
  } catch {
    return null;
  }
}

function buildValidateLog(input: {
  runId: string;
  startedAt: string;
  status: RunLogResultStatus;
  relativeReportDir: string;
  command: string;
  errorCount: number;
  warningCount: number;
  summaryMd: string;
}): string {
  const lines: string[] = [];
  lines.push("# qfai validate log");
  lines.push("");
  lines.push("This file is written by every `qfai validate` run and always points at the newest");
  lines.push("run-log directory. Do not edit it by hand; do not pipe stdout into it.");
  lines.push("");
  lines.push(`- run_id: ${input.runId}`);
  lines.push(`- started_at: ${input.startedAt}`);
  lines.push(`- command: ${input.command}`);
  lines.push(`- status: ${input.status}`);
  lines.push(`- errors: ${input.errorCount}`);
  lines.push(`- warnings: ${input.warningCount}`);
  lines.push(`- run_log: ${input.relativeReportDir}`);
  lines.push("");
  lines.push(input.summaryMd);
  return lines.join("\n");
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeNewFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function resolveStatus(
  result: ValidationResult,
  override?: RunLogResultStatus,
): RunLogResultStatus {
  if (override) {
    return override;
  }
  return result.counts.error > 0 ? "fail" : "pass";
}

function toRunLogIssues(
  root: string,
  issues: Issue[],
  severity: "error" | "warning",
): RunLogIssue[] {
  return issues
    .filter((issue) => issue.severity === severity && !issue.suppressed)
    .map((issue) => {
      const entry: RunLogIssue = {
        code: issue.code,
        message: issue.message,
      };
      if (issue.file) {
        entry.path = toRelativePath(root, issue.file);
      }
      if (issue.refs && issue.refs.length > 0) {
        entry.evidence = issue.refs.join(", ");
      }
      return entry;
    });
}

/**
 * A dashed token standing on its own: no letter, digit, `_` or `-` touches either end, so a
 * longer ID is never read as the shorter ID it starts with. Each token is kept only when
 * `isStoryTreeId` accepts it for one of the story-tree kinds.
 */
const ID_CANDIDATE_REGEX = /(?<![A-Za-z0-9_-])[A-Z]+(?:-[A-Z0-9]+)+(?![A-Za-z0-9_-])/g;

/** Every story-tree ID `ref` names, each with its kind, in the order the text names them. */
function storyTreeIdsIn(ref: string): Array<{ id: string; kind: StoryTreeIdKind }> {
  const ids: Array<{ id: string; kind: StoryTreeIdKind }> = [];
  for (const [id] of ref.matchAll(ID_CANDIDATE_REGEX)) {
    const kind = STORY_TREE_ID_KINDS.find((candidate) => isStoryTreeId(id, candidate));
    if (kind) ids.push({ id, kind });
  }
  return ids;
}

function buildTraceabilityJson(
  root: string,
  issues: Issue[],
): {
  schema_version: number;
  nodes: TraceabilityNode[];
} {
  const nodes = new Map<string, TraceabilityNode>();

  // The IDs findings cite, each with the file of the first finding that cites it.
  for (const issue of issues) {
    for (const ref of issue.refs ?? []) {
      for (const { id, kind } of storyTreeIdsIn(ref)) {
        if (nodes.has(id)) continue;
        const node: TraceabilityNode = { id, layer: kind };
        if (issue.file) {
          node.path = toRelativePath(root, issue.file);
        }
        nodes.set(id, node);
      }
    }
  }

  return {
    schema_version: 1,
    nodes: Array.from(nodes.values()).sort((a, b) => a.id.localeCompare(b.id)),
  };
}

function buildSummaryMarkdown(input: {
  runId: string;
  startedAt: string;
  status: RunLogResultStatus;
  relativeReportDir: string;
  errors: RunLogIssue[];
  warnings: RunLogIssue[];
}): string {
  const lines: string[] = [];
  lines.push("# Validate Run Summary");
  lines.push("");
  lines.push(`- run_id: ${input.runId}`);
  lines.push(`- started_at: ${input.startedAt}`);
  lines.push(`- status: ${input.status}`);
  lines.push(`- report_dir: ${input.relativeReportDir}`);
  lines.push(`- errors: ${input.errors.length}`);
  lines.push(`- warnings: ${input.warnings.length}`);
  lines.push("");
  lines.push("## Top Errors");
  lines.push("");
  if (input.errors.length === 0) {
    lines.push("- none");
  } else {
    for (const issue of input.errors.slice(0, 5)) {
      const location = issue.path ? ` (${issue.path})` : "";
      lines.push(`- ${issue.code}${location}: ${issue.message}`);
    }
  }
  lines.push("");
  lines.push("## Top Warnings");
  lines.push("");
  if (input.warnings.length === 0) {
    lines.push("- none");
  } else {
    for (const issue of input.warnings.slice(0, 5)) {
      const location = issue.path ? ` (${issue.path})` : "";
      lines.push(`- ${issue.code}${location}: ${issue.message}`);
    }
  }
  return lines.join("\n");
}

function formatTimestamp17(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  const seconds = `${date.getSeconds()}`.padStart(2, "0");
  const millis = `${date.getMilliseconds()}`.padStart(3, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}${millis}`;
}

/**
 * Allocate a fresh `run-<17-digit local timestamp>` directory under `parentDir`.
 *
 * The name is derived from the run's start time and the directory is created
 * exclusively, so two runs that start in the same millisecond get distinct ids
 * instead of writing over each other. Shared with the preflight writer, which
 * needs the same "one directory per run" addressing under a parent of its own.
 * The id is a local timestamp, so its order is not the runs' order across a
 * daylight-saving fall-back: order runs with `startedAfter`.
 */
export async function allocateRunDir(
  parentDir: string,
  startedAt: Date,
): Promise<{ runId: string; runDir: string }> {
  const maxAttempts = 2000;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidateDate = new Date(startedAt.getTime() + attempt);
    const runId = `run-${formatTimestamp17(candidateDate)}`;
    const runDir = path.join(parentDir, runId);
    try {
      await mkdir(runDir);
      // Until the run records its start in a file, `hasNewerRunDir` reads the
      // directory's modification time, so make that the start, not `mkdir`'s.
      await utimes(runDir, startedAt, startedAt).catch(() => {
        // A file system that refuses it leaves the `mkdir` time, so the order
        // can be off until the run records its start. The run itself must not
        // fail over that.
      });
      return { runId, runDir };
    } catch (error) {
      if (isAlreadyExistsError(error)) {
        continue;
      }
      throw error;
    }
  }
  throw new Error("run directory allocation failed after retrying timestamp collisions");
}

async function allocateRunReportDir(outDir: string, startedAt: Date): Promise<ValidateRunLog> {
  const { runId, runDir } = await allocateRunDir(outDir, startedAt);
  return { runId, reportDir: runDir };
}

function isAlreadyExistsError(error: unknown): boolean {
  return hasErrnoCode(error) && error.code === "EEXIST";
}
