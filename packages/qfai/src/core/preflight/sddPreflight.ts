import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { inspectLatestDiscussionPack } from "../discussionPack.js";
import { allocateRunDir, hasNewerRunDir } from "../runLog.js";
import { resolveImportLiteEntrypoint } from "./importLiteEvidence.js";

const REQ_ID_RE = /\bREQ-\d{4}\b/g;
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
 * `import-lite` is the entrypoint for a project that already carries specs but
 * never ran `/qfai-discussion`: Stage 0 records the input source as
 * `.qfai/evidence/import-lite-<timestamp>.md` instead, which is the same
 * artifact `QFAI-IMPLITE-001` accepts. Without it here, a consumer driving
 * Stage 0 through this public entrypoint stayed `blocked` forever on a project
 * the validator considered compliant.
 */
export type SddPreflightSource = "discussion-pack" | "import-lite";
export type SddPreflightStatus = "ready" | "blocked";

export type RunSddPreflightOptions = {
  assumptions?: string[];
  startedAt?: Date;
};

export type SddPreflightResult = {
  status: SddPreflightStatus;
  source: SddPreflightSource;
  selectedInputPath: string | null;
  importedReqCount: number | null;
  openQuestions: string[];
  blockers: string[];
  nextCommands: string[];
  /** Run id of this preflight, in `run-<17-digit local timestamp>` form. */
  runId: string;
  /** Immutable, run-scoped summary — the path evidence files must cite. */
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

export async function runSddPreflight(
  root: string,
  config: QfaiConfig,
  options: RunSddPreflightOptions = {},
): Promise<SddPreflightResult> {
  const discussionRoot = resolvePath(root, config, "discussionDir");
  const reportRoot = resolvePath(root, config, "outDir");
  const run = await allocatePreflightRun(reportRoot, options.startedAt ?? new Date());

  const readiness = await inspectLatestDiscussionPack(discussionRoot);
  const nextCommands = ["/qfai-discussion"];
  const carryOverOpenQuestions = normalizeTextList(options.assumptions);
  const blockers = resolvePreflightBlockers(readiness);

  if (blockers.length > 0) {
    // `resolveImportLiteEntrypoint` gates the fallback to the shape the shipped
    // Stage 0 step describes: specs already exist and there is no discussion
    // pack at all (a pack that exists but is incomplete or misnamed still
    // blocks — evidence is an entrypoint, never an override).
    const importLiteEvidencePath = await resolveImportLiteEntrypoint(root, config);
    if (importLiteEvidencePath !== null) {
      return await completeReadyPreflight({
        source: "import-lite",
        selectedInputPath: importLiteEvidencePath,
        // The shipped template is an explicit pointer artifact, "not
        // requirement/spec SSOT", so it carries no REQ ids. Counting them would
        // report a confident `0` for a project whose requirements live in the
        // specs; the count is genuinely unknown on this path.
        importedReqCount: null,
        run,
        openQuestions: carryOverOpenQuestions,
        // `/qfai-discussion` is not the follow-up here — the input source is
        // already recorded, so the caller continues the SDD workflow.
        nextCommands: ["/qfai-sdd"],
      });
    }

    await publishPreflightSummary(
      run,
      buildBlockedPreflightSummary({
        runId: run.runId,
        selectedDiscussionPack: readiness.latestPackDir,
        blockers,
        nextCommands,
      }),
    );

    return {
      status: "blocked",
      source: "discussion-pack",
      selectedInputPath: readiness.latestPackDir,
      importedReqCount: null,
      openQuestions: carryOverOpenQuestions,
      blockers,
      nextCommands,
      ...toSummaryPaths(run),
    };
  }

  const selectedInputPath = readiness.latestPackDir;
  const reqPath = selectedInputPath === null ? null : path.join(selectedInputPath, "06_REQ.md");

  return await completeReadyPreflight({
    source: "discussion-pack",
    selectedInputPath,
    importedReqCount: countReqIds(reqPath === null ? "" : await readSafe(reqPath)),
    run,
    openQuestions: carryOverOpenQuestions,
    nextCommands,
  });
}

/**
 * Write the ready summary and return the result. Shared by both sources so
 * `preflight_summary.md` and the returned record cannot drift apart between
 * them. `importedReqCount: null` means "not countable from this input source"
 * and renders as `unknown` rather than a confident zero.
 */
async function completeReadyPreflight(input: {
  source: SddPreflightSource;
  selectedInputPath: string | null;
  importedReqCount: number | null;
  run: PreflightRun;
  openQuestions: string[];
  nextCommands: string[];
}): Promise<SddPreflightResult> {
  await publishPreflightSummary(
    input.run,
    buildReadyPreflightSummary({
      runId: input.run.runId,
      source: input.source,
      selectedInputPath: input.selectedInputPath,
      importedReqCount: input.importedReqCount,
      openQuestions: input.openQuestions,
    }),
  );

  return {
    status: "ready",
    source: input.source,
    selectedInputPath: input.selectedInputPath,
    importedReqCount: input.importedReqCount,
    openQuestions: input.openQuestions,
    blockers: [],
    nextCommands: input.nextCommands,
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
 * same body. The run-scoped copy is never rewritten, so an evidence file that
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
  let existingRunId: string | null = null;
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

function resolvePreflightBlockers(readiness: {
  latestPackDir: string | null;
  dangerousPackNames: string[];
  missingFiles: string[];
  missingSideArtifacts: string[];
  incompleteFiles: string[];
  blockingOqIds: string[];
  prototypingRequired: boolean;
}): string[] {
  const blockers: string[] = [];

  if (!readiness.latestPackDir) {
    blockers.push(
      "latest discussion-pack が見つかりません（`.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/` を作成してください）。",
    );
  }

  if (readiness.dangerousPackNames.length > 0) {
    blockers.push(
      `discussion 配下に命名不正の discussion-* が存在します: ${readiness.dangerousPackNames.join(", ")}`,
    );
  }

  if (readiness.missingFiles.length > 0 || readiness.missingSideArtifacts.length > 0) {
    const fileMissing = [...readiness.missingFiles];
    const sideArtifactMissing = [...readiness.missingSideArtifacts];

    if (fileMissing.length > 0) {
      blockers.push(`必須ファイル不足: ${fileMissing.join(", ")}`);
    }
    if (sideArtifactMissing.length > 0) {
      const message = readiness.prototypingRequired
        ? `UI-bearing discussion pack に必須 side artifact が不足しています: ${sideArtifactMissing.join(", ")}`
        : `必須 side artifact 不足: ${sideArtifactMissing.join(", ")}`;
      blockers.push(message);
    }
  }

  if (readiness.incompleteFiles.length > 0) {
    blockers.push(`最小内容を満たしていないファイル: ${readiness.incompleteFiles.join(", ")}`);
  }

  if (readiness.blockingOqIds.length > 0) {
    blockers.push(`Blocking OQ（Disposition=open）: ${readiness.blockingOqIds.join(", ")}`);
  }

  return blockers;
}

function buildBlockedPreflightSummary(input: {
  runId: string;
  selectedDiscussionPack: string | null;
  blockers: string[];
  nextCommands: string[];
}): string {
  return [
    "# Preflight Summary",
    "",
    "## Status",
    "",
    "- status: blocked",
    `- run id: ${input.runId}`,
    `- latest discussion-pack: ${input.selectedDiscussionPack ?? "(not found)"}`,
    "",
    "## Blockers",
    "",
    ...input.blockers.map((item) => `- ${item}`),
    "",
    "## Next Commands",
    "",
    ...input.nextCommands.map((command) => `- ${command}`),
  ].join("\n");
}

function buildReadyPreflightSummary(input: {
  runId: string;
  source: SddPreflightSource;
  selectedInputPath: string | null;
  importedReqCount: number | null;
  openQuestions: string[];
}): string {
  const openQuestions =
    input.openQuestions.length > 0 ? input.openQuestions.map((item) => `- ${item}`) : ["- none"];
  const inputLabel =
    input.source === "import-lite" ? "selected import-lite evidence" : "selected discussion-pack";

  return [
    "# Preflight Summary",
    "",
    "## Status",
    "",
    "- status: ready",
    `- run id: ${input.runId}`,
    `- source: ${input.source}`,
    `- ${inputLabel}: ${input.selectedInputPath ?? "(unknown)"}`,
    "",
    "## Requirement Intake",
    "",
    `- Imported REQ count: ${input.importedReqCount ?? "unknown"}`,
    "",
    "## Open Questions (Carry-over)",
    "",
    ...openQuestions,
  ].join("\n");
}

function normalizeTextList(values: string[] | undefined): string[] {
  return (values ?? []).map((value) => value.trim()).filter((value) => value.length > 0);
}

function countReqIds(text: string): number {
  const matcher = new RegExp(REQ_ID_RE.source, REQ_ID_RE.flags);
  return Array.from(text.matchAll(matcher)).length;
}

async function readSafe(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}
