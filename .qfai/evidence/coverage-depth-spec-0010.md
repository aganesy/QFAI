# Coverage Depth Matrix — spec-0010

## Scope

This matrix scores every active obligation the pack declares: the **13 user stories** of
`02_User-stories.md`, the **13 test cases** of `06_Test-Cases.md`, and the **12 business rules**
of `04_Business-Rules.md`. All three sets are read from the pack, not from the ledger.

The marks are derived from `.qfai/specs/spec-0010/tdd/test-list.md` as it stands on 2026-09-26, by the rules
below. A mark records what the ledger shows was run: a row's status, and whether its evidence
records an assertion that failed before the change and passed after it. It is not a reviewer's
reading of the assertions, and a reviewer who reads one and disagrees overrides the mark.

`Status` is a row verdict, not a mark, and is outside every total.

## How each cell is scored

- **A test case is one scenario of its declared `Type`.** The column that `Type` names — `normal`,
  `error`, `edge` or `boundary`; a case with no `Type` owes the normal path — is scored from the
  ledger rows citing the case: ✅ when every row is closed and records `RED:fail` or
  `RED:falsifiability` with `GREEN:pass`, ⚠️ when a row is closed without a failing RED or a row
  is still open beside a closed one, ❌ when no row is closed.
- **`Normal path` is `n/a` on a case that declares a non-normal `Type`.** Its normal sibling
  carries it, as the template states.
- **`Equivalence partitions` is scored on a case only when the case is a matrix**: two or more
  ledger rows with distinct `Boundary` values, one per partition. It takes the case's mark.
- **Every other depth column of a case is `n/a`.** One case is one scenario; the category is
  scored on the story row, which aggregates every case tracing to the story.
- **`Oracle strength`** is ✅ when every row records a failing RED, ⚠️ when a closed row records
  none, and ❌ when no row is closed.
- **A story row** takes `Normal path` and `Oracle strength` from the story's E2E ledger rows, and
  `Equivalence partitions`, `Error path`, `Edge cases` and `Boundary values` from the cases that
  trace to it through its acceptance criteria: ✅ when every such case is covered, ❌ when none
  is, ⚠️ otherwise. A category with no such case is `n/a`: the pack declares no obligation of
  that kind for the story.
- **`Special values`, `State transitions` and `Combinatorial` are `n/a` on every row.** The
  pack's `Type` vocabulary has no such category, so no case declares one. A case exercising a
  state change is scored under the `Type` it declares.
- **A business rule** is covered by the cases whose ledger rows name it in `BR-Ref`, or, where no
  row does, by the cases sharing one of its acceptance criteria. `Positive case` reads its normal
  cases, `Negative case` its error, edge and boundary cases (`n/a` when it has none), and
  `Conditional branches` is `n/a` unless the rule text states a condition.

## The matrix

| US/TC ID | Equivalence partitions | Normal path | Error path | Edge cases | Boundary values | Special values | State transitions | Combinatorial | Oracle strength | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| US-0010-0001 | n/a | ❌ | n/a | n/a | n/a | n/a | n/a | n/a | ❌ | ❌ |
| US-0010-0002 | n/a | ❌ | n/a | n/a | n/a | n/a | n/a | n/a | ❌ | ❌ |
| US-0010-0003 | n/a | ❌ | n/a | n/a | n/a | n/a | n/a | n/a | ❌ | ❌ |
| US-0010-0004 | n/a | ❌ | n/a | n/a | n/a | n/a | n/a | n/a | ❌ | ❌ |
| US-0010-0005 | n/a | ❌ | n/a | n/a | n/a | n/a | n/a | n/a | ❌ | ❌ |
| US-0010-0006 | n/a | ❌ | n/a | n/a | n/a | n/a | n/a | n/a | ❌ | ❌ |
| US-0010-0007 | n/a | ❌ | n/a | n/a | n/a | n/a | n/a | n/a | ❌ | ❌ |
| US-0010-0008 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| US-0010-0009 | n/a | ⚠️ | n/a | n/a | n/a | n/a | n/a | n/a | ⚠️ | ⚠️ |
| US-0010-0010 | n/a | ❌ | n/a | n/a | n/a | n/a | n/a | n/a | ❌ | ❌ |
| US-0010-0011 | ⚠️ | ❌ | ⚠️ | n/a | n/a | n/a | n/a | n/a | ❌ | ❌ |
| US-0010-0012 | ⚠️ | ❌ | n/a | n/a | ⚠️ | n/a | n/a | n/a | ❌ | ❌ |
| US-0010-0013 | ⚠️ | ⚠️ | n/a | n/a | n/a | n/a | n/a | n/a | ⚠️ | ⚠️ |
| TC-0010-0001 | n/a | ⚠️ | n/a | n/a | n/a | n/a | n/a | n/a | ⚠️ | ⚠️ |
| TC-0010-0005 | n/a | ⚠️ | n/a | n/a | n/a | n/a | n/a | n/a | ⚠️ | ⚠️ |
| TC-0010-0006 | ⚠️ | ⚠️ | n/a | n/a | n/a | n/a | n/a | n/a | ⚠️ | ⚠️ |
| TC-0010-0007 | n/a | ⚠️ | n/a | n/a | n/a | n/a | n/a | n/a | ⚠️ | ⚠️ |
| TC-0010-0008 | n/a | ❌ | n/a | n/a | n/a | n/a | n/a | n/a | ❌ | ❌ |
| TC-0010-0009 | n/a | ⚠️ | n/a | n/a | n/a | n/a | n/a | n/a | ⚠️ | ⚠️ |
| TC-0010-0010 | n/a | n/a | ⚠️ | n/a | n/a | n/a | n/a | n/a | ⚠️ | ⚠️ |
| TC-0010-0011 | n/a | n/a | ⚠️ | n/a | n/a | n/a | n/a | n/a | ⚠️ | ⚠️ |
| TC-0010-0012 | n/a | ⚠️ | n/a | n/a | n/a | n/a | n/a | n/a | ⚠️ | ⚠️ |
| TC-0010-0013 | n/a | n/a | n/a | n/a | ⚠️ | n/a | n/a | n/a | ⚠️ | ⚠️ |
| TC-0010-0014 | n/a | ✅ | n/a | n/a | n/a | n/a | n/a | n/a | ✅ | ✅ |
| TC-0010-0015 | n/a | ⚠️ | n/a | n/a | n/a | n/a | n/a | n/a | ⚠️ | ⚠️ |
| TC-0010-0016 | n/a | ⚠️ | n/a | n/a | n/a | n/a | n/a | n/a | ⚠️ | ⚠️ |

Matrix: **US 13 / TC 13**; scored cells **✅ 4 / ⚠️ 32 / ❌ 22** and n/a 176;
status **✅ 2 / ⚠️ 13 / ❌ 11**.

### Business rule coverage (§7)

| BR ID | Positive case | Negative case | Conditional branches | Covering TC | Status |
| --- | --- | --- | --- | --- | --- |
| BR-0010-0001 | ⚠️ | n/a | n/a | TC-0010-0001 | ⚠️ |
| BR-0010-0005 | ⚠️ | n/a | n/a | TC-0010-0005 | ⚠️ |
| BR-0010-0006 | ⚠️ | n/a | n/a | TC-0010-0006 | ⚠️ |
| BR-0010-0007 | ⚠️ | n/a | n/a | TC-0010-0007 | ⚠️ |
| BR-0010-0008 | ❌ | n/a | n/a | TC-0010-0008 | ❌ |
| BR-0010-0009 | ⚠️ | ⚠️ | n/a | TC-0010-0009, TC-0010-0010 | ⚠️ |
| BR-0010-0010 | ⚠️ | ⚠️ | n/a | TC-0010-0011 | ⚠️ |
| BR-0010-0011 | ⚠️ | n/a | n/a | TC-0010-0012 | ⚠️ |
| BR-0010-0012 | ⚠️ | ⚠️ | ⚠️ | TC-0010-0013 | ⚠️ |
| BR-0010-0013 | ✅ | n/a | n/a | TC-0010-0014 | ✅ |
| BR-0010-0014 | ⚠️ | n/a | n/a | TC-0010-0015 | ⚠️ |
| BR-0010-0015 | ⚠️ | n/a | n/a | TC-0010-0016 | ⚠️ |

Business rules: **BR 12**; scored cells **✅ 1 / ⚠️ 14 / ❌ 1** and n/a 20;
status **✅ 1 / ⚠️ 10 / ❌ 1**.

## Every ❌ cell, named

23 cell(s), each with the reason its mark was derived.

Each is an open gap, not an exemption: the ledger row that would cover it is still open.

- `TC-0010-0008` · Normal path: the case's declared `Type` (normal); no ledger row is closed (TDD-0012 todo).
- `TC-0010-0008` · Oracle strength: no row of the obligation is closed, so no assertion has been run against it.
- `US-0010-0001` · Normal path: the story's E2E ledger rows; no ledger row is closed (TDD-0018 todo).
- `US-0010-0001` · Oracle strength: the story's E2E rows: no row of the obligation is closed, so no assertion has been run against it.
- `US-0010-0002` · Normal path: the story's E2E ledger rows; no ledger row is closed (TDD-0019 todo).
- `US-0010-0002` · Oracle strength: the story's E2E rows: no row of the obligation is closed, so no assertion has been run against it.
- `US-0010-0003` · Normal path: the story's E2E ledger rows; no ledger row is closed (TDD-0020 todo).
- `US-0010-0003` · Oracle strength: the story's E2E rows: no row of the obligation is closed, so no assertion has been run against it.
- `US-0010-0004` · Normal path: the story's E2E ledger rows; no ledger row is closed (TDD-0021 todo).
- `US-0010-0004` · Oracle strength: the story's E2E rows: no row of the obligation is closed, so no assertion has been run against it.
- `US-0010-0005` · Normal path: the story's E2E ledger rows; no ledger row is closed (TDD-0022 todo).
- `US-0010-0005` · Oracle strength: the story's E2E rows: no row of the obligation is closed, so no assertion has been run against it.
- `US-0010-0006` · Normal path: the story's E2E ledger rows; no ledger row is closed (TDD-0023 todo).
- `US-0010-0006` · Oracle strength: the story's E2E rows: no row of the obligation is closed, so no assertion has been run against it.
- `US-0010-0007` · Normal path: the story's E2E ledger rows; no ledger row is closed (TDD-0024 todo).
- `US-0010-0007` · Oracle strength: the story's E2E rows: no row of the obligation is closed, so no assertion has been run against it.
- `US-0010-0010` · Normal path: the story's E2E ledger rows; no ledger row is closed (TDD-0027 todo).
- `US-0010-0010` · Oracle strength: the story's E2E rows: no row of the obligation is closed, so no assertion has been run against it.
- `US-0010-0011` · Normal path: the story's E2E ledger rows; no ledger row is closed (TDD-0028 todo).
- `US-0010-0011` · Oracle strength: the story's E2E rows: no row of the obligation is closed, so no assertion has been run against it.
- `US-0010-0012` · Normal path: the story's E2E ledger rows; no ledger row is closed (TDD-0029 todo).
- `US-0010-0012` · Oracle strength: the story's E2E rows: no row of the obligation is closed, so no assertion has been run against it.
- `BR-0010-0008` · Positive case: normal cases TC-0010-0008 (no ledger row names it in `BR-Ref`; the cases sharing one of its acceptance criteria); none covered.

## Every ⚠️ cell, named

46 cell(s), each with the reason its mark was derived.

- `TC-0010-0001` · Normal path: the case's declared `Type` (normal); closed without a failing RED: TDD-0001.
- `TC-0010-0001` · Oracle strength: a closed row records no failing RED (already satisfied, `RED:n-a`, or evidence outside the pointer grammar), or a row is open.
- `TC-0010-0005` · Normal path: the case's declared `Type` (normal); closed without a failing RED: TDD-0005.
- `TC-0010-0005` · Oracle strength: a closed row records no failing RED (already satisfied, `RED:n-a`, or evidence outside the pointer grammar), or a row is open.
- `TC-0010-0006` · Equivalence partitions: a matrix of 4 boundaries, one ledger row each; closed without a failing RED: TDD-0007, TDD-0008, TDD-0010.
- `TC-0010-0006` · Normal path: the case's declared `Type` (normal); closed without a failing RED: TDD-0007, TDD-0008, TDD-0010.
- `TC-0010-0006` · Oracle strength: a closed row records no failing RED (already satisfied, `RED:n-a`, or evidence outside the pointer grammar), or a row is open.
- `TC-0010-0007` · Normal path: the case's declared `Type` (normal); closed without a failing RED: TDD-0011.
- `TC-0010-0007` · Oracle strength: a closed row records no failing RED (already satisfied, `RED:n-a`, or evidence outside the pointer grammar), or a row is open.
- `TC-0010-0009` · Normal path: the case's declared `Type` (normal); closed without a failing RED: TDD-0013.
- `TC-0010-0009` · Oracle strength: a closed row records no failing RED (already satisfied, `RED:n-a`, or evidence outside the pointer grammar), or a row is open.
- `TC-0010-0010` · Error path: the case's declared `Type` (error); closed without a failing RED: TDD-0014.
- `TC-0010-0010` · Oracle strength: a closed row records no failing RED (already satisfied, `RED:n-a`, or evidence outside the pointer grammar), or a row is open.
- `TC-0010-0011` · Error path: the case's declared `Type` (error); closed without a failing RED: TDD-0015.
- `TC-0010-0011` · Oracle strength: a closed row records no failing RED (already satisfied, `RED:n-a`, or evidence outside the pointer grammar), or a row is open.
- `TC-0010-0012` · Normal path: the case's declared `Type` (normal); closed without a failing RED: TDD-0016.
- `TC-0010-0012` · Oracle strength: a closed row records no failing RED (already satisfied, `RED:n-a`, or evidence outside the pointer grammar), or a row is open.
- `TC-0010-0013` · Boundary values: the case's declared `Type` (boundary); closed without a failing RED: TDD-0017.
- `TC-0010-0013` · Oracle strength: a closed row records no failing RED (already satisfied, `RED:n-a`, or evidence outside the pointer grammar), or a row is open.
- `TC-0010-0015` · Normal path: the case's declared `Type` (normal); closed without a failing RED: TDD-0031.
- `TC-0010-0015` · Oracle strength: a closed row records no failing RED (already satisfied, `RED:n-a`, or evidence outside the pointer grammar), or a row is open.
- `TC-0010-0016` · Normal path: the case's declared `Type` (normal); closed without a failing RED: TDD-0032.
- `TC-0010-0016` · Oracle strength: a closed row records no failing RED (already satisfied, `RED:n-a`, or evidence outside the pointer grammar), or a row is open.
- `US-0010-0009` · Normal path: the story's E2E ledger rows; closed without a failing RED: TDD-0026.
- `US-0010-0009` · Oracle strength: the story's E2E rows: a closed row records no failing RED (already satisfied, `RED:n-a`, or evidence outside the pointer grammar), or a row is open.
- `US-0010-0011` · Equivalence partitions: the 3 cases tracing to it through its criteria are its partitions; some are not fully covered.
- `US-0010-0011` · Error path: 2 error case(s) (TC-0010-0010, TC-0010-0011); some are not fully covered.
- `US-0010-0012` · Equivalence partitions: the 2 cases tracing to it through its criteria are its partitions; some are not fully covered.
- `US-0010-0012` · Boundary values: 1 boundary case(s) (TC-0010-0013); some are not fully covered.
- `US-0010-0013` · Equivalence partitions: the 3 cases tracing to it through its criteria are its partitions; some are not fully covered.
- `US-0010-0013` · Normal path: the story's E2E ledger rows; closed without a failing RED: TDD-0033. Its cell reads `RED:fail`, but the evidence it points to records exit 0 on the first run, already satisfied.
- `US-0010-0013` · Oracle strength: the story's E2E rows: a closed row records no failing RED (already satisfied, `RED:n-a`, or evidence outside the pointer grammar), or a row is open.
- `BR-0010-0001` · Positive case: normal cases TC-0010-0001 (no ledger row names it in `BR-Ref`; the cases sharing one of its acceptance criteria); not all fully covered.
- `BR-0010-0005` · Positive case: normal cases TC-0010-0005 (no ledger row names it in `BR-Ref`; the cases sharing one of its acceptance criteria); not all fully covered.
- `BR-0010-0006` · Positive case: normal cases TC-0010-0006 (no ledger row names it in `BR-Ref`; the cases sharing one of its acceptance criteria); not all fully covered.
- `BR-0010-0007` · Positive case: normal cases TC-0010-0007 (no ledger row names it in `BR-Ref`; the cases sharing one of its acceptance criteria); not all fully covered.
- `BR-0010-0009` · Positive case: normal cases TC-0010-0009 (no ledger row names it in `BR-Ref`; the cases sharing one of its acceptance criteria); not all fully covered.
- `BR-0010-0009` · Negative case: non-normal cases TC-0010-0010 (no ledger row names it in `BR-Ref`; the cases sharing one of its acceptance criteria); not all fully covered.
- `BR-0010-0010` · Positive case: only non-normal cases cover it (TC-0010-0011; no ledger row names it in `BR-Ref`; the cases sharing one of its acceptance criteria).
- `BR-0010-0010` · Negative case: non-normal cases TC-0010-0011 (no ledger row names it in `BR-Ref`; the cases sharing one of its acceptance criteria); not all fully covered.
- `BR-0010-0011` · Positive case: normal cases TC-0010-0012 (no ledger row names it in `BR-Ref`; the cases sharing one of its acceptance criteria); not all fully covered.
- `BR-0010-0012` · Positive case: only non-normal cases cover it (TC-0010-0013; no ledger row names it in `BR-Ref`; the cases sharing one of its acceptance criteria).
- `BR-0010-0012` · Negative case: non-normal cases TC-0010-0013 (no ledger row names it in `BR-Ref`; the cases sharing one of its acceptance criteria); not all fully covered.
- `BR-0010-0012` · Conditional branches: the rule is conditional and only one side of its condition has a case.
- `BR-0010-0014` · Positive case: normal cases TC-0010-0015 (the ledger rows naming it in `BR-Ref`); not all fully covered.
- `BR-0010-0015` · Positive case: normal cases TC-0010-0016 (the ledger rows naming it in `BR-Ref`); not all fully covered.

## Story cells scored n/a

Beyond the three columns no case declares, these story cells are `n/a` because no case of
that kind traces to the story. A reviewer who finds such an obligation in the story's criteria
scores the cell ❌ and names the missing case.

- `US-0010-0001` · Equivalence partitions: no test case traces to this story through its acceptance criteria.
- `US-0010-0001` · Error path: no case of `Type` error traces to this story, so the pack declares no such obligation for it.
- `US-0010-0001` · Edge cases: no case of `Type` edge traces to this story, so the pack declares no such obligation for it.
- `US-0010-0001` · Boundary values: no case of `Type` boundary traces to this story, so the pack declares no such obligation for it.
- `US-0010-0002` · Equivalence partitions: no test case traces to this story through its acceptance criteria.
- `US-0010-0002` · Error path: no case of `Type` error traces to this story, so the pack declares no such obligation for it.
- `US-0010-0002` · Edge cases: no case of `Type` edge traces to this story, so the pack declares no such obligation for it.
- `US-0010-0002` · Boundary values: no case of `Type` boundary traces to this story, so the pack declares no such obligation for it.
- `US-0010-0003` · Equivalence partitions: no test case traces to this story through its acceptance criteria.
- `US-0010-0003` · Error path: no case of `Type` error traces to this story, so the pack declares no such obligation for it.
- `US-0010-0003` · Edge cases: no case of `Type` edge traces to this story, so the pack declares no such obligation for it.
- `US-0010-0003` · Boundary values: no case of `Type` boundary traces to this story, so the pack declares no such obligation for it.
- `US-0010-0004` · Equivalence partitions: no test case traces to this story through its acceptance criteria.
- `US-0010-0004` · Error path: no case of `Type` error traces to this story, so the pack declares no such obligation for it.
- `US-0010-0004` · Edge cases: no case of `Type` edge traces to this story, so the pack declares no such obligation for it.
- `US-0010-0004` · Boundary values: no case of `Type` boundary traces to this story, so the pack declares no such obligation for it.
- `US-0010-0005` · Equivalence partitions: no test case traces to this story through its acceptance criteria.
- `US-0010-0005` · Error path: no case of `Type` error traces to this story, so the pack declares no such obligation for it.
- `US-0010-0005` · Edge cases: no case of `Type` edge traces to this story, so the pack declares no such obligation for it.
- `US-0010-0005` · Boundary values: no case of `Type` boundary traces to this story, so the pack declares no such obligation for it.
- `US-0010-0006` · Equivalence partitions: no test case traces to this story through its acceptance criteria.
- `US-0010-0006` · Error path: no case of `Type` error traces to this story, so the pack declares no such obligation for it.
- `US-0010-0006` · Edge cases: no case of `Type` edge traces to this story, so the pack declares no such obligation for it.
- `US-0010-0006` · Boundary values: no case of `Type` boundary traces to this story, so the pack declares no such obligation for it.
- `US-0010-0007` · Equivalence partitions: no test case traces to this story through its acceptance criteria.
- `US-0010-0007` · Error path: no case of `Type` error traces to this story, so the pack declares no such obligation for it.
- `US-0010-0007` · Edge cases: no case of `Type` edge traces to this story, so the pack declares no such obligation for it.
- `US-0010-0007` · Boundary values: no case of `Type` boundary traces to this story, so the pack declares no such obligation for it.
- `US-0010-0008` · Equivalence partitions: no test case traces to this story through its acceptance criteria.
- `US-0010-0008` · Error path: no case of `Type` error traces to this story, so the pack declares no such obligation for it.
- `US-0010-0008` · Edge cases: no case of `Type` edge traces to this story, so the pack declares no such obligation for it.
- `US-0010-0008` · Boundary values: no case of `Type` boundary traces to this story, so the pack declares no such obligation for it.
- `US-0010-0009` · Equivalence partitions: no test case traces to this story through its acceptance criteria.
- `US-0010-0009` · Error path: no case of `Type` error traces to this story, so the pack declares no such obligation for it.
- `US-0010-0009` · Edge cases: no case of `Type` edge traces to this story, so the pack declares no such obligation for it.
- `US-0010-0009` · Boundary values: no case of `Type` boundary traces to this story, so the pack declares no such obligation for it.
- `US-0010-0010` · Equivalence partitions: no test case traces to this story through its acceptance criteria.
- `US-0010-0010` · Error path: no case of `Type` error traces to this story, so the pack declares no such obligation for it.
- `US-0010-0010` · Edge cases: no case of `Type` edge traces to this story, so the pack declares no such obligation for it.
- `US-0010-0010` · Boundary values: no case of `Type` boundary traces to this story, so the pack declares no such obligation for it.
- `US-0010-0011` · Edge cases: no case of `Type` edge traces to this story, so the pack declares no such obligation for it.
- `US-0010-0011` · Boundary values: no case of `Type` boundary traces to this story, so the pack declares no such obligation for it.
- `US-0010-0012` · Error path: no case of `Type` error traces to this story, so the pack declares no such obligation for it.
- `US-0010-0012` · Edge cases: no case of `Type` edge traces to this story, so the pack declares no such obligation for it.
- `US-0010-0013` · Error path: no case of `Type` error traces to this story, so the pack declares no such obligation for it.
- `US-0010-0013` · Edge cases: no case of `Type` edge traces to this story, so the pack declares no such obligation for it.
- `US-0010-0013` · Boundary values: no case of `Type` boundary traces to this story, so the pack declares no such obligation for it.

## What this matrix does not claim

It does not read an assertion. A ✅ says the ledger records a case that failed before the change and
passed after it; whether that case asserts all of its obligation is the reviewer's judgement. The
`n/a` cells classify by the declared `Type`, not by reading each criterion.
