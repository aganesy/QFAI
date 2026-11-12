import { mkdir, open, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { allocateRunDir, hasNewerRunDir } from "../runLog.js";

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
  const run = await allocatePreflightRun(reportRoot, options.startedAt ?? new Date());
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
    });
  }

  return await completeBlockedPreflight({
    run,
    openQuestions,
    blockers: [describeMissingSource(await listRecords(deliberationRoot))],
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

/** The `*.md` files directly under the deliberation directory, sorted. */
async function listRecords(deliberationRoot: string): Promise<string[]> {
  try {
    const entries = await readdir(deliberationRoot, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

/**
 * A record named by path is read against the project root first; a bare
 * record name, as a user gives it, is read against the deliberation directory.
 */
async function resolveNamedRecord(
  root: string,
  deliberationRoot: string,
  recordPath: string,
): Promise<string | null> {
  for (const candidate of [
    path.resolve(root, recordPath),
    path.resolve(deliberationRoot, recordPath),
  ]) {
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
}): Promise<SddPreflightResult> {
  const nextCommands = ["/qfai-discussion"];
  await publishPreflightSummary(
    input.run,
    buildBlockedPreflightSummary({
      runId: input.run.runId,
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
async function allocatePreflightRun(reportRoot: string, startedAt: Date): Promise<PreflightRun> {
  const runRoot = path.join(reportRoot, PREFLIGHT_RUN_ROOT);
  await mkdir(runRoot, { recursive: true });

  const { runId, runDir } = await allocateRunDir(runRoot, startedAt);
  return {
    runId,
    summaryPath: path.join(runDir, PREFLIGHT_SUMMARY_FILE),
    latestSummaryPath: path.join(reportRoot, PREFLIGHT_SUMMARY_FILE),
    runRoot,
  };
}

/** The `- run id:` line `buildReadyPreflightSummary` / `buildBlocked…` write. */
const PREFLIGHT_RUN_ID_LINE_RE = /^-\s*run id:\s*(run-\d{17})\s*$/m;

/**
 * Write the run-scoped summary first, then refresh the latest pointer with the
 * same body. The run-scoped copy is never rewritten, so a report that
 * cites it keeps resolving to the state that justified its decisions.
 *
 * The pointer refresh is conditional, for the same reason
 * `writeLatestValidateLog` makes it conditional: run directories are named from
 * the run's START time, so a slow preflight started first can finish last, and
 * an unconditional write would leave `preflight_summary.md` describing the
 * older run while a newer `preflight/run-*` sits beside it — exactly what the
 * "latest run" pointer promises not to do.
 *
 * Two guards, as there: the `run-*` listing catches a newer run that is still
 * in flight (its directory exists from the moment it was allocated), and the
 * existing file's own `run id:` catches a newer run whose directory was pruned
 * after it wrote. Neither is mutual exclusion — the residual window is the gap
 * between this check and the write — but it is bounded by that gap rather than
 * by the whole duration of the slower run. An unreadable or unparseable
 * existing pointer counts as "no newer run", so a truncated file self-heals.
 */
async function publishPreflightSummary(run: PreflightRun, body: string): Promise<void> {
  const contents = `${body}\n`;
  await writeFile(run.summaryPath, contents, "utf-8");

  if (await hasNewerRunDir(run.runRoot, run.runId)) {
    return;
  }
  let existingRunId: string | null;
  try {
    existingRunId =
      PREFLIGHT_RUN_ID_LINE_RE.exec(await readFile(run.latestSummaryPath, "utf-8"))?.[1] ?? null;
  } catch {
    existingRunId = null;
  }
  if (existingRunId !== null && existingRunId > run.runId) {
    return;
  }
  await writeFile(run.latestSummaryPath, contents, "utf-8");
}

/**
 * A blocked run keeps the carry-over section too. The summary is the Stage 0
 * SSOT, so `--assume` findings (and carry-over read back from an earlier
 * summary) must survive a blocked re-run — dropping the section here would
 * erase the decision Stage 1 still has to promote.
 */
function buildBlockedPreflightSummary(input: {
  runId: string;
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
