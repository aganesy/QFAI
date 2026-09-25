# Coverage Depth Matrix — spec-0004

## Scope

Produced by `test-design-analyst` in the `coverage` phase of the `/qfai-atdd` run started
`2026-09-23T19:33:24.738Z`, over the working tree of branch `claude/qfai-steering-discussion-69d8a9`.
The subject is the removal of the work-log surface `.qfai/steering/`
(`09_delta.md` `## Triage (2026-09-23)`).

**Matrix rows.** None. The three test cases this run wrote acceptance tests for, `TC-0004-0074`,
`TC-0004-0075` and `TC-0004-0076` (ledger rows `TDD-0067` … `TDD-0071`), were withdrawn by
`CR-20260925-0010` with their rows and their tests, and the pack no longer declares them.

`TC-0004-0018` is also new in this change (rows `TDD-0018`, `TDD-0072`). It declares `Level` `unit`, so
it owes no acceptance test here and has no matrix row. `/qfai-implement` owns both rows (DL-0026).

`CR-20260925-0010` withdrew the `R-WORKLOG-DRIFT` boundary of that test case with its ledger row
`TDD-0018`. `TDD-0072`, `done`, is the one row left.

**Not scored in this run.** The other 14 user stories and 38 integration-routed test cases of this
pack predate the change, and the change neither adds nor removes a case for them. Their ledger rows
are not created or reset by this change. They are listed under "Obligations not scored" with their
ledger state. Whether they belong in this run's matrix is an open preflight decision, not settled
here.

**Business rule table.** Every active `BR-0004-*` of `04_Business-Rules.md` owns a row: 28 headings,
none carrying a retiring `Status:`. The rules this change removed (`BR-0004-0015`, `-0016`, `-0018`,
`-0019`, `-0020`), and the two `CR-20260925-0010` withdrew (`BR-0004-0034`, `-0035`), are deleted from
the file and owe no row.

No `CON-API-*` or `CON-DB-*` contract exists in this repository, and no file of this pack binds one.

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

No row. `CR-20260925-0010` withdrew `TC-0004-0074`, `TC-0004-0075` and `TC-0004-0076`, the three rows
this matrix scored, together with ledger rows `TDD-0067` … `TDD-0071` and their tests.

Totals across the nine scored columns, 0 cells: **✅ 0 / ⚠️ 0 / ❌ 0**, `n/a` 0.

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
| BR-0004-0017 | ⚠️            | ✅            | ⚠️                   | TC-0004-0018 (TDD-0072; L1, /qfai-implement)           | planned |
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

Totals across the three scored columns, 84 cells: **✅ 37 / ⚠️ 15 / ❌ 0**, `n/a` 32.

`Covering TC` is derived from `06_Test-Cases.md#EX-Ref` joined to `05_Examples.md#BR-Ref`.

Rules this change touches:

- `BR-0004-0017`: narrowed by this change, and again by `CR-20260925-0010`, which withdrew its
  `R-WORKLOG-DRIFT` clause with ledger row `TDD-0018`. It is scored here because its rows were reset.
  Its one remaining row, `TDD-0072`, is `unit` and `done`, written by `/qfai-implement`.
  - Positive ⚠️: the rule accepts a non-empty justification and rejects an empty one, and the design
    has a case for the rejection only. The ✅ this cell carried before rested on the withdrawn
    `R-WORKLOG-DRIFT` boundary, which tested a different code, not a non-empty justification.
  - Negative: `TDD-0072`, the empty `R-REJECTED-READOPT` justification.

`BR-0004-0034` and `BR-0004-0035` were withdrawn by `CR-20260925-0010` and owe no row.

## Every ❌ cell, named

None. Neither table carries a `❌` cell.

## Every ⚠️ cell, named

### Matrix (0)

None. The matrix has no row.

### Business rule table (15)

- Positive ⚠️ on `BR-0004-0002` and `BR-0004-0007`: the only covering rows (`TDD-0001`,
  `TDD-0002`, `TDD-0007`) are `exception`. A test file exists, but no RED/GREEN was recorded.
- Positive ⚠️ on `BR-0004-0008`, `-0011`, `-0012`, `-0014`, `-0017` and `-0022`: the rule states an
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

1. **The matrix does not cover the pack.** No matrix existed for spec-0004 before this run, and
   this one scored only the change's rows, which `CR-20260925-0010` then withdrew. The pre-existing
   debt is recorded above.

A finding on `EX-0004-0044` and `BR-0004-0035` stood here. `CR-20260925-0010` withdrew both, so it
no longer applies.

## Totals for the stage evidence

**✅ 37 / ⚠️ 15 / ❌ 0**, `n/a` 32, across 84 scored cells: 0 matrix cells and 84 business rule
cells. `Status` is a row verdict and is excluded.
