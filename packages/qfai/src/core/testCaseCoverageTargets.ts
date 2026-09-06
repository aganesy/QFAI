/**
 * The test cases a spec declares, and which of them are TDD coverage targets.
 *
 * **One collector, two commands.** `qfai validate` decides from this which TCs
 * owe a ledger row (`TDDLIST_TC_NOT_COVERED`); `qfai report` prints the same
 * set as `coverage-target TCs:` and scores `done` / `open` against it. They had
 * two readers, and disagreed accordingly: the report used the singular
 * `resolveTestCaseTable` and skipped the spec outright when it failed, so a
 * spec written in heading form (`## TC-0001` plus `- Level: L1`) disappeared
 * from the report while the gate demanded a ledger row for every one of its
 * TCs, and a TC declared in a second `TC-ID` table was gated but never counted.
 * A CI progress figure that contradicts the gate blocking the same branch is
 * worse than no figure, so the set is collected here and both callers read it.
 *
 * Its own module rather than part of `tddHelpers.ts`: it needs the heading
 * collectors from `atddTraceability.ts`, which itself reads `tddHelpers.ts`, so
 * putting it there would close an import cycle.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { collectHeadingTcIdsFrom, collectHeadingTcLevelsFrom } from "./atddTraceability.js";
import {
  hasTestCaseTableSection,
  resolveTestCaseTable,
  resolveTestCaseTables,
} from "./specPackParsers.js";
import { classifyCoverageLevel, isCoverageTargetLevel } from "./tddHelpers.js";
import { exists } from "./validators/utils.js";

/** Per-spec file that owns the Test Case Table, and the target of its findings. */
export const TEST_CASES_FILE_NAME = "06_Test-Cases.md";

export type TestCaseIds = {
  knownTcIds: Set<string>;
  unitComponentTcIds: Set<string>;
  /**
   * Coverage-target TC -> the lower-cased `Level` it declared, or `""` when the
   * spec declared none. The id set alone discards the level, so coverage could
   * only ask "is this TC on some row"; the crosswalk needs to ask "on a row of
   * the layer its Level names".
   */
  coverageTargetLevels: Map<string, string>;
  /** `Level` values that match neither vocabulary; reported so a mismatch is visible. */
  unrecognizedLevels: Set<string>;
  /**
   * Declared TCs that state no `Level` at all — a blank cell, a heading with no
   * `- Level:` line, or a `06_Test-Cases.md` with no `Level` column. They are
   * not coverage targets (`tddHelpers.classifyCoverageLevel`) and are owed to
   * `QFAI-ATDD-112` instead.
   *
   * Exposed rather than merely skipped because the previous rule *did* make
   * them targets: a project upgraded from it still carries the ledger rows that
   * rule seeded, and a stale row keeps the TC owned by `/qfai-implement` while
   * ATDD owns it too. `validateTddList` reads this to report those rows so they
   * can be retired or given a `Level`. Empty on the early-return paths, where
   * no `Level` was read at all and silence is the honest answer.
   */
  undeclaredLevelTcIds: Set<string>;
  /**
   * Set when no `TC-ID`-bearing table could be located. Both TC checks go
   * silent in that case, so the caller reports the miss rather than letting
   * "nothing found" read as "everything covered".
   */
  unresolved?: "no-table" | "no-tc-id-column";
  /**
   * The spec has no `06_Test-Cases.md` at all — distinct from "it has one and
   * declares nothing". `qfai report` omits such a spec from its TDD section
   * rather than printing a zero row for a document that does not exist;
   * `qfai validate` has its own rules for a spec pack missing a file and does
   * not read this.
   */
  fileMissing?: true;
};

export async function collectTestCaseIds(specDir: string): Promise<TestCaseIds> {
  // One instance of each Set for the whole function: the early returns hand
  // back the same (still empty) object the happy path fills, so there is no
  // second `unrecognizedLevels` that could diverge from this one.
  const knownTcIds = new Set<string>();
  const unitComponentTcIds = new Set<string>();
  const unrecognizedLevels = new Set<string>();
  const coverageTargetLevels = new Map<string, string>();
  const undeclaredLevelTcIds = new Set<string>();
  const collected: TestCaseIds = {
    knownTcIds,
    unitComponentTcIds,
    unrecognizedLevels,
    coverageTargetLevels,
    undeclaredLevelTcIds,
  };
  // Every TC for which some heading or row carried a non-empty `Level`,
  // whatever that value classified as. The complement against `knownTcIds` is
  // the undeclared set, which cannot be built as we go: a TC whose first row
  // says nothing may be declared by a later one.
  const levelDeclaredTcIds = new Set<string>();
  const settleUndeclared = (): void => {
    undeclaredLevelTcIds.clear();
    for (const tcId of knownTcIds) {
      if (levelDeclaredTcIds.has(tcId)) continue;
      undeclaredLevelTcIds.add(tcId);
    }
  };
  const testCasesPath = path.join(specDir, TEST_CASES_FILE_NAME);
  if (!(await exists(testCasesPath))) return { ...collected, fileMissing: true };
  let content: string;
  try {
    content = await readFile(testCasesPath, "utf-8");
  } catch {
    return { ...collected, fileMissing: true };
  }
  // Heading form (`## TC-0001` plus a `- Level:` line) is a supported shape
  // that `parseTestCases` and the ATDD level collector both read, and that this
  // gate did not: `resolveTestCaseTable` returns tables only, so a heading-form
  // spec produced a `TDDLIST_TC_TABLE_UNRESOLVED` warning and skipped coverage
  // entirely. With L1/L2 excluded from `QFAI-ATDD-112`, that left them gated by
  // nothing at all. Collected before the table pass so a spec that uses only
  // headings is still covered.
  //
  // The id pass is separate from the level pass on purpose. A heading block
  // that declares no `- Level:` line yields no level pair, but the TC is still
  // declared — seeding `knownTcIds` from the pairs alone made every level-less
  // heading-form TC an "unknown reference" the moment its ledger cited it.
  for (const tcId of collectHeadingTcIdsFrom(content)) {
    knownTcIds.add(tcId);
  }
  const headingLeveledTcIds = new Set<string>();
  for (const [tcId, level] of collectHeadingTcLevelsFrom(content)) {
    knownTcIds.add(tcId);
    // Before the first-declaration guard below: a superseded duplicate heading
    // is still a heading that states a `Level`, so the TC is declared either
    // way. An empty `- Level:` line states nothing and does not count.
    if (level.trim().length > 0) {
      levelDeclaredTcIds.add(tcId);
    }
    // Reported only for a declaration that is actually in force. A superseded
    // duplicate heading raised `TDDLIST_UNKNOWN_LEVEL` for a value nothing
    // reads, with a message ("every such TC becomes a mandatory ledger row")
    // that the first-seen rule below makes false for exactly that TC.
    if (headingLeveledTcIds.has(tcId)) continue;
    if (classifyCoverageLevel(level) === "unrecognized") {
      unrecognizedLevels.add(level);
    }
    // First declaration wins between two headings for the same TC, exactly as
    // `collectTcLevels` now resolves them. Reading every pair let a later
    // heading add a coverage target the earlier one had not claimed (`L3` then
    // `L1`), or leave one the earlier had (`L1` then `L3`) — either way one TC
    // owed by both gates, which is precisely what the L1/L2 exclusion cannot
    // afford. `headingLeveledTcIds` is set here rather than at the top of the
    // loop so a level-less heading does not out-rank a later levelled one.
    headingLeveledTcIds.add(tcId);
    if (isCoverageTargetLevel(level)) {
      unitComponentTcIds.add(tcId);
      // Heading form wins over the table form, matching `collectTcLevels`.
      coverageTargetLevels.set(tcId, level.trim().toLowerCase());
    }
  }

  // Scoped to the `## Test Case Table` section the template names, with a
  // header-match fallback for older specs. Reading the first table in
  // document order let an explanatory table above the heading hijack the set.
  const resolution = resolveTestCaseTable(content);
  if (!resolution.table) {
    // A heading-form spec has real TCs and must not be reported as an
    // unreadable one — but only when it has no `## Test Case Table` section to
    // fail at. A **mixed** document, headings plus a section whose table is
    // broken (`TC Id`), used to have the failure discarded because one heading
    // resolved: that table's TCs then had no level and no coverage target
    // here, while `collectShortIds` still saw them as declared, so neither
    // `TDDLIST_TC_TABLE_UNRESOLVED` nor `TDDLIST_TC_NOT_COVERED` was raised
    // and ATDD asked for the default integration annotation instead.
    const brokenSection = hasTestCaseTableSection(content);
    // Settled on the heading-only path too: a `## TC-0001` block with no
    // `- Level:` line is exactly the shape the old rule made a target, so a
    // heading-form spec can carry the same stale ledger rows a table one does.
    settleUndeclared();
    return knownTcIds.size > 0 && !brokenSection
      ? collected
      : { ...collected, unresolved: resolution.reason };
  }

  // Every TC-ID table, not just the first. `atddTraceability` already reads
  // them all, so a spec that splits `06_Test-Cases.md` per BR had `TC-*` rows
  // that `QFAI-ATDD-112` saw and this gate did not. Since L1/L2 are now
  // excluded from `QFAI-ATDD-112`, the ledger is their only gate — a `Level =
  // L1` row in a second table would otherwise be owed by nothing at all.

  const tableLeveledTcIds = new Set<string>();
  for (const table of resolveTestCaseTables(content)) {
    // Lower-cased on both sides: `resolveTestCaseTables` now accepts a `tc-id`
    // / `TC-Id` header the way the ATDD collector always has, and a
    // case-sensitive `indexOf` here would take the table and then read column
    // `-1` from every row — the table would resolve and contribute nothing.
    const headers = table.headers.map((h) => h.trim().toLowerCase());
    const tcIdIndex = headers.indexOf("tc-id");
    const levelIndex = headers.indexOf("level");

    for (const row of table.rows) {
      const tcId = (row[tcIdIndex] ?? "").trim().toUpperCase();
      if (tcId.length === 0) continue;
      knownTcIds.add(tcId);
      // Heading wins on duplicates, which is what `collectTcLevels` and the
      // scaffold parser already do. Without this, a TC declared `L3` by its
      // heading and `L1` by a table row picked up a `TDDLIST_TC_NOT_COVERED`
      // obligation on top of the `QFAI-ATDD-112` one its heading gives it —
      // the two gates disagreeing about the same TC, which is the class of
      // defect this PR exists to close.
      if (headingLeveledTcIds.has(tcId)) continue;
      // First declaration wins across tables too, not only across shapes.
      // `collectTcLevels` keeps the earlier `L3`, and the two gates have to
      // agree, so a TC that already has an explicit `Level` is settled however
      // a later table re-lists it. **Outside the `levelIndex >= 0` guard**: a
      // later table with no `Level` column skipped this check and fell through
      // to the column-absent fallback below, re-adding the TC as a
      // Unit/Component target on top of the integration obligation its first
      // declaration gives it — `TDDLIST_TC_NOT_COVERED` alongside a correct
      // `QFAI-ATDD-112`, and an inflated target count in the report.
      if (tableLeveledTcIds.has(tcId)) continue;
      const level = levelIndex >= 0 ? (row[levelIndex] ?? "").trim().toLowerCase() : "";
      if (levelIndex >= 0 && classifyCoverageLevel(level) === "unrecognized") {
        // The unrecognized-value report sits behind the same rule, for the same
        // reason it does in the heading pass: a superseded row's `Level` is not
        // in force and must not be described as making the TC a mandatory
        // ledger row.
        unrecognizedLevels.add((row[levelIndex] ?? "").trim());
      }
      // A row that declares no `Level` — blank cell, or no `Level` column at
      // all — declares nothing, and nothing is not a claim. It is not settled
      // either: a later row that does declare one still speaks for the TC, so
      // this row neither records a target nor enters `tableLeveledTcIds`.
      // Claiming it here made a `Level`-less TC a coverage target while
      // `QFAI-ATDD-112` was claiming the same TC for `tests/integration/**`
      // (`tddHelpers.classifyCoverageLevel`), which is one TC owed to two
      // owners and a seeded row whose `Layer` nothing could derive. The
      // heading form already left it to ATDD; the table form now agrees.
      if (level.length === 0) continue;
      // The first *explicit* `Level` is the declaration, and it settles the TC
      // in whichever direction it points.
      tableLeveledTcIds.add(tcId);
      levelDeclaredTcIds.add(tcId);
      if (!isCoverageTargetLevel(level)) continue;
      unitComponentTcIds.add(tcId);
      if (!coverageTargetLevels.has(tcId)) {
        coverageTargetLevels.set(tcId, level);
      }
    }
  }
  settleUndeclared();
  return collected;
}
