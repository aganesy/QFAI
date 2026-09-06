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
import { collectTestCaseIds } from "./testCaseCoverageTargets.js";
import { maskNonSpecRegions, parseFirstMarkdownTable } from "./specPackParsers.js";
import {
  collectIncompleteLedgerTables,
  collectLedgerTables,
  isAtddIntegrationRow,
  isCoverageBearingRow,
  isRowShapeChecked,
  isWellFormedTcRef,
  TDD_LEDGER_REQUIRED_COLUMNS,
  TDD_DONE_STATUSES,
  TDD_IN_REVIEW_STATUSES,
  TDD_TERMINAL_STATUSES,
  splitTcRefs,
  resolveParentTcId,
} from "./tddHelpers.js";

export async function collectTddCoverage(
  entries: readonly SpecEntry[],
): Promise<ReportTddCoverage> {
  const specs: ReportTddCoverageSpec[] = [];

  for (const entry of entries) {
    // A retired spec's ledger is history, not progress. `validateTddList`
    // demotes every finding on it to `info` and prints "no longer gates"; a
    // report that went on counting the same `todo` rows as open work would have
    // the two commands disagreeing about the same file. Omitted rather than
    // zeroed, on the same terms as the missing-`06_Test-Cases.md` branch below:
    // "this spec owes nothing" is a different statement from "this spec is no
    // longer assessed".
    if (entry.status !== undefined && entry.status !== "active") continue;
    // The collector `validateTddList` decides coverage obligations from. The
    // report used to build its own set from the *first* `TC-ID` table alone and
    // skip the spec entirely when that table did not resolve, so a heading-form
    // spec (`## TC-0001` + `- Level: L1`) disappeared from the report while the
    // gate demanded a ledger row for every TC in it, and a TC declared in a
    // second table was gated but never counted.
    const { unitComponentTcIds, integrationTcIds, fileMissing, unresolved } =
      await collectTestCaseIds(entry.dir);
    // A spec with no `06_Test-Cases.md` is omitted rather than printed as a
    // zero row: the report would otherwise claim a document that does not
    // exist declares nothing, which is not the same statement.
    if (fileMissing) continue;

    // An empty coverage set used to end the spec here. It cannot: the
    // parked-row roll-call does not depend on that set, and a spec whose TCs
    // are all L3-L5 can still hold `Status=exception` rows that
    // `TDDLIST_EXCEPTION_PARKED` names. Ending early printed the spec with no
    // parked rows beside a gate that had just listed them.
    //
    // An unresolved `06_Test-Cases.md` is a third state, not an empty one:
    // the validator reports `TDDLIST_TC_TABLE_UNRESOLVED` and skips coverage,
    // so `0 / 0` here would be a claim nothing supports.
    const unassessableReason =
      unresolved === undefined
        ? undefined
        : unresolved === "no-table"
          ? "06_Test-Cases.md has no TC-ID table under its Test Case Table section"
          : "the Test Case Table has no TC-ID column";

    const tddListPath = path.join(entry.dir, "tdd", "test-list.md");
    let tddContent: string;
    try {
      tddContent = await readFile(tddListPath, "utf-8");
    } catch {
      if (unassessableReason !== undefined) {
        // Counts omitted on the same terms as every other unassessable
        // branch: the type says a spec carries counts or a reason, never
        // both, and `report --format json` publishes whatever is here.
        specs.push({
          specNumber: entry.specNumber,
          unassessable: unassessableReason,
          exceptionRows: [],
        });
        continue;
      }
      specs.push({
        specNumber: entry.specNumber,
        unitComponentTotal: unitComponentTcIds.size,
        doneCount: 0,
        inReviewCount: 0,
        exceptionCount: 0,
        openCount: unitComponentTcIds.size,
        blockedCount: 0,
        // Zero rather than omitted: there is no ledger, so "it holds no
        // Integration row" is a fact, not an absence of information.
        integrationRowTotal: 0,
        integrationRowOpenCount: 0,
        integrationTcExpected: integrationTcIds.size,
        integrationTcsWithoutRow: Array.from(integrationTcIds).sort(),
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

    // The validator stops at Check 3 when the ledger's *first* table is
    // missing a required column, so nothing past it — statuses, evidence,
    // test files — is ever checked. `collectLedgerTables` skips that table
    // and happily scores the schema-complete ones below it, which let the
    // report print `open: 0` for a file the gate had refused to validate at
    // all. The report shares the condition rather than the verdict: it does
    // not re-run the check, it declines to publish progress the gate has not
    // accepted.
    const firstTable = parseFirstMarkdownTable(maskNonSpecRegions(tddContent));
    const firstTableIsLedger =
      firstTable !== null &&
      TDD_LEDGER_REQUIRED_COLUMNS.every((column) =>
        firstTable.headers.some((header) => header.trim() === column),
      );
    // An incomplete *later* table counts too. The validator reports it as
    // `TDDLIST_REQUIRED_COLUMN_MISSING`, and `collectLedgerTables` drops it —
    // so scoring the remaining tables published `done: 1 / open: 0` while the
    // gate was failing on the rows that table holds. The report declines to
    // publish whenever the gate has said the ledger is not fully readable.
    const incompleteTables = collectIncompleteLedgerTables(tddContent);
    const ledgerUnvalidated =
      unassessableReason ??
      (firstTable !== null && !firstTableIsLedger
        ? "the first table in tdd/test-list.md is missing required columns, so validate stops before checking the ledger"
        : incompleteTables.length > 0
          ? `a ledger table in tdd/test-list.md is missing required columns (${incompleteTables[0]?.missing.join(", ") ?? ""}), so its rows are not read`
          : undefined);

    if (ledgerTables.length === 0) {
      if (ledgerUnvalidated !== undefined) {
        // Counts omitted, on the same terms as the branch below: the sole
        // table in a one-table ledger can be the malformed one, and printing
        // `open: N` for a file the validator stopped checking at Check 3
        // publishes progress nothing accepted — in JSON as well as markdown.
        specs.push({
          specNumber: entry.specNumber,
          unassessable: ledgerUnvalidated,
          exceptionRows: [],
        });
        continue;
      }
      specs.push({
        specNumber: entry.specNumber,
        unitComponentTotal: unitComponentTcIds.size,
        doneCount: 0,
        inReviewCount: 0,
        exceptionCount: 0,
        openCount: unitComponentTcIds.size,
        blockedCount: 0,
        // No readable ledger table means no rows at all, Integration included.
        integrationRowTotal: 0,
        integrationRowOpenCount: 0,
        integrationTcExpected: integrationTcIds.size,
        integrationTcsWithoutRow: Array.from(integrationTcIds).sort(),
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
    // Counted per row, not per TC, and outside the arithmetic above.
    // `unitComponentTcIds` is the population every count in that block is
    // scored against, and an `L3` TC is not a coverage target — so a spec whose
    // obligations are all integration-level printed `coverage-target TCs: 0`
    // and `open: 0` while `/qfai-sdd` Phase 2b had seeded it `todo`
    // `Layer = Integration` rows that prohibit completion. Rows because that is
    // what the seeding rule produces: a matrix-shaped TC is seeded one row per
    // independently observable boundary, so "how many TCs" would not describe
    // the outstanding work either.
    let integrationRowTotal = 0;
    let integrationRowOpenCount = 0;
    // The TCs an `Integration` row actually names, so the expected set can be
    // subtracted from it. A count of rows alone cannot answer "which
    // obligation has no row": Phase 2b seeds one row per boundary, so the row
    // total and the TC total are different numbers by design, and a spec that
    // was seeded for two of its three integration TCs still reports rows.
    const integrationRowTcIds = new Set<string>();
    const bump = (counts: Map<string, number>, tc: string): void => {
      counts.set(tc, (counts.get(tc) ?? 0) + 1);
    };

    for (const [tableIndex, scan] of ledgerTables.entries()) {
      const statusIdx = scan.headers.indexOf("Status");
      const drIdIdx = scan.headers.indexOf("DR-ID");

      for (const row of scan.table.rows) {
        // The same rule the gate applies: every row of the first table,
        // including a malformed one with no `TDD-ID`, and only real entries
        // past it. Asking `isLedgerRow` everywhere dropped a first-table
        // `exception` row with an empty id out of the roll-call while
        // `TDDLIST_EXCEPTION_PARKED` still named it by position.
        if (!isRowShapeChecked(scan, row, tableIndex)) continue;
        const status = statusIdx >= 0 ? (row[statusIdx] ?? "").trim().toLowerCase() : "";

        // The parked-row roll-call, before the coverage question is asked.
        // `TDDLIST_EXCEPTION_PARKED` names every `exception` row whatever its
        // `Layer`, and this block is what the report prints beside it; running
        // it through the coverage predicate dropped every API/E2E parked row
        // out of the report while the gate still named it.
        if (status === "exception") {
          exceptionRows.push({
            tddId: (row[scan.tddIdIndex] ?? "").trim(),
            drId: drIdIdx >= 0 ? (row[drIdIdx] ?? "").trim() : "",
          });
        }

        // Before the coverage predicate, for the same reason the parked-row
        // roll-call is: this is a roll-call of ledger rows, not a coverage
        // claim. `isCoverageBearingRow` would admit the row, but every count
        // downstream is scored against `unitComponentTcIds`, which an `L3` TC
        // is not in — so the row would be walked and still reported nowhere.
        if (isAtddIntegrationRow(scan, row)) {
          integrationRowTotal += 1;
          // Read here rather than from the coverage block below: that block is
          // gated on `isCoverageBearingRow`, and an `Integration` row is not
          // coverage-bearing, so the refs of the very rows this set is about
          // never reach it.
          for (const ref of splitTcRefs(row[scan.tcRefsIndex] ?? "")) {
            const upper = ref.toUpperCase();
            if (!isWellFormedTcRef(upper)) continue;
            integrationRowTcIds.add(upper);
            const parent = resolveParentTcId(upper);
            if (parent) integrationRowTcIds.add(parent);
          }
          // Unfinished is "not terminal": `todo` and every in-review status
          // alike. A `green` or `refactor` row has not cleared its blocking
          // reviewers, and the completion conditions refuse a ledger holding
          // one, so folding it in with `done` would print the spec as finished
          // on exactly the rows that stop it.
          if (!TDD_TERMINAL_STATUSES.has(status)) integrationRowOpenCount += 1;
        }

        // Everything below is a coverage claim, so the narrower predicate
        // applies: a `TC-*` on an E2E/API row is a placement the ledger schema
        // forbids, and counting it would print progress the gate does not
        // recognise.
        if (!isCoverageBearingRow(scan, row)) continue;
        // A set, not a list: a row naming two children of the same parent would
        // otherwise contribute that parent twice and never reach its row total.
        const rowRefs = new Set<string>();
        const refs = splitTcRefs(row[scan.tcRefsIndex] ?? "");
        for (const ref of refs) {
          const upper = ref.toUpperCase();
          // The same shape rule the gate applies. Without it a malformed
          // `TC-0001-0001-0001` resolved to the real parent here and printed
          // `done: 1 / open: 0` for a TC the gate was reporting as uncovered.
          if (!isWellFormedTcRef(upper)) continue;
          coveredTcIds.add(upper);
          rowRefs.add(upper);
          const parent = resolveParentTcId(upper);
          if (parent) {
            coveredTcIds.add(parent);
            rowRefs.add(parent);
          }
        }
        for (const tc of rowRefs) bump(rowsPerTc, tc);

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

    if (ledgerUnvalidated !== undefined) {
      // Counts are omitted, not zeroed: `report --format json` serializes this
      // object verbatim, so leaving them in published progress computed from
      // rows the validator never accepted — the markdown formatter hid them
      // and the machine-readable one did not, which is the worse half.
      specs.push({
        specNumber: entry.specNumber,
        unassessable: ledgerUnvalidated,
        exceptionRows,
      });
      continue;
    }

    specs.push({
      specNumber: entry.specNumber,
      unitComponentTotal: unitComponentTcIds.size,
      doneCount,
      inReviewCount,
      exceptionCount,
      openCount: Math.max(0, openCount),
      blockedCount: Array.from(unitComponentTcIds).filter((id) => blockedTcIds.has(id)).length,
      integrationRowTotal,
      integrationRowOpenCount,
      // The obligation, beside the rows that discharge it. Row counts alone
      // describe only what was seeded, so a spec whose Phase 2b never ran —
      // or an older one carrying a header-only ledger — reported nothing at
      // all: its TCs are not coverage targets, so the counts above are `0`,
      // and with no rows the line was suppressed too. No validator reports
      // the miss either (`ledger-preconditions.md`), which left `qfai report`
      // and `qfai validate` jointly silent about a spec with no integration
      // test at all.
      integrationTcExpected: integrationTcIds.size,
      integrationTcsWithoutRow: Array.from(integrationTcIds)
        .filter((id) => !integrationRowTcIds.has(id))
        .sort(),
      missingTcRefs,
      exceptionRows,
    });
  }

  return { specs };
}
