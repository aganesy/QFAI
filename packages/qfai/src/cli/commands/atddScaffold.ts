/**
 * `qfai atdd scaffold --spec <id>` — bulk-emit per-TC test skeletons.
 *
 * For each TC entry in the target spec's Test-Cases catalogue whose declared
 * `Level` this stage owns — L1/Unit and L2/Component are skipped, and named on
 * stderr — the command writes a placeholder test file under
 * `<root>/tests/integration/<specId>/` — the directory `QFAI-ATDD-112` scans —
 * in the language the project's own `validation.traceability.testFileGlobs`
 * derive, so a scaffolded test counts as coverage once its
 * assertions are filled in. Existing files are
 * preserved untouched (idempotent). When a skeleton remains in its
 * placeholder shape across N runs (default 3, configurable via
 * `qfai.config.yaml#atdd.scaffoldEscalateCycles`), the command emits an
 * escalation warning naming the TC and suggesting manual review.
 */

import { readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";

import { loadConfig } from "../../core/config.js";
import {
  atddTestKindDirs,
  collectTcLevels,
  deriveAtddFilePattern,
  resolveAtddHomeKind,
} from "../../core/atddTraceability.js";
import {
  buildSkeleton,
  emitSkeleton,
  isFilePristineSkeleton,
  parseTestCases,
  scaffoldDestPath,
  SCAFFOLD_LAYER_DIR,
  type TCEntry,
} from "../../core/atdd/scaffold.js";
import {
  resolveScaffoldDialect,
  scaffoldSkeletonCandidates,
  SCAFFOLD_RUNNERS,
  type ScaffoldDialect,
} from "../../core/atdd/scaffoldDialect.js";
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
 * The one directory this writer emits into. `scaffoldDestPath` is
 * integration-only by contract, so any other home is foreign to it.
 */
const SCAFFOLD_HOME_KIND = "integration";

/**
 * Operator-facing refusal for a stack this command has no skeleton shape for.
 * Names the derived scan pattern, so the reason is the config key the operator
 * can act on rather than "unsupported".
 */
function unsupportedStackMessage(testFileGlobs: readonly string[], testsDir: string): string {
  const known = SCAFFOLD_RUNNERS.join(" / ");
  return (
    `qfai atdd scaffold: no skeleton dialect for this project's test extensions — ` +
    `validation.traceability.testFileGlobs derives ${deriveAtddFilePattern(testFileGlobs)}, ` +
    `and this command emits ${known} skeletons only, which that pattern would not scan. ` +
    `Author these TCs by hand under ${testsDir}/${SCAFFOLD_HOME_KIND}/<spec-id>/, keeping ` +
    `their QFAI:SPEC-XXXX:TC-YYYY annotations.`
  );
}

/**
 * Operator-facing refusal for a stack whose extension this command knows but
 * whose configured globs admit none of the paths it would write.
 *
 * `QFAI-ATDD-112` widens to the bare extension, so a `test_<tc>.py` written to
 * a project whose globs only allow `*_test.py` — or whose globs cover `src/**`
 * and not the writer's own `<testsDir>/integration/<spec-id>/`, or whose
 * `testFileExcludeGlobs` cover exactly that directory — WOULD have cleared the
 * coverage gate while never being collected by the runner. Refusing keeps the
 * gate honest instead of clearing it with a test that never executes.
 *
 * The exclude globs are named only when the project set some: quoting an empty
 * list would point the operator at a key that had no part in the refusal.
 */
function namingMismatchMessage(
  shapes: readonly string[],
  testFileGlobs: readonly string[],
  excludeGlobs: readonly string[],
  testsDir: string,
): string {
  const excluded =
    excludeGlobs.length === 0
      ? ""
      : ` (or are excluded by validation.traceability.testFileExcludeGlobs: ${excludeGlobs.join(", ")})`;
  return (
    `qfai atdd scaffold: none of the skeleton paths this command would write ` +
    `(${shapes.join(", ")}) match validation.traceability.testFileGlobs ` +
    `(${testFileGlobs.join(", ")})${excluded}, so the generated file would clear QFAI-ATDD-112 ` +
    `— which widens to the bare extension — while your runner never collected it. ` +
    `Add a glob that admits one of those paths, or author these TCs by hand under ` +
    `${testsDir}/${SCAFFOLD_HOME_KIND}/<spec-id>/, keeping their ` +
    `QFAI:SPEC-XXXX:TC-YYYY annotations.`
  );
}

/** Skeletons an earlier run left for the same TC under a different convention. */
type SupersededPlaceholders = {
  /** Pristine placeholders this run deleted. */
  removed: string[];
  /** Files left alone because their body is no longer the pristine skeleton. */
  progressed: string[];
  /** Placeholders that could not be deleted (message included). */
  failed: string[];
};

/**
 * Retire skeletons an earlier run wrote for the same TC under a different
 * naming convention.
 *
 * Once the dialect follows `testFileGlobs`, a project scaffolded before that
 * (or before its globs changed) keeps a `<TC>.test.ts` next to the new
 * `test_<tc>.py`. `D-SCAFFOLD-PLACEHOLDER` globs both shapes, so the stale one
 * goes on being reported — and implementing the new test never clears it.
 *
 * Only a file that is still the PRISTINE skeleton its own dialect emits is
 * removed. The two-marker `isStillPlaceholder` heuristic is not enough here:
 * the JS/TS skeleton carries the `TODO: implement assertion for <TC>` line
 * TWICE (above `it.skip` and inside it), so an operator who replaced the inner
 * one with a real assertion and left the outer TODO and the sentinel in place
 * still satisfies it — and this `rm` would have deleted their assertions.
 * Anything the operator touched is kept and named on stderr for them to port.
 */
async function dropSupersededPlaceholders(
  root: string,
  scaffoldDir: string,
  existingNames: ReadonlySet<string>,
  entry: TCEntry,
  keepFileName: string,
): Promise<SupersededPlaceholders> {
  const result: SupersededPlaceholders = { removed: [], progressed: [], failed: [] };
  for (const { fileName, dialect } of scaffoldSkeletonCandidates(entry.tcId)) {
    if (fileName === keepFileName || !existingNames.has(fileName)) {
      continue;
    }
    const absolute = path.join(scaffoldDir, fileName);
    const relative = path.relative(root, absolute).replace(/\\/g, "/");
    if (!(await isFilePristineSkeleton(absolute, entry.tcId, dialect))) {
      result.progressed.push(relative);
      continue;
    }
    try {
      await rm(absolute);
      result.removed.push(relative);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      result.failed.push(`${relative} (${message})`);
    }
  }
  return result;
}

/** Basenames already in the scaffold directory, or empty when it does not exist. */
async function readScaffoldDirNames(scaffoldDir: string): Promise<Set<string>> {
  try {
    return new Set(await readdir(scaffoldDir));
  } catch {
    // Missing directory (the common first-run case) or an unreadable one: this
    // lookup only ever suppresses duplicates, so failing soft costs nothing
    // the emit path below does not already handle.
    return new Set<string>();
  }
}

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
  superseded: SupersededPlaceholders;
};

async function processOneTc(
  root: string,
  specId: string,
  entry: TCEntry,
  testsDir: string,
  dialect: ScaffoldDialect,
  existingNames: ReadonlySet<string>,
): Promise<PerTcOutcome> {
  const destPath = scaffoldDestPath(root, specId, entry.tcId, testsDir, dialect);
  const body = buildSkeleton(entry, specId, dialect);
  const result = await emitSkeleton(entry, destPath, body);
  const destRel = path.relative(root, destPath).replace(/\\/g, "/");
  // After the emit, never before: a stale skeleton is only superseded once its
  // replacement is on disk.
  const superseded = await dropSupersededPlaceholders(
    root,
    path.dirname(destPath),
    existingNames,
    entry,
    path.basename(destPath),
  );
  return {
    entry,
    destRel,
    wrote: result.wrote,
    alreadyPlaceholder: result.alreadyPlaceholder,
    alreadyProgressed: result.alreadyProgressed,
    superseded,
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

function summarizeWrite(outcome: PerTcOutcome): string[] {
  const lines: string[] = [];
  if (outcome.wrote) {
    lines.push(`  + ${outcome.destRel} (skeleton emitted)`);
  } else if (outcome.alreadyProgressed) {
    lines.push(`  · ${outcome.destRel} (preserved — real assertion detected)`);
  } else {
    lines.push(`  · ${outcome.destRel} (preserved — placeholder still present)`);
  }
  for (const removed of outcome.superseded.removed) {
    lines.push(`  - ${removed} (removed — superseded placeholder for ${outcome.entry.tcId})`);
  }
  return lines;
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
    // One predicate decides both exclusions, so the writer and the gate cannot
    // read the same cell differently: `null` is "ATDD owes nothing", any home
    // other than this writer's is a directory it must not emit into, and an
    // unreadable `Level` lands on the same default the gate uses.
    const home = resolveAtddHomeKind(tcLevels.get(entry.tcId.toUpperCase()));
    if (home === null) {
      excludedUnitComponent.push(entry.tcId);
    } else if (home !== SCAFFOLD_HOME_KIND) {
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
    // The homes are rendered against the configured `paths.testsDir`, which is
    // what the scaffold writer and the ATDD scan both follow. Naming
    // `tests/api/**` to a project that relocated `testsDir` sent the operator
    // to a directory no gate reads, so following the advice left
    // `QFAI-ATDD-112` unclearable — the same trap `atddTestKindDirs` exists to
    // close on the validator side.
    const homes = atddTestKindDirs(testsDirRel);
    writeErr(
      `qfai atdd scaffold: skipped ${String(excludedApiE2e.length)} API/E2E TC ` +
        `(${excludedApiE2e.join(", ")}) — this command writes integration skeletons only, and ` +
        `an L4/L5 annotation there is uncounted and forbidden (QFAI-ATDD-123). Author them in ` +
        `${homes.api} or ${homes.e2e}, or re-file the obligation as CON-API-* / US-*.`,
    );
  }
  if (entries.length === 0) {
    write(`qfai atdd scaffold: ${specId} — 0 TC entries in scope; nothing to emit.`);
    return 0;
  }

  // The skeleton language comes from the same config key `QFAI-ATDD-112`
  // derives its scan extensions from. Writing a `.test.ts` on a project whose
  // globs derive `{feature,markdown,md,py}` put the file inside the scanned
  // directory with an extension the scan never opens, so the documented happy
  // path (scaffold -> fill in -> validate) could not clear the obligation the
  // command exists to discharge — before or after fill-in.
  //
  // Resolved AFTER the scope filter, not before it: a spec whose TCs are all
  // L1/L2 or L4/L5 has nothing for this writer to emit, and refusing there
  // failed a `qfai atdd scaffold` sweep over many specs on a stack that was
  // never going to be written to. An unsupported stack is only an error when
  // there is L3 output it would have blocked.
  const testFileGlobs = config.validation.traceability.testFileGlobs;
  // Read once, before the first emit: every basename already in the scaffold
  // directory, so a skeleton an earlier run wrote for the same TC under a
  // different naming convention can be retired instead of duplicated.
  const scaffoldDir = path.resolve(options.root, testsDirRel, SCAFFOLD_LAYER_DIR, specId);
  // The globs are matched against the WHOLE destination path, not the basename
  // alone: `src/**\/test_*.py` admits the pytest NAME this writer emits while
  // covering none of `tests/integration/<spec-id>/`, so the emitted file would
  // clear `QFAI-ATDD-112` (which widens to the bare extension) without the
  // project's own test scan ever collecting it.
  //
  // An absolute `paths.testsDir` outside the repo has no repo-relative form to
  // compare against repo-relative globs, so the check falls back to the
  // basename there rather than refusing on a comparison it cannot make.
  //
  // The EXCLUDE globs travel with them. `collectScTestReferences` hands those
  // to fast-glob as `ignore`, so a project that excludes `tests/integration/**`
  // has told qfai its normal test scan does not read this writer's own
  // destination — while `QFAI-ATDD-112` widens to the bare extension and counts
  // the annotation anyway. Resolving on the include side alone therefore
  // emitted a skeleton into a directory the project itself had opted out of.
  const scaffoldDirRel = path.relative(options.root, scaffoldDir).replace(/\\/g, "/");
  const comparable = !scaffoldDirRel.startsWith("..") && !path.isAbsolute(scaffoldDirRel);
  const testFileExcludeGlobs = config.validation.traceability.testFileExcludeGlobs;
  const resolution = resolveScaffoldDialect(testFileGlobs, {
    ...(comparable ? { scaffoldDir: scaffoldDirRel } : {}),
    excludeGlobs: testFileExcludeGlobs,
  });
  if (resolution.outcome === "unsupported-stack") {
    // Refuse rather than mislead: a skeleton in a language qfai has no shape
    // for would be uncounted the same way, only silently.
    writeErr(unsupportedStackMessage(testFileGlobs, testsDirRel));
    return 1;
  }
  if (resolution.outcome === "naming-mismatch") {
    writeErr(
      namingMismatchMessage(resolution.shapes, testFileGlobs, testFileExcludeGlobs, testsDirRel),
    );
    return 1;
  }
  const dialect = resolution.dialect;

  const threshold = resolveEscalateThreshold(config.atdd?.scaffoldEscalateCycles);

  const existingNames = await readScaffoldDirNames(scaffoldDir);

  const outcomes: PerTcOutcome[] = [];
  for (const entry of entries) {
    const outcome = await processOneTc(
      options.root,
      specId,
      entry,
      testsDirRel,
      dialect,
      existingNames,
    );
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
    summaryLines.push(...summarizeWrite(outcome));
  }
  write(summaryLines.join("\n"));

  // A stale skeleton this run could NOT retire is still double-reported by
  // `D-SCAFFOLD-PLACEHOLDER`, so it is named rather than left to be discovered
  // through a finding on a file the operator did not ask for.
  for (const outcome of outcomes) {
    if (outcome.superseded.progressed.length > 0) {
      writeErr(
        `qfai atdd scaffold: ${outcome.entry.tcId} also has an edited test file under an ` +
          `earlier naming convention (${outcome.superseded.progressed.join(", ")}), so it was ` +
          `kept rather than retired. It does not match this project's configured test globs, so ` +
          `it counts for nothing — port whatever it holds into ${outcome.destRel} and delete it.`,
      );
    }
    if (outcome.superseded.failed.length > 0) {
      writeErr(
        `qfai atdd scaffold: could not remove the superseded placeholder(s) for ` +
          `${outcome.entry.tcId} (${outcome.superseded.failed.join(", ")}). Delete them by hand, ` +
          `or D-SCAFFOLD-PLACEHOLDER keeps reporting the TC after ${outcome.destRel} is filled in.`,
      );
    }
  }

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
