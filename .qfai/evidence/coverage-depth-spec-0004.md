# Coverage Depth Matrix — spec-0004

## Scope

Produced by `test-design-analyst` in the `coverage` phase of the `/qfai-atdd` run started
`2026-09-23T19:33:24.738Z`, over the working tree of branch `claude/qfai-steering-discussion-69d8a9`.
The subject is the removal of the work-log surface `.qfai/steering/`
(`09_delta.md` `## Triage (2026-09-23)`).

**Matrix rows.** The three test cases this run writes acceptance tests for: `TC-0004-0074`,
`TC-0004-0075` and `TC-0004-0076`, carried by the ledger rows `TDD-0067` … `TDD-0071`. All three
declare `Level` `integration` and route to `packages/qfai/tests/integration/**`.

`TC-0004-0018` is also new in this change (rows `TDD-0018`, `TDD-0072`). It declares `Level` `unit`, so
it owes no acceptance test here and has no matrix row. `/qfai-implement` owns both rows (DL-0026).

**Not scored in this run.** The other 14 user stories and 38 integration-routed test cases of this
pack predate the change, and the change neither adds nor removes a case for them. Their ledger rows
are not created or reset by this change. They are listed under "Obligations not scored" with their
ledger state. Whether they belong in this run's matrix is an open preflight decision, not settled
here.

**Business rule table.** Every active `BR-0004-*` of `04_Business-Rules.md` owns a row: 30 headings,
none carrying a retiring `Status:`. The rules this change removed (`BR-0004-0015`, `-0016`, `-0018`,
`-0019`, `-0020`) are deleted from the file and owe no row.

No `CON-API-*` or `CON-DB-*` contract exists in this repository, and no file of this pack binds one.
`BR-0004-0034` and `BR-0004-0035` bind `CLI-VAL`, a CLI contract under `.qfai/contracts/cli/`, which
owes no `QFAI-ATDD-113` / `-115` coverage and contributes no contract-derived failure.

## How the cells are scored

- **Matrix rows (planned).** No acceptance test for these rows exists yet. A cell is ✅ when the
  test case design declares a case for the category and a seeded ledger row carries it. The cell
  names the row and the assertion the `red` phase writes. The completion review re-reads the cells
  against the written tests.
- **Oracle strength** is ⚠️ on every planned row: each names the production mutation that must make
  it fail, and no run has shown it yet.
- **`n/a`** is used only where the category's obligation is absent for the row, as the checklist
  allows, and names the failure the row does not own where that is the reason.
- **Business rule rows this change does not touch ("carried")** are scored from
  `06_Test-Cases.md` and the ledger, not from a test run:
  - Positive ✅: a covering case has a `done` ledger row.
  - Positive ⚠️: the only covering rows are `exception`. A test file exists, but no RED/GREEN was
    recorded for it.
  - Negative is scored only where the rule names a failure distinct from the behaviour it asserts.
    A rule whose whole content is "X emits code Y" has that emission as its positive case and
    `n/a` as its negative.
  - Conditional ⚠️: the rule has branches and the design has a case for only some of them.

## The matrix

| US/TC ID     | Equivalence partitions | Normal path | Error path | Edge cases | Boundary values | Special values | State transitions | Combinatorial | Oracle strength | Status  |
| ------------ | ---------------------- | ----------- | ---------- | ---------- | --------------- | -------------- | ----------------- | ------------- | --------------- | ------- |
| TC-0004-0074 | ✅                     | ✅          | n/a        | ⚠️         | n/a             | ✅             | n/a               | n/a           | ⚠️              | planned |
| TC-0004-0075 | ✅                     | n/a         | ✅         | ⚠️         | n/a             | n/a            | n/a               | n/a           | ⚠️              | planned |
| TC-0004-0076 | ✅                     | ✅          | ✅         | ✅         | ⚠️              | ⚠️             | n/a               | ✅            | ⚠️              | planned |

Totals across the nine scored columns, 27 cells: **✅ 10 / ⚠️ 7 / ❌ 0**, `n/a` 10.

### Row notes

**TC-0004-0074 (`TDD-0067`).**

- Equivalence partitions: one entry for each code the removed validator raised (broken
  frontmatter, broken `links`, stale `active`, `promote-to` without a Decisions row, `kind: handoff`
  missing sections). These are the partitions that produced a finding.
- Normal path: `validate --profile full` over that tree. Planned assertions:
  - none of the five codes appears;
  - no finding's file, location or message has a `.qfai/steering/` path segment;
  - the run wrote its report, so an empty finding list cannot pass by construction.
- Error path `n/a`: `EX-0004-0042` declares no failure. The one kept failure of `BR-0004-0034`,
  `QFAI-ASSETS-006`, is owned by `TC-0004-0075` through `EX-0004-0043`.
- Special values: the broken-frontmatter entry.
- Boundary `n/a`: the 90-day stale threshold belonged to the removed validator, and no ordered
  domain survives in `BR-0004-0034`.
- Combinatorial `n/a`: after the removal the five conditions do not interact.
- Oracle mutation: restore the `validateWorklogSurface` call in `core/validate.ts`.

**TC-0004-0075 (`TDD-0068`).**

- Error path: `QFAI-ASSETS-006` at `error`, naming `.qfai/assistant/catalog/worklog-entry.schema.md`,
  on a tree `qfai init` wrote with the schema written back.
- Normal path `n/a`: `Type: error`. The normal sibling is `TC-0004-0074`.
- Oracle mutation: restore `catalog/worklog-entry.schema.md` in `core/governedAssistantManifest.ts`.

**TC-0004-0076 (`TDD-0069`, `TDD-0070`, `TDD-0071`).** Three boundaries, one row each.

| Boundary              | Row      | Planned case                                                          |
| --------------------- | -------- | --------------------------------------------------------------------- |
| `blocked-by-named`    | TDD-0069 | Filled `Blocked-By`, no `.qfai/steering/`: no error names the row     |
| `blocked-by-empty`    | TDD-0070 | Empty `Blocked-By`: `TDDLIST_BLOCKED_MISSING_REF` names the row       |
| `steering-unreadable` | TDD-0071 | Filled row plus an unreadable file: no finding names `.qfai/steering/` |

- Combinatorial: a filled `Blocked-By` is crossed with both steering states, absent (`TDD-0069`)
  and unreadable (`TDD-0071`).
- Oracle mutations:
  - `TDD-0069`: restore the `blockedWithoutWorklog` push in `validators/tddList.ts`.
  - `TDD-0070`: make `parseBlockedBy` accept an empty cell. This is the falsifiability mutation.
  - `TDD-0071`: restore the `readSteeringIndex` issue drain.

## Business rule coverage

| BR ID        | Positive case | Negative case | Conditional branches | Covering TC                                            | Status  |
| ------------ | ------------- | ------------- | -------------------- | ------------------------------------------------------ | ------- |
| BR-0004-0001 | ✅            | n/a           | n/a                  | TC-0004-0001, TC-0004-0002, TC-0004-0026               | carried |
| BR-0004-0002 | ⚠️            | n/a           | n/a                  | TC-0004-0001, TC-0004-0002                             | carried |
| BR-0004-0003 | ✅            | n/a           | n/a                  | TC-0004-0003                                           | carried |
| BR-0004-0004 | ✅            | n/a           | n/a                  | TC-0004-0004                                           | carried |
| BR-0004-0005 | ✅            | n/a           | ✅                   | TC-0004-0005 (with TC-0004-0003, -0004)                | carried |
| BR-0004-0006 | ✅            | n/a           | n/a                  | TC-0004-0006                                           | carried |
| BR-0004-0007 | ⚠️            | n/a           | n/a                  | TC-0004-0007                                           | carried |
| BR-0004-0008 | ⚠️            | ✅            | ⚠️                   | TC-0004-0008                                           | carried |
| BR-0004-0009 | ✅            | n/a           | n/a                  | TC-0004-0009                                           | carried |
| BR-0004-0010 | ✅            | n/a           | n/a                  | TC-0004-0010                                           | carried |
| BR-0004-0011 | ⚠️            | ✅            | n/a                  | TC-0004-0011, TC-0004-0013                             | carried |
| BR-0004-0012 | ⚠️            | ✅            | n/a                  | TC-0004-0012                                           | carried |
| BR-0004-0013 | ✅            | ✅            | n/a                  | TC-0004-0014, TC-0004-0013                             | carried |
| BR-0004-0014 | ⚠️            | ✅            | n/a                  | TC-0004-0015                                           | carried |
| BR-0004-0017 | ✅            | ✅            | ⚠️                   | TC-0004-0018 (TDD-0018, TDD-0072; L1, /qfai-implement) | planned |
| BR-0004-0021 | ✅            | n/a           | n/a                  | TC-0004-0022                                           | carried |
| BR-0004-0022 | ⚠️            | ✅            | n/a                  | TC-0004-0023                                           | carried |
| BR-0004-0023 | ✅            | n/a           | n/a                  | TC-0004-0024                                           | carried |
| BR-0004-0024 | ✅            | n/a           | n/a                  | TC-0004-0025                                           | carried |
| BR-0004-0025 | ✅            | n/a           | ✅                   | TC-0004-0055, TC-0004-0056                             | carried |
| BR-0004-0026 | ✅            | ✅            | ✅                   | TC-0004-0057, TC-0004-0058, TC-0004-0066               | carried |
| BR-0004-0027 | ✅            | ✅            | ✅                   | TC-0004-0059 … TC-0004-0062                            | carried |
| BR-0004-0028 | ✅            | ✅            | ⚠️                   | TC-0004-0063, TC-0004-0064                             | carried |
| BR-0004-0029 | ⚠️            | ✅            | ⚠️                   | TC-0004-0065, TC-0004-0066                             | carried |
| BR-0004-0030 | ✅            | ✅            | ⚠️                   | TC-0004-0067, TC-0004-0068                             | carried |
| BR-0004-0031 | ✅            | ✅            | ⚠️                   | TC-0004-0069, TC-0004-0070                             | carried |
| BR-0004-0032 | ✅            | n/a           | n/a                  | TC-0004-0071                                           | carried |
| BR-0004-0033 | ✅            | n/a           | ✅                   | TC-0004-0072, TC-0004-0073                             | carried |
| BR-0004-0034 | ✅            | ✅            | ✅                   | TC-0004-0074 (TDD-0067), TC-0004-0075 (TDD-0068)       | planned |
| BR-0004-0035 | ✅            | ✅            | ✅                   | TC-0004-0076 (TDD-0069, TDD-0070, TDD-0071)            | planned |

Totals across the three scored columns, 90 cells: **✅ 44 / ⚠️ 14 / ❌ 0**, `n/a` 32.

`Covering TC` is derived from `06_Test-Cases.md#EX-Ref` joined to `05_Examples.md#BR-Ref`.

Rules this change touches:

- `BR-0004-0034`, planned:
  - Positive: `TDD-0067`.
  - Negative: the kept failure `QFAI-ASSETS-006`, `TDD-0068`.
  - Conditional: withdrawn schema absent (`TDD-0067`) and present (`TDD-0068`).
- `BR-0004-0035`, planned:
  - Positive: `TDD-0069` and `TDD-0071`.
  - Negative: `TDD-0070`, the kept `TDDLIST_BLOCKED_MISSING_REF`.
  - Conditional: filled, empty, and filled beside an unreadable file.
- `BR-0004-0017`: narrowed by this change. It is scored here because its rows were reset, but both
  rows are `unit` and `/qfai-implement` writes them.

## Every ❌ cell, named

None. Neither table carries a `❌` cell.

## Every ⚠️ cell, named

### Matrix (7)

- `TC-0004-0074` Edge cases: the planned case puts every entry at the top of `.qfai/steering/`.
  The removed reader recursed into subdirectories and skipped `_templates/`, and no case places an
  entry deeper. This is partial rather than missing, because the removal deletes the reader
  outright: no depth-specific code path survives for a nested entry to reach.
- `TC-0004-0075` Edge cases: `EX-0004-0043` does not say whether the written-back schema keeps a
  `.assets.lock.json` record. `QFAI-ASSETS-006` is decided by the governed manifest rather than by
  the lock, so both states should report it. Only the state the fixture picks is exercised.
- `TC-0004-0076` Boundary values: only the empty `Blocked-By` is a planned failure case. The `-`
  placeholder and a blocker with no departure status are not exercised. The second of those is the
  literal value `EX-0004-0044` gives for the passing row (Finding 1).
- `TC-0004-0076` Special values: an unreadable file is planned. A whitespace-only `Blocked-By` is
  not.
- Oracle strength on all three rows: each mutation is named above and not yet shown to fail the
  test. That is shown at `red` for the branch-1 rows and by the falsifiability run for `TDD-0070`.

### Business rule table (14)

- Positive ⚠️ on `BR-0004-0002` and `BR-0004-0007`: the only covering rows (`TDD-0001`,
  `TDD-0002`, `TDD-0007`) are `exception`. A test file exists, but no RED/GREEN was recorded.
- Positive ⚠️ on `BR-0004-0008`, `-0011`, `-0012`, `-0014` and `-0022`: the rule states an
  accepting outcome and a failure, and the design has a case for the failure only.
- Positive ⚠️ on `BR-0004-0029`: the covering cases exercise the profile mismatch and the
  post-sunset path, not a matching read.
- Conditional ⚠️:
  - `BR-0004-0008`: the unparseable branch has no case of its own.
  - `BR-0004-0017`: only the empty value is a case. The whitespace-only and missing values the rule
    also names are not.
  - `BR-0004-0028`: a justification missing one of its three parts has no case of its own.
  - `BR-0004-0029`: legacy-path propagation inside the deprecation window has no case.
  - `BR-0004-0030`: conditions (a) and (c) failing have no case of their own.
  - `BR-0004-0031`: the under-floor count direction has no case.

## Obligations not scored in this run

Pre-existing obligations with no matrix row, and their ledger state today:

| Obligation                                        | Ledger rows                                                     | State                                                                     |
| ------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| US-0004-0001, -0016, -0020, -0027, -0028          | TDD-0054 … TDD-0058                                             | `todo`, E2E, carrier-only (`tests/e2e/qfai-traceability.md`)              |
| US-0004-0030, -0032, -0033, -0037, -0038, -0039   | TDD-0060, TDD-0062 … TDD-0066                                   | `todo`, E2E (0037..0039 also referenced by a real E2E test)               |
| US-0004-0034, -0035, -0036                        | TDD-0044 … TDD-0046                                             | `done`, E2E                                                               |
| TC-0004-0001 … -0015, -0022 … -0026, -0055 … -0073 | TDD-0001 … TDD-0015, TDD-0022 … TDD-0026, TDD-0032 … TDD-0053 | `done` or `exception` (`TC-0004-0006`, `-0014`, `-0069`, `-0070` are `unit`) |

`US-0004-0030` and `US-0004-0036` were reworded by this change. Their rows were not reset.

## Findings

1. **`EX-0004-0044` gives a `Blocked-By` value the kept rule rejects.**
   - The example's passing row has `Blocked-By` `spec-0004:TDD-0001`.
   - The kept check (`validators/tddList.ts`, `parseBlockedBy`, the block that raises
     `TDDLIST_BLOCKED_MISSING_REF`) requires both halves: the blocker and `— blocked at <status>`.
     A bare blocker raises that error.
   - A test that follows the example literally cannot go green. `BR-0004-0035`'s "non-empty" wording
     reads the same way.
   - Routed as a preflight decision. It contradicts the spec, so it is critical.
2. **The matrix does not cover the pack.** No matrix existed for spec-0004 before this run, and
   this one scores only the change's rows. The pre-existing debt is recorded above.

## Totals for the stage evidence

**✅ 54 / ⚠️ 21 / ❌ 0**, `n/a` 42, across 117 scored cells: 27 matrix cells and 90 business rule
cells. `Status` is a row verdict and is excluded.
