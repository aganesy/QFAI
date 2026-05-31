/**
 * `qfai atdd scaffold --spec <id>` — bulk-emit per-TC test skeletons.
 *
 * For each TC entry in the target spec's Test-Cases catalogue, the
 * command writes a placeholder test file under
 * `<root>/tests/atdd/<specId>/<TC-ID>.test.ts`. Existing files are
 * preserved untouched (idempotent). When a skeleton remains in its
 * placeholder shape across N runs (default 3, configurable via
 * `qfai.config.yaml#atdd.scaffoldEscalateCycles`), the command emits an
 * escalation warning naming the TC and suggesting manual review.
 */

import path from "node:path";

import { loadConfig } from "../../core/config.js";
import {
  buildSkeleton,
  emitSkeleton,
  parseTestCases,
  scaffoldDestPath,
  type TCEntry,
} from "../../core/atdd/scaffold.js";
import {
  readScaffoldAttempts,
  recordScaffoldAttempt,
  resetScaffoldAttempt,
  shouldEscalate,
} from "../../core/atdd/scaffoldEscalation.js";
import { error as logError, info as logInfo } from "../lib/logger.js";

const DEFAULT_ESCALATE_CYCLES = 3;

export type AtddScaffoldOptions = {
  /** Project root (resolves `.qfai/specs/<specId>` underneath). */
  root: string;
  /** Spec identifier (e.g. `spec-0001`). */
  specId: string;
  /** Output sink. Defaults to console.log. */
  write?: (message: string) => void;
  /** Error / warning sink. Defaults to console.error. */
  writeErr?: (message: string) => void;
};

function validateSpecId(specId: string): boolean {
  // Permissive: accept `spec-NNNN` shapes; future renaming is at the
  // discretion of the spec authority.
  return /^spec-\d{3,4}$/.test(specId);
}

async function resolveEscalateThreshold(root: string): Promise<number> {
  const { config } = await loadConfig(root);
  const configured = config.atdd?.scaffoldEscalateCycles;
  if (
    typeof configured === "number" &&
    Number.isFinite(configured) &&
    Number.isInteger(configured) &&
    configured >= 0
  ) {
    return configured;
  }
  return DEFAULT_ESCALATE_CYCLES;
}

type PerTcOutcome = {
  entry: TCEntry;
  destRel: string;
  wrote: boolean;
  alreadyPlaceholder: boolean;
  alreadyProgressed: boolean;
};

async function processOneTc(
  root: string,
  specId: string,
  entry: TCEntry,
): Promise<PerTcOutcome> {
  const destPath = scaffoldDestPath(root, specId, entry.tcId);
  const body = buildSkeleton(entry, specId);
  const result = await emitSkeleton(entry, destPath, body);
  const destRel = path.relative(root, destPath).replace(/\\/g, "/");
  return {
    entry,
    destRel,
    wrote: result.wrote,
    alreadyPlaceholder: result.alreadyPlaceholder,
    alreadyProgressed: result.alreadyProgressed,
  };
}

async function updateAttemptCounter(
  root: string,
  specId: string,
  outcome: PerTcOutcome,
): Promise<number> {
  if (outcome.alreadyProgressed) {
    // Real test has landed — reset the counter so future regressions
    // start counting from zero again.
    await resetScaffoldAttempt(root, specId, outcome.entry.tcId);
    return 0;
  }
  // Either freshly emitted or still placeholder — record one more
  // unprogressed cycle.
  return recordScaffoldAttempt(root, specId, outcome.entry.tcId);
}

function summarizeWrite(outcome: PerTcOutcome): string {
  if (outcome.wrote) {
    return `  + ${outcome.destRel} (skeleton emitted)`;
  }
  if (outcome.alreadyProgressed) {
    return `  · ${outcome.destRel} (preserved — real assertion detected)`;
  }
  return `  · ${outcome.destRel} (preserved — placeholder still present)`;
}

/**
 * Execute the scaffold flow end-to-end.
 *
 * Returns 0 on success; 1 on a clear argument / fixture failure (e.g.
 * malformed spec id or missing spec dir). Escalation warnings are
 * routed through `writeErr` but do NOT change the exit code — the
 * scaffold itself succeeded, the escalation is a soft signal.
 */
export async function runAtddScaffold(options: AtddScaffoldOptions): Promise<number> {
  const write = options.write ?? logInfo;
  const writeErr = options.writeErr ?? logError;

  const specId = options.specId.trim();
  if (specId === "") {
    writeErr("qfai atdd scaffold: --spec <id> is required.");
    return 1;
  }
  if (!validateSpecId(specId)) {
    writeErr(`qfai atdd scaffold: invalid spec id "${specId}" (expected spec-NNNN).`);
    return 1;
  }

  const specDir = path.join(options.root, ".qfai", "specs", specId);
  let entries: TCEntry[];
  try {
    entries = await parseTestCases(specDir);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    writeErr(`qfai atdd scaffold: failed to read Test-Cases catalogue: ${message}`);
    return 1;
  }

  if (entries.length === 0) {
    writeErr(
      `qfai atdd scaffold: no Test-Case entries found for ${specId} ` +
        `(looked under ${path.relative(options.root, specDir).replace(/\\/g, "/") || specDir}).`,
    );
    return 1;
  }

  const threshold = await resolveEscalateThreshold(options.root);

  const outcomes: PerTcOutcome[] = [];
  for (const entry of entries) {
    const outcome = await processOneTc(options.root, specId, entry);
    outcomes.push(outcome);
  }

  // Persist counters BEFORE evaluating escalation — the counter must
  // reflect the just-completed run.
  const escalations: string[] = [];
  for (const outcome of outcomes) {
    const updated = await updateAttemptCounter(options.root, specId, outcome);
    if (!outcome.alreadyProgressed && shouldEscalate(updated, threshold)) {
      escalations.push(outcome.entry.tcId);
    }
  }

  // Summary on stdout (one line per TC).
  const summaryLines: string[] = [
    `qfai atdd scaffold: ${specId} — ${entries.length} TC entr${entries.length === 1 ? "y" : "ies"} processed.`,
  ];
  for (const outcome of outcomes) {
    summaryLines.push(summarizeWrite(outcome));
  }
  write(summaryLines.join("\n"));

  // Escalation warnings on stderr.
  for (const tcId of escalations) {
    // Surface the previously-recorded attempt count so the operator
    // can correlate with the threshold.
    const observed = await readScaffoldAttempts(options.root, specId, tcId);
    writeErr(
      `qfai atdd scaffold: escalation — ${tcId} has been a placeholder for ` +
        `${observed} cycle(s) (threshold ${threshold}). Manual review recommended.`,
    );
  }

  return 0;
}
