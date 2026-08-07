/**
 * TDD ledger coverage per spec, for `qfai report`.
 *
 * Deliberately NOT re-exported from `core/index.ts` / `src/index.ts`: it is an
 * internal aggregation helper whose signature depends on `SpecEntry` and on the
 * on-disk ledger layout. Tests import it from this path directly, so the
 * resolution rule — which spans several ledger rows and therefore cannot be
 * observed from the report output alone — stays testable without pinning it as
 * package API.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { ReportTddCoverage, ReportTddCoverageSpec } from "./report.js";
import type { SpecEntry } from "./specLayout.js";
import { resolveTestCaseTable } from "./specPackParsers.js";
import {
  collectLedgerTables,
  isCoverageBearingRow,
  isCoverageTargetLevel,
  TDD_DONE_STATUSES,
  TDD_IN_REVIEW_STATUSES,
  splitTcRefs,
  resolveParentTcId,
} from "./tddHelpers.js";

export async function collectTddCoverage(
  entries: readonly SpecEntry[],
): Promise<ReportTddCoverage> {
  const specs: ReportTddCoverageSpec[] = [];

  for (const entry of entries) {
    const testCasesPath = path.join(entry.dir, "06_Test-Cases.md");
    let tcContent: string;
    try {
      tcContent = await readFile(testCasesPath, "utf-8");
    } catch {
      continue;
    }

    // Section-scoped, mirroring `tddList.collectTestCaseIds`: reading the
    // first table in document order let an explanatory table above the
    // `## Test Case Table` heading hijack the TC set.
    const tcResolution = resolveTestCaseTable(tcContent);
    if (!tcResolution.table) continue;
    const tcTable = tcResolution.table;
    const tcHeaders = tcTable.headers.map((h) => h.trim());
    const tcIdIdx = tcHeaders.indexOf("TC-ID");
    const levelIdx = tcHeaders.indexOf("Level");

    const unitComponentTcIds = new Set<string>();
    for (const row of tcTable.rows) {
      const tcId = (row[tcIdIdx] ?? "").trim().toUpperCase();
      if (tcId.length === 0) continue;
      if (levelIdx >= 0) {
        const level = (row[levelIdx] ?? "").trim().toLowerCase();
        if (!isCoverageTargetLevel(level)) continue;
      }
      // Reaches here when: (a) Level is a coverage target, or (b) Level column is absent (fallback: all TCs)
      unitComponentTcIds.add(tcId);
    }

    if (unitComponentTcIds.size === 0) {
      specs.push({
        specNumber: entry.specNumber,
        unitComponentTotal: 0,
        doneCount: 0,
        inReviewCount: 0,
        exceptionCount: 0,
        openCount: 0,
        blockedCount: 0,
        missingTcRefs: [],
        exceptionRows: [],
      });
      continue;
    }

    const tddListPath = path.join(entry.dir, "tdd", "test-list.md");
    let tddContent: string;
    try {
      tddContent = await readFile(tddListPath, "utf-8");
    } catch {
      specs.push({
        specNumber: entry.specNumber,
        unitComponentTotal: unitComponentTcIds.size,
        doneCount: 0,
        inReviewCount: 0,
        exceptionCount: 0,
        openCount: unitComponentTcIds.size,
        blockedCount: 0,
        missingTcRefs: Array.from(unitComponentTcIds).sort(),
        exceptionRows: [],
      });
      continue;
    }

    // Every ledger table, through the reader `validateTddList` scores coverage
    // with. Reading the first table alone made `qfai report` and `qfai validate`
    // give two answers about one file: `/qfai-implement` appends a table per
    // change request, so a `done` L1/L2 row in an appended section passed
    // validation while the report printed the TC as missing and open. A CI
    // progress figure that contradicts the gate blocking the same branch is
    // worse than no figure. Non-spec regions are masked and the ledger schema is
    // required by the same reader, so a fenced template no longer inflates the
    // report either.
    const ledgerTables = collectLedgerTables(tddContent);
    if (ledgerTables.length === 0) {
      specs.push({
        specNumber: entry.specNumber,
        unitComponentTotal: unitComponentTcIds.size,
        doneCount: 0,
        inReviewCount: 0,
        exceptionCount: 0,
        openCount: unitComponentTcIds.size,
        blockedCount: 0,
        missingTcRefs: Array.from(unitComponentTcIds).sort(),
        exceptionRows: [],
      });
      continue;
    }

    const coveredTcIds = new Set<string>();
    const exceptionRows: Array<{ tddId: string; drId: string }> = [];

    // A TC is resolved only when EVERY TDD row referencing it is resolved.
    // One TC is deliberately split across several rows (a matrix TC must be
    // decomposed, one row per selector), so a first-row-wins rule reported the
    // TC as `done` while its remaining boundary rows were still `todo` —
    // `qfai report` printed `done: 1 / open: 0` mid-decomposition. Tallying per
    // TC instead makes partial progress visible as unresolved.
    const rowsPerTc = new Map<string, number>();
    const doneRowsPerTc = new Map<string, number>();
    const inReviewRowsPerTc = new Map<string, number>();
    const exceptionRowsPerTc = new Map<string, number>();
    // Counted apart from `open`: "not started" and "cannot start" are
    // different facts, and folding them together is what made a blocked row
    // indistinguishable from an unstarted one on every planning pass.
    const blockedRowsPerTc = new Map<string, number>();
    const bump = (counts: Map<string, number>, tc: string): void => {
      counts.set(tc, (counts.get(tc) ?? 0) + 1);
    };

    for (const scan of ledgerTables) {
      const tddHeaders = scan.table.headers.map((h) => h.trim());
      const statusIdx = tddHeaders.indexOf("Status");
      const drIdIdx = tddHeaders.indexOf("DR-ID");

      for (const row of scan.table.rows) {
        // The same predicate the gate applies: a line with no `TDD-ID` is not
        // an item, and a `TC-*` on an E2E/API row is a placement the ledger
        // schema forbids. Counting either here would print progress the gate
        // does not recognise.
        if (!isCoverageBearingRow(scan, row)) continue;
        // A set, not a list: a row naming two children of the same parent would
        // otherwise contribute that parent twice and never reach its row total.
        const rowRefs = new Set<string>();
        const refs = splitTcRefs(row[scan.tcRefsIndex] ?? "");
        for (const ref of refs) {
          const upper = ref.toUpperCase();
          coveredTcIds.add(upper);
          rowRefs.add(upper);
          const parent = resolveParentTcId(upper);
          if (parent) {
            coveredTcIds.add(parent);
            rowRefs.add(parent);
          }
        }
        for (const tc of rowRefs) bump(rowsPerTc, tc);

        const status = statusIdx >= 0 ? (row[statusIdx] ?? "").trim().toLowerCase() : "";
        if (TDD_DONE_STATUSES.has(status)) {
          for (const tc of rowRefs) bump(doneRowsPerTc, tc);
        }
        if (status === "blocked") {
          for (const tc of rowRefs) bump(blockedRowsPerTc, tc);
        }
        if (TDD_IN_REVIEW_STATUSES.has(status)) {
          for (const tc of rowRefs) bump(inReviewRowsPerTc, tc);
        }
        if (status === "exception") {
          for (const tc of rowRefs) bump(exceptionRowsPerTc, tc);
          exceptionRows.push({
            tddId: scan.tddIdIndex >= 0 ? (row[scan.tddIdIndex] ?? "").trim() : "",
            drId: drIdIdx >= 0 ? (row[drIdIdx] ?? "").trim() : "",
          });
        }
      }
    }

    const doneTcIds = new Set<string>();
    const inReviewTcIds = new Set<string>();
    const exceptionTcIds = new Set<string>();
    for (const [tc, total] of rowsPerTc) {
      const done = doneRowsPerTc.get(tc) ?? 0;
      const inReview = inReviewRowsPerTc.get(tc) ?? 0;
      const exception = exceptionRowsPerTc.get(tc) ?? 0;
      if (done === total) {
        doneTcIds.add(tc);
      } else if (exception > 0 && done + exception === total) {
        // Every row is accounted for and at least one carries a DR-ID waiver.
        exceptionTcIds.add(tc);
      } else if (inReview > 0 && done + exception + inReview === total) {
        // Every row has a passing test; at least one has not cleared its gates.
        inReviewTcIds.add(tc);
      }
    }

    // A TC is blocked when a row of it cannot start and the TC is not already
    // resolved. It stays inside `open` arithmetic — blocked work is still
    // unfinished work and still prohibits completion — but is reported apart.
    const blockedTcIds = new Set(
      Array.from(blockedRowsPerTc.keys()).filter(
        (tc) => !doneTcIds.has(tc) && !exceptionTcIds.has(tc),
      ),
    );

    const missingTcRefs = Array.from(unitComponentTcIds)
      .filter((id) => !coveredTcIds.has(id))
      .sort();
    // Union of the three accounted-for buckets, to avoid double-counting
    // overlapping TCs. The buckets are mutually exclusive by construction
    // above, so `open` is what remains.
    const accountedTcIds = new Set([...doneTcIds, ...exceptionTcIds, ...inReviewTcIds]);
    const doneCount = Array.from(unitComponentTcIds).filter((id) => doneTcIds.has(id)).length;
    const exceptionCount = Array.from(unitComponentTcIds).filter(
      (id) => exceptionTcIds.has(id) && !doneTcIds.has(id),
    ).length;
    const inReviewCount = Array.from(unitComponentTcIds).filter(
      (id) => inReviewTcIds.has(id) && !doneTcIds.has(id) && !exceptionTcIds.has(id),
    ).length;
    const openCount =
      unitComponentTcIds.size -
      Array.from(unitComponentTcIds).filter((id) => accountedTcIds.has(id)).length;

    specs.push({
      specNumber: entry.specNumber,
      unitComponentTotal: unitComponentTcIds.size,
      doneCount,
      inReviewCount,
      exceptionCount,
      openCount: Math.max(0, openCount),
      blockedCount: Array.from(unitComponentTcIds).filter((id) => blockedTcIds.has(id)).length,
      missingTcRefs,
      exceptionRows,
    });
  }

  return { specs };
}
