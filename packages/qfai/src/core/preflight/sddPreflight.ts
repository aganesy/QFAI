import { lstat, mkdir, open, readdir, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { blockedAncestor } from "../fs/templateCopy.js";
import {
  allocateRunDir,
  publishLatestRunPointer,
  recordedRunStart,
  replaceFile,
} from "../runLog.js";

const PREFLIGHT_SUMMARY_FILE = "preflight_summary.md";
/**
 * Preflight runs get their own parent directory instead of sharing
 * `<outDir>/run-*` with the validate run log. Everything that reads `<outDir>`
 * treats a `run-*` directory there as a validate run — `writeValidateRunLog`
 * suppresses a stale `validate.log` by comparing against the newest one, and
 * the shipped Validate Hard Gate asks the reader to check that `run_log:` names
 * that same newest directory. A preflight directory in that namespace would
 * answer both questions with a run that never validated anything.
 */
const PREFLIGHT_RUN_ROOT = "preflight";
/** The recovery when records exist but no readable one was named. */
const NAME_A_RECORD = "qfai sdd preflight --record <path>";

/**
 * The input source preflight selected: the deliberation record the caller
 * names with `recordPath`, or an imported specification it names with
 * `importPath`. An explicit user requirement is not a file, so a project with
 * neither reports `blocked` and SDD decides whether the user gave one.
 */
export type SddPreflightSource = "deliberation-record" | "import-lite";
export type SddPreflightStatus = "ready" | "blocked";

export type RunSddPreflightOptions = {
  assumptions?: string[];
  /**
   * The deliberation record SDD consumes: the run's own, the one the work
   * order names, or the one the user names. Read against the project root,
   * then against `paths.deliberationDir`. Preflight never picks one itself.
   */
  recordPath?: string;
  /** An imported specification to use when no record is named. */
  importPath?: string;
  startedAt?: Date;
};

export type SddPreflightResult = {
  status: SddPreflightStatus;
  /** `null` when preflight selected no input. */
  source: SddPreflightSource | null;
  selectedInputPath: string | null;
  openQuestions: string[];
  blockers: string[];
  nextCommands: string[];
  /** Run id of this preflight, in `run-<17-digit local timestamp>` form. */
  runId: string;
  /** Immutable, run-scoped summary of this run. */
  preflightSummaryPath: string;
  /** Overwritten-every-run copy at `<outDir>/preflight_summary.md`, for humans. */
  latestPreflightSummaryPath: string;
};

type PreflightRun = {
  runId: string;
  startedAt: Date;
  summaryPath: string;
  latestSummaryPath: string;
  /** `<outDir>/preflight/` — where the `run-*` freshness check looks. */
  runRoot: string;
};

/**
 * Select the source of `/qfai-sdd` in the order its contract sets: the named
 * deliberation record, else an imported specification, else nothing — an
 * explicit user requirement is SDD's to judge. A named record that cannot be
 * read stops the run rather than falling through to the import. Preflight
 * reads no record content: a record that leaves a question open or
 * contradicts itself is still a usable source.
 */
export async function runSddPreflight(
  root: string,
  config: QfaiConfig,
  options: RunSddPreflightOptions = {},
): Promise<SddPreflightResult> {
  const deliberationRoot = resolvePath(root, config, "deliberationDir");
  const reportRoot = resolvePath(root, config, "outDir");
  const run = await allocatePreflightRun(root, reportRoot, options.startedAt ?? new Date());
  const openQuestions = normalizeTextList(options.assumptions);

  if (options.recordPath !== undefined) {
    const record = await resolveNamedRecord(root, deliberationRoot, options.recordPath);
    if (record !== null) {
      return await completeReadyPreflight({
        source: "deliberation-record",
        selectedInputPath: record,
        run,
        openQuestions,
      });
    }
    return await completeBlockedPreflight({
      run,
      openQuestions,
      blockers: [`The deliberation record ${options.recordPath} is not a readable file.`],
      nextCommands: [NAME_A_RECORD],
    });
  }

  if (options.importPath !== undefined) {
    if (await isReadableFile(options.importPath)) {
      return await completeReadyPreflight({
        source: "import-lite",
        selectedInputPath: options.importPath,
        run,
        openQuestions,
      });
    }
    return await completeBlockedPreflight({
      run,
      openQuestions,
      blockers: [`The imported specification ${options.importPath} is not a readable file.`],
      nextCommands: ["qfai sdd preflight --import <path>"],
    });
  }

  const records = await listRecords(deliberationRoot);
  return await completeBlockedPreflight({
    run,
    openQuestions,
    blockers: [describeMissingSource(records)],
    // With records on disk the recovery is naming one; with none, a
    // discussion has to write one first.
    nextCommands: records.length > 0 ? [NAME_A_RECORD] : ["/qfai-discussion"],
  });
}

/**
 * Why no source was selected. Records that exist are listed, never chosen:
 * which one SDD consumes is the run's, the work order's or the user's to say.
 */
function describeMissingSource(records: string[]): string {
  const recovery = [
    "Read `.qfai/assistant/skill/qfai-sdd/references/sdd-execution-playbook.md#stage-0-source-inventory` for source selection.",
    "If a readable existing specification is authoritative, run `qfai sdd preflight --import <path>`.",
    "Use `/qfai-discussion` only when no deliberation record, imported specification, or explicit user requirement exists.",
  ];
  if (records.length === 0) {
    return [
      "No deliberation record of the run or named in the work order exists, and no imported specification was given.",
      ...recovery,
    ].join(" ");
  }
  return [
    "No deliberation record was named. Name the run's record, the one the work order names or the one the user names with `qfai sdd preflight --record <path>`; when the user names none, ask which one.",
    `Records found: ${records.join(", ")}.`,
    ...recovery,
  ].join(" ");
}

/**
 * The `*.md` files directly under the deliberation directory, sorted. A
 * directory that does not exist holds no record; any other read error is
 * raised, so an unreadable directory is never reported as an empty one.
 */
async function listRecords(deliberationRoot: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(deliberationRoot, { withFileTypes: true });
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort();
}

/**
 * A bare record name, as a user gives it, is read against the deliberation
 * directory first and then the project root. A name with a path separator is
 * read against the project root.
 */
async function resolveNamedRecord(
  root: string,
  deliberationRoot: string,
  recordPath: string,
): Promise<string | null> {
  const candidates = /[\\/]/.test(recordPath)
    ? [path.resolve(root, recordPath)]
    : [path.resolve(deliberationRoot, recordPath), path.resolve(root, recordPath)];
  for (const candidate of candidates) {
    if (await isReadableFile(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Write the ready summary and return the result, so `preflight_summary.md`
 * and the returned record cannot drift apart.
 */
async function completeReadyPreflight(input: {
  source: SddPreflightSource;
  selectedInputPath: string;
  run: PreflightRun;
  openQuestions: string[];
}): Promise<SddPreflightResult> {
  await publishPreflightSummary(
    input.run,
    buildReadyPreflightSummary({
      runId: input.run.runId,
      startedAt: input.run.startedAt,
      source: input.source,
      selectedInputPath: input.selectedInputPath,
      openQuestions: input.openQuestions,
    }),
  );

  return {
    status: "ready",
    source: input.source,
    selectedInputPath: input.selectedInputPath,
    openQuestions: input.openQuestions,
    blockers: [],
    nextCommands: ["/qfai-sdd"],
    ...toSummaryPaths(input.run),
  };
}

async function completeBlockedPreflight(input: {
  run: PreflightRun;
  openQuestions: string[];
  blockers: string[];
  nextCommands: string[];
}): Promise<SddPreflightResult> {
  const { nextCommands } = input;
  await publishPreflightSummary(
    input.run,
    buildBlockedPreflightSummary({
      runId: input.run.runId,
      startedAt: input.run.startedAt,
      blockers: input.blockers,
      openQuestions: input.openQuestions,
      nextCommands,
    }),
  );

  return {
    status: "blocked",
    source: null,
    selectedInputPath: null,
    openQuestions: input.openQuestions,
    blockers: input.blockers,
    nextCommands,
    ...toSummaryPaths(input.run),
  };
}

function toSummaryPaths(
  run: PreflightRun,
): Pick<SddPreflightResult, "runId" | "preflightSummaryPath" | "latestPreflightSummaryPath"> {
  return {
    runId: run.runId,
    preflightSummaryPath: run.summaryPath,
    latestPreflightSummaryPath: run.latestSummaryPath,
  };
}

/** Reserve `<outDir>/preflight/run-<timestamp>/` for this preflight. */
async function allocatePreflightRun(
  root: string,
  reportRoot: string,
  startedAt: Date,
): Promise<PreflightRun> {
  const runRoot = path.join(reportRoot, PREFLIGHT_RUN_ROOT);
  await ensureDirectoryWithin(root, reportRoot, runRoot);

  const { runId, runDir } = await allocateRunDir(runRoot, startedAt);
  return {
    runId,
    startedAt,
    summaryPath: path.join(runDir, PREFLIGHT_SUMMARY_FILE),
    latestSummaryPath: path.join(reportRoot, PREFLIGHT_SUMMARY_FILE),
    runRoot,
  };
}

/** The `- run id:` line `buildReadyPreflightSummary` / `buildBlocked…` write. */
const PREFLIGHT_RUN_ID_LINE_RE = /^-\s*run id:\s*(run-\d{17})\s*$/m;
/** The `- started at:` line they write beside it, a UTC ISO 8601 instant. */
const PREFLIGHT_STARTED_AT_LINE_RE = /^-\s*started at:\s*(\S+)\s*$/m;

/** The start time the summary in the preflight run directory `runDir` records. */
async function readPreflightStartedAtMs(runDir: string): Promise<number | null> {
  let text: string;
  try {
    text = await readFile(path.join(runDir, PREFLIGHT_SUMMARY_FILE), "utf-8");
  } catch {
    // Not written yet, as for a run still in flight: the caller falls back
    // to the directory's modification time.
    return null;
  }
  return (
    recordedRunStart(text, PREFLIGHT_RUN_ID_LINE_RE, PREFLIGHT_STARTED_AT_LINE_RE)?.startedAtMs ??
    null
  );
}

/**
 * Write the run-scoped summary first, then refresh the latest pointer with the
 * same body. The run-scoped copy is never rewritten, so a report that
 * cites it keeps resolving to the state that justified its decisions. The
 * pointer is refreshed only when no preflight that started later exists, under
 * the guard `publishLatestRunPointer` holds for every "latest run" pointer.
 */
async function publishPreflightSummary(run: PreflightRun, body: string): Promise<void> {
  const contents = `${body}\n`;
  await replaceFile(run.summaryPath, contents);
  await publishLatestRunPointer({
    runRoot: run.runRoot,
    run: { runId: run.runId, startedAtMs: run.startedAt.getTime() },
    pointerPath: run.latestSummaryPath,
    runIdLine: PREFLIGHT_RUN_ID_LINE_RE,
    startedAtLine: PREFLIGHT_STARTED_AT_LINE_RE,
    readStartedAtMs: readPreflightStartedAtMs,
    buildContents: () => contents,
  });
}

/** Whether `target` is `base` or lies under it, compared as paths. */
function isWithin(base: string, target: string): boolean {
  const relative = path.relative(base, target);
  return relative === "" || (!path.isAbsolute(relative) && relative.split(path.sep)[0] !== "..");
}

/**
 * Create `directory` under `reportRoot` and prove it physically lies there.
 *
 * When `paths.outDir` lies in the project, which the default `.qfai/report`
 * does, every component from the project root down is checked and the
 * directory must resolve under the root. When the project points
 * `paths.outDir` elsewhere, the check starts at `paths.outDir` itself and the
 * directory must resolve under it. A checked component that is a symbolic link
 * or a junction would carry every write to wherever it points: `mkdir` and
 * `writeFile` both follow it. So each component is `lstat`-ed before and after
 * creating the directory, and the directory's real path is checked against the
 * start's. Nothing is written when any check fails.
 */
async function ensureDirectoryWithin(
  root: string,
  reportRoot: string,
  directory: string,
): Promise<void> {
  const insideRoot = isWithin(root, reportRoot);
  const containment = insideRoot ? root : reportRoot;
  // `blockedAncestor` checks the components below the path it starts from, so
  // an outside `paths.outDir` is walked from its parent to check it too, and a
  // file name under `directory` makes it check `directory` itself.
  const walkFrom = insideRoot ? root : path.dirname(reportRoot);
  const probe = path.join(directory, PREFLIGHT_SUMMARY_FILE);

  await refuseBlockedComponent(root, walkFrom, probe);
  await mkdir(directory, { recursive: true });
  await refuseBlockedComponent(root, walkFrom, probe);

  if (!isWithin(await realpath(containment), await realpath(directory))) {
    throw new Error(
      `${toDisplayPath(root, directory)} resolves outside ${toDisplayPath(root, containment)}, ` +
        "so the preflight summary would be written outside the output directory. " +
        "Nothing was written. Replace the linked directory with a real one, or set paths.outDir to one.",
    );
  }
}

/** Stop, naming the component and why, when a component on `probe`'s path is unsafe. */
async function refuseBlockedComponent(
  root: string,
  walkFrom: string,
  probe: string,
): Promise<void> {
  const entry = await blockedAncestor(walkFrom, probe);
  if (entry === undefined) return;
  const shown = toDisplayPath(root, entry);
  if ((await lstat(entry)).isSymbolicLink()) {
    throw new Error(
      `${shown} is a symbolic link or junction, so the preflight summary would be written ` +
        "outside the output directory. Nothing was written. " +
        "Replace it with a real directory, or set paths.outDir to one.",
    );
  }
  throw new Error(
    `${shown} is not a directory, so the preflight output directory cannot be created. ` +
      "Nothing was written. Move it aside, or set paths.outDir to a directory.",
  );
}

function toDisplayPath(root: string, target: string): string {
  return (path.relative(root, target) || ".").replace(/\\/g, "/");
}

/**
 * A blocked run keeps the carry-over section too. The summary is the Stage 0
 * SSOT, so `--assume` findings (and carry-over read back from an earlier
 * summary) must survive a blocked re-run — dropping the section here would
 * erase the decision Stage 1 still has to promote.
 */
function buildBlockedPreflightSummary(input: {
  runId: string;
  startedAt: Date;
  blockers: string[];
  openQuestions: string[];
  nextCommands: string[];
}): string {
  return [
    "# Preflight Summary",
    "",
    "## Status",
    "",
    "- status: blocked",
    `- run id: ${input.runId}`,
    `- started at: ${input.startedAt.toISOString()}`,
    "- selected input: (none)",
    "",
    "## Blockers",
    "",
    ...input.blockers.map((item) => `- ${item}`),
    "",
    "## Open Questions (Carry-over)",
    "",
    ...renderCarryOver(input.openQuestions),
    "",
    "## Next Commands",
    "",
    ...input.nextCommands.map((command) => `- ${command}`),
  ].join("\n");
}

function renderCarryOver(openQuestions: string[]): string[] {
  return openQuestions.length > 0 ? openQuestions.map((item) => `- ${item}`) : ["- none"];
}

function buildReadyPreflightSummary(input: {
  runId: string;
  startedAt: Date;
  source: SddPreflightSource;
  selectedInputPath: string;
  openQuestions: string[];
}): string {
  return [
    "# Preflight Summary",
    "",
    "## Status",
    "",
    "- status: ready",
    `- run id: ${input.runId}`,
    `- started at: ${input.startedAt.toISOString()}`,
    `- source: ${input.source}`,
    `- selected ${input.source}: ${input.selectedInputPath}`,
    "",
    "## Open Questions (Carry-over)",
    "",
    ...renderCarryOver(input.openQuestions),
  ].join("\n");
}

function normalizeTextList(values: string[] | undefined): string[] {
  return (values ?? []).map((value) => value.trim()).filter((value) => value.length > 0);
}

/** Whether `filePath` names a regular file this process can read. */
async function isReadableFile(filePath: string): Promise<boolean> {
  try {
    if (!(await stat(filePath)).isFile()) return false;
    await (await open(filePath, "r")).close();
    return true;
  } catch {
    return false;
  }
}
