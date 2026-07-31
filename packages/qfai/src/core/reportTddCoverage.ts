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
import { parseFirstMarkdownTable, resolveTestCaseTable } from "./specPackParsers.js";
import {
  isCoverageTargetLevel,
  TDD_DONE_STATUSES,
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
        exceptionCount: 0,
        openCount: 0,
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
        exceptionCount: 0,
        openCount: unitComponentTcIds.size,
        missingTcRefs: Array.from(unitComponentTcIds).sort(),
        exceptionRows: [],
      });
      continue;
    }

    const tddTable = parseFirstMarkdownTable(tddContent);
    if (!tddTable) {
      specs.push({
        specNumber: entry.specNumber,
        unitComponentTotal: unitComponentTcIds.size,
        doneCount: 0,
        exceptionCount: 0,
        openCount: unitComponentTcIds.size,
        missingTcRefs: Array.from(unitComponentTcIds).sort(),
        exceptionRows: [],
      });
      continue;
    }
    const tddHeaders = tddTable.headers.map((h) => h.trim());
    const tcRefsIdx = tddHeaders.indexOf("TC-Refs");
    const statusIdx = tddHeaders.indexOf("Status");
    const tddIdIdx = tddHeaders.indexOf("TDD-ID");
    const drIdIdx = tddHeaders.indexOf("DR-ID");

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
    const exceptionRowsPerTc = new Map<string, number>();
    const bump = (counts: Map<string, number>, tc: string): void => {
      counts.set(tc, (counts.get(tc) ?? 0) + 1);
    };

    for (const row of tddTable.rows) {
      // A set, not a list: a row naming two children of the same parent would
      // otherwise contribute that parent twice and never reach its row total.
      const rowRefs = new Set<string>();
      if (tcRefsIdx >= 0) {
        const refs = splitTcRefs(row[tcRefsIdx] ?? "");
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
      }
      for (const tc of rowRefs) bump(rowsPerTc, tc);

      const status = statusIdx >= 0 ? (row[statusIdx] ?? "").trim().toLowerCase() : "";
      if (TDD_DONE_STATUSES.has(status)) {
        for (const tc of rowRefs) bump(doneRowsPerTc, tc);
      }
      if (status === "exception") {
        for (const tc of rowRefs) bump(exceptionRowsPerTc, tc);
        exceptionRows.push({
          tddId: tddIdIdx >= 0 ? (row[tddIdIdx] ?? "").trim() : "",
          drId: drIdIdx >= 0 ? (row[drIdIdx] ?? "").trim() : "",
        });
      }
    }

    const doneTcIds = new Set<string>();
    const exceptionTcIds = new Set<string>();
    for (const [tc, total] of rowsPerTc) {
      const done = doneRowsPerTc.get(tc) ?? 0;
      const exception = exceptionRowsPerTc.get(tc) ?? 0;
      if (done === total) {
        doneTcIds.add(tc);
      } else if (exception > 0 && done + exception === total) {
        // Every row is accounted for and at least one carries a DR-ID waiver.
        exceptionTcIds.add(tc);
      }
    }

    const missingTcRefs = Array.from(unitComponentTcIds)
      .filter((id) => !coveredTcIds.has(id))
      .sort();
    // Use union of done and exception to avoid double-counting overlapping TCs
    const resolvedTcIds = new Set([...doneTcIds, ...exceptionTcIds]);
    const doneCount = Array.from(unitComponentTcIds).filter((id) => doneTcIds.has(id)).length;
    const exceptionCount = Array.from(unitComponentTcIds).filter(
      (id) => exceptionTcIds.has(id) && !doneTcIds.has(id),
    ).length;
    const openCount =
      unitComponentTcIds.size -
      Array.from(unitComponentTcIds).filter((id) => resolvedTcIds.has(id)).length;

    specs.push({
      specNumber: entry.specNumber,
      unitComponentTotal: unitComponentTcIds.size,
      doneCount,
      exceptionCount,
      openCount: Math.max(0, openCount),
      missingTcRefs,
      exceptionRows,
    });
  }

  return { specs };
}
