/**
 * `qfai atdd scaffold --spec <id>` — bulk-emit per-TC test skeletons.
 *
 * For each TC entry in the target spec's Test-Cases catalogue whose declared
 * `Level` this stage owns — L1/Unit and L2/Component are skipped, and named on
 * stderr — the command writes a placeholder test file under
 * `<root>/tests/integration/<specId>/<TC-ID>.test.ts` — the directory
 * `QFAI-ATDD-112` scans, so a scaffolded test counts as coverage once its
 * assertions are filled in. Existing files are
 * preserved untouched (idempotent). When a skeleton remains in its
 * placeholder shape across N runs (default 3, configurable via
 * `qfai.config.yaml#atdd.scaffoldEscalateCycles`), the command emits an
 * escalation warning naming the TC and suggesting manual review.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { loadConfig } from "../../core/config.js";
import { collectTcLevels, isOutsideAtddObligation } from "../../core/atddTraceability.js";
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
  resolveEscalateThreshold,
  shouldEscalate,
} from "../../core/atdd/scaffoldEscalation.js";
import { error as logError, info as logInfo } from "../lib/logger.js";

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

/**
 * Declared `Level` per TC, read through the same collector `QFAI-ATDD-112`
 * uses so the writer and the gate cannot disagree about a TC's layer.
 *
 * Fails soft: an unreadable catalogue means no levels, which puts every TC in
 * scope — the behaviour before this filter existed.
 */
async function readDeclaredTcLevels(specDir: string): Promise<Map<string, string>> {
  try {
    return collectTcLevels(await readFile(path.join(specDir, "06_Test-Cases.md"), "utf-8"));
  } catch {
    return new Map();
  }
}

/**
 * Declared `Level` values whose home is a directory this writer does not emit
 * into. `scaffoldDestPath` is integration-only by contract.
 */
const SCAFFOLD_FOREIGN_LEVELS = new Set(["l4", "api", "l5", "e2e"]);

function validateSpecId(specId: string): boolean {
  // Permissive: accept `spec-NNNN` shapes; future renaming is at the
  // discretion of the spec authority.
  return /^spec-\d{3,4}$/.test(specId);
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
  testsDir: string,
): Promise<PerTcOutcome> {
  const destPath = scaffoldDestPath(root, specId, entry.tcId, testsDir);
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

  // Honor `paths.specsDir` from qfai.config.yaml so projects with
  // relocated spec packs work end-to-end. Pre-fix the spec dir was
  // hardcoded to `.qfai/specs/` which broke parity with the rest of
  // the validators (they resolve specs through `config.paths.specsDir`).
  // The config load also yields the escalation-threshold value used
  // below, so both reads come from the same config snapshot.
  const { config } = await loadConfig(options.root);
  const specsDirRel = config.paths.specsDir;
  // Honor `paths.testsDir` for scaffold emit too — pre-fix the scaffold
  // wrote under hard-coded `tests/atdd/...` while the validators and
  // traceability code resolved through `config.paths.testsDir`, so a
  // project that relocated testsDir (e.g. to `spec-tests`) emitted
  // scaffolds outside the tree where the rest of QFAI looked for them.
  const testsDirRel = config.paths.testsDir;
  const specDir = path.resolve(options.root, specsDirRel, specId);
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

  // L1/L2 are out of this command's scope, on the same terms as the skill.
  // The scaffold writes into `tests/integration/<spec-id>/`, and a filled-in
  // skeleton there is exactly the annotation `qfai-atdd/SKILL.md` now forbids
  // for a Unit or Component TC — the all-integration collapse
  // `catalog/test-layers.md` lists as an anti-pattern. Emitting one handed the
  // operator, from the command itself, the thing the same skill tells them not
  // to do — and `QFAI-ATDD-112` no longer asks for it either, so the skeleton
  // discharged nothing.
  const tcLevels = await readDeclaredTcLevels(specDir);
  const excludedUnitComponent: string[] = [];
  const excludedApiE2e: string[] = [];
  const inScope: TCEntry[] = [];
  for (const entry of entries) {
    const level = tcLevels.get(entry.tcId.toUpperCase());
    if (isOutsideAtddObligation(level)) {
      excludedUnitComponent.push(entry.tcId);
    } else if (SCAFFOLD_FOREIGN_LEVELS.has((level ?? "").trim().toLowerCase())) {
      excludedApiE2e.push(entry.tcId);
    } else {
      inScope.push(entry);
    }
  }
  entries = inScope;
  // Named, not silently dropped: a scaffold run that emits nothing has to say
  // whether the spec had no TCs or only ones this command does not own.
  if (excludedUnitComponent.length > 0) {
    writeErr(
      `qfai atdd scaffold: skipped ${String(excludedUnitComponent.length)} Unit/Component TC ` +
        `(${excludedUnitComponent.join(", ")}) — L1/L2 are outside this command's scope and are ` +
        `gated by tdd/test-list.md under /qfai-implement.`,
    );
  }
  // The writer emits into `<testsDir>/integration/<spec-id>/` only
  // (`scaffoldDestPath`), so an L4/L5 TC's skeleton would land in a directory
  // its declared `Level` does not name: not counted towards its api/e2e
  // coverage, and reported as a forbidden reference by `QFAI-ATDD-123`. The
  // command would be making validation worse than emitting nothing.
  if (excludedApiE2e.length > 0) {
    writeErr(
      `qfai atdd scaffold: skipped ${String(excludedApiE2e.length)} API/E2E TC ` +
        `(${excludedApiE2e.join(", ")}) — this command writes integration skeletons only, and ` +
        `an L4/L5 annotation there is uncounted and forbidden (QFAI-ATDD-123). Author them in ` +
        `tests/api/** or tests/e2e/**, or re-file the obligation as CON-API-* / US-*.`,
    );
  }
  if (entries.length === 0) {
    write(`qfai atdd scaffold: ${specId} — 0 TC entries in scope; nothing to emit.`);
    return 0;
  }

  const threshold = resolveEscalateThreshold(config.atdd?.scaffoldEscalateCycles);

  const outcomes: PerTcOutcome[] = [];
  for (const entry of entries) {
    const outcome = await processOneTc(options.root, specId, entry, testsDirRel);
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
