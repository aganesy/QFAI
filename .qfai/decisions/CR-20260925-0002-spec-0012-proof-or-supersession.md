# Change Request

- ID: `CR-20260925-0002`
- Title: `Completed spec-0012 rows lack proof or cite superseded cases`
- Raised by: `qfai-implement cross-spec re-review`
- Raised at: `2026-09-24T21:02:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `user (Codex interactive decision)`
- Approved at: `2026-09-24T21:13:46Z`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

Twenty-three additional `done` rows have selectors for which the focused replay selected zero tests.
This record excludes two other no-test rows with genuine product-contract choices (`TDD-0342` and
`TDD-0507`); they have separate intent CR drafts. Seventeen rows refer to still-declared behavior,
but their named tests prove only part of the case or no part. Six cite a TC or parent AC explicitly
marked superseded while the row still claims `done`. The exact row-specific reasons and source/test
discrepancies are in `tmp/cross-spec-closure/spec0012-selector-unmodified.md`. No proposed
replacement selector has been observed green or red for these 23 rows, so none is presented as
proof.

`TDD-0344` and `TDD-0370` both cite TC-0012-0335, whose required DESIGN-token/YAML equivalence is
not shown by the current certificate tests. `TDD-0456`, `TDD-0457`, and `TDD-0465` use dynamic
`it.each` names: a source-text selector and a runner-matched title cannot currently be assumed
equivalent. `TDD-0459` counts tests but never measures the stated 90% statement-coverage floor. The
remaining still-valid TCs likewise require a focused oracle rather than a convenient existing title.

## Reproduction

A minimal selector replay from repository root:

```powershell
$env:VITE_CONFIG_NATIVE_IGNORE_WARNING='true'; corepack pnpm -C packages/qfai exec vitest run tests/core/validators/layoutAntiPatterns.test.ts -t TC-0012-0331
```

Verbatim result excerpt (exit code `0`), while `TDD-0341` is `done` on `TC-0012-0331`:

```text
Test Files  1 skipped (1)
     Tests  19 skipped (19)
  Duration  2.76s (transform 372ms, setup 187ms, import 259ms, tests 0ms, environment 0ms)
```

The six obsolete-row contradictions are independently checkable in the upstream artifact: `TDD-0340`
is `done` on `TC-0012-0330`, whose `06_Test-Cases.md` section begins
`Status: superseded — replaced by TC-0012-0364 / TC-0012-0365`; `TDD-0351` is `done` on
`TC-0012-0342`, whose section begins `Status: superseded — replaced by TC-0012-0376 / TC-0012-0377`;
`TDD-0353` is `done` on `TC-0012-0344`, whose section begins
`Status: superseded — replaced by TC-0012-0360`; `TDD-0365` is `done` on `TC-0012-0321`, whose
section begins `Status: superseded — replaced by TC-0012-0357`. `TDD-0349` and `TDD-0359` cite
`AC-0012-0021` and `AC-0012-0028` through their TC sections; both AC headings carry
`Status: superseded` in `03_Acceptance-Criteria.md`.

## Proposed change

Preserve the 17 still-active TC obligations and make each independently executable and falsifiable.
Add the missing tests or measured coverage gate in their named files, or correct `Test file` in the
SDD-owned TC/ledger where the existing file is the wrong layer (notably `TDD-0354`'s CLI exit case).
Split independently observable boundary matrices before test execution. For `it.each` rows, give
each boundary a stable literal test title or a runner/validator contract that demonstrably selects
exactly that boundary; do not infer execution from source containment. Each row advances only after
an observed nonzero test count and row-specific RED/GREEN proof.

Retire the six rows whose TC or parent AC is explicitly superseded: `TDD-0340`, `TDD-0349`,
`TDD-0351`, `TDD-0353`, `TDD-0359`, `TDD-0365`. Keep their original evidence in this CR and keep the
replacement TC rows in the ledger. The old TDD IDs are never reused. No product acceptance is
changed by this defect correction.

## Blocked downstream items

| Item                 | Kind       | Why it depends on the artifact                                                           |
| -------------------- | ---------- | ---------------------------------------------------------------------------------------- |
| `spec-0012/TDD-0295` | ledger-row | `done` lacks an executable selector/complete TC proof, or the obligation was superseded. |
| `spec-0012/TDD-0340` | ledger-row | `done` lacks an executable selector/complete TC proof, or the obligation was superseded. |
| `spec-0012/TDD-0341` | ledger-row | `done` lacks an executable selector/complete TC proof, or the obligation was superseded. |
| `spec-0012/TDD-0344` | ledger-row | `done` lacks an executable selector/complete TC proof, or the obligation was superseded. |
| `spec-0012/TDD-0370` | ledger-row | `done` lacks an executable selector/complete TC proof, or the obligation was superseded. |
| `spec-0012/TDD-0346` | ledger-row | `done` lacks an executable selector/complete TC proof, or the obligation was superseded. |
| `spec-0012/TDD-0348` | ledger-row | `done` lacks an executable selector/complete TC proof, or the obligation was superseded. |
| `spec-0012/TDD-0349` | ledger-row | `done` lacks an executable selector/complete TC proof, or the obligation was superseded. |
| `spec-0012/TDD-0351` | ledger-row | `done` lacks an executable selector/complete TC proof, or the obligation was superseded. |
| `spec-0012/TDD-0353` | ledger-row | `done` lacks an executable selector/complete TC proof, or the obligation was superseded. |
| `spec-0012/TDD-0354` | ledger-row | `done` lacks an executable selector/complete TC proof, or the obligation was superseded. |
| `spec-0012/TDD-0356` | ledger-row | `done` lacks an executable selector/complete TC proof, or the obligation was superseded. |
| `spec-0012/TDD-0357` | ledger-row | `done` lacks an executable selector/complete TC proof, or the obligation was superseded. |
| `spec-0012/TDD-0358` | ledger-row | `done` lacks an executable selector/complete TC proof, or the obligation was superseded. |
| `spec-0012/TDD-0359` | ledger-row | `done` lacks an executable selector/complete TC proof, or the obligation was superseded. |
| `spec-0012/TDD-0362` | ledger-row | `done` lacks an executable selector/complete TC proof, or the obligation was superseded. |
| `spec-0012/TDD-0365` | ledger-row | `done` lacks an executable selector/complete TC proof, or the obligation was superseded. |
| `spec-0012/TDD-0453` | ledger-row | `done` lacks an executable selector/complete TC proof, or the obligation was superseded. |
| `spec-0012/TDD-0456` | ledger-row | `done` lacks an executable selector/complete TC proof, or the obligation was superseded. |
| `spec-0012/TDD-0457` | ledger-row | `done` lacks an executable selector/complete TC proof, or the obligation was superseded. |
| `spec-0012/TDD-0459` | ledger-row | `done` lacks an executable selector/complete TC proof, or the obligation was superseded. |
| `spec-0012/TDD-0465` | ledger-row | `done` lacks an executable selector/complete TC proof, or the obligation was superseded. |
| `spec-0012/TDD-0486` | ledger-row | `done` lacks an executable selector/complete TC proof, or the obligation was superseded. |

- Not blocked by this CR: the 25 true-selector rows in draft `CR-20260925-0001`, pivot `TDD-0342`,
  audit `TDD-0507`, and unrelated ledger rows. Their own blockers still apply.
- Overlapping open CRs: `CR-20260912-0003` discusses spec-0012 matrix rows in a future 2a rerun but
  grants no split. This draft does not replace it.

## Impact scope

- Specs: `spec-0012`
- Plans: none anticipated
- Tests: the eight named test-file families in
  `tmp/cross-spec-closure/spec0012-selector-unmodified.md`; add missing focused tests and measured
  statement-coverage gate, then run each selector
- Contracts: none proposed
- Schema: none proposed
- Upstream paths edited under this CR: `.qfai/specs/spec-0012/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0012/06_Test-Cases.md`, `.qfai/specs/spec-0012/tdd/test-list.md`,
  `.qfai/specs/spec-0012/09_delta.md`

## Decision needed from user

Approve preserving the 17 still-active TC obligations with new executable proof, and retiring the
six enumerated rows whose TC or parent AC is superseded, followed by `/qfai-sdd spec-0012` in
`re-derive` mode?

## Approved actions (owner skill rerun plan)

1. After explicit approval, record the actual approver and time in canonical
   `.qfai/decisions/CR-20260925-0002-spec-0012-proof-or-supersession.md`. Run `/qfai-sdd spec-0012`
   in `re-derive` mode. Stage 1 Triage uses `UPDATE/MODIFY` for surviving TC-to-test traceability
   and `UPDATE/REMOVE` for retired coverage targets, with item-level approval recorded. Phase 2b
   resets or retires exactly the rows below, splits matrices, and seeds missing boundaries. Phase 4
   records this CR in `.qfai/specs/spec-0012/09_delta.md`. Preserve the UI-bearing independent
   review gates.
2. Reset to `todo`, with this CR in `DR-ID`, the following 17 existing rows: `spec-0012/TDD-0295`,
   `spec-0012/TDD-0341`, `spec-0012/TDD-0344`, `spec-0012/TDD-0370`, `spec-0012/TDD-0346`,
   `spec-0012/TDD-0348`, `spec-0012/TDD-0354`, `spec-0012/TDD-0356`, `spec-0012/TDD-0357`,
   `spec-0012/TDD-0358`, `spec-0012/TDD-0362`, `spec-0012/TDD-0453`, `spec-0012/TDD-0456`,
   `spec-0012/TDD-0457`, `spec-0012/TDD-0459`, `spec-0012/TDD-0465`, `spec-0012/TDD-0486`. New split
   rows start `todo`.
3. Retire these six existing rows. Each line copies its current `Evidence` cell verbatim and states
   the test disposition:

   - `spec-0012/TDD-0340` — Evidence cell verbatim: `review schema 4 UX axes enforcement`. Retain the
     named test file for its other rows; this row selected no executable test, so no test is deleted.
   - `spec-0012/TDD-0349` — Evidence cell verbatim: `isOrdinalScore type guard`. Retain the named test
     file for its other rows; this row selected no executable test, so no test is deleted.
   - `spec-0012/TDD-0351` — Evidence cell verbatim:
     `per-iter evidence path composition (zero-padded index)`. Retain the named test file for its other
     rows; this row selected no executable test, so no test is deleted.
   - `spec-0012/TDD-0353` — Evidence cell verbatim:
     `serial iteration with at most 10 iters (CHG-002, MAX_ITERATIONS=10; superseded scope by TDD-0371)`.
     Retain the named test file for its other rows; this row selected no executable test, so no test is
     deleted.
   - `spec-0012/TDD-0359` — Evidence cell verbatim:
     `allFourAxesExceptional canonical-shape vs old-shape`. Retain the named test file for its other
     rows; this row selected no executable test, so no test is deleted.
   - `spec-0012/TDD-0365` — Evidence cell verbatim:
     `shouldStop max-iterations at index 14 (additional coverage)`. Retain the named test file for its
     other rows; this row selected no executable test, so no test is deleted.

4. `/qfai-atdd spec-0012` owns new Integration-row tests; `/qfai-implement spec-0012` owns remaining
   row tests and measured coverage verification. Neither marks a row `done` without a nonzero
   selected-test count and matching oracle. If any TC is found to have changed meaning, stop and
   raise an intent CR rather than pretending this defect record authorised a product decision.

## Resolution

Pending explicit approval and owner rerun.
