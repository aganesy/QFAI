# Change Request

- ID: `CR-20260926-0002`
- Title: `A completed spec-0012 row rests on a superseded review-schema chain that no test runs`
- Raised by: `qfai-implement cross-spec re-review`
- Raised at: `2026-09-26T07:00:00Z`
- Class: `defect`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

`CR-20260925-0002` retires `spec-0012/TDD-0340`, which is `done` on
`TC-0012-0330`. Its selector selects no test, and the only file naming the case
is `tests/integration/qfai-traceability.md`, which declares no test.

The retirement cannot be applied under that record alone:

- `TC-0012-0330` declares `Level: L1`, so it cannot stay without a ledger row.
- It is the only case for `EX-0012-0117`. Removing it leaves the example with
  no case (`QFAI-COV-203`).
- `EX-0012-0117` is the only example for `BR-0012-0019`. Removing the example
  leaves the rule with no example (`QFAI-COV-202`).
- `05_Examples.md` and `04_Business-Rules.md` are outside the paths
  `CR-20260925-0002` names.

Every item in the chain is already marked superseded:

| Item           | File                   | Superseded by                  |
| -------------- | ---------------------- | ------------------------------ |
| `TC-0012-0330` | `06_Test-Cases.md`     | `TC-0012-0364`, `TC-0012-0365` |
| `EX-0012-0117` | `05_Examples.md`       | `EX-0012-0128`                 |
| `BR-0012-0019` | `04_Business-Rules.md` | `BR-0012-0031`                 |

This record assumes `CR-20260925-0002` has landed as partly applied, with
`TDD-0340` still `done`. That record's `Applied at` waits on this one.

## Reproduction

With `TDD-0340` removed from the ledger and `TC-0012-0330` removed from
`06_Test-Cases.md`, `node scripts/check-dogfood-backlog.mjs --profile sdd`
reports one `QFAI-COV-203` error, an example with no test case, on
`EX-0012-0117` in `.qfai/specs/spec-0012/06_Test-Cases.md`.

## Proposed change

| #   | Option                                                                                                                                                      | Cost                                     | Risk                                                                                               | Recommended |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Remove the superseded chain: `TC-0012-0330`, `EX-0012-0117` and `BR-0012-0019`, with the carrier line. Retire `TDD-0340` with its `Evidence` kept verbatim. | Three spec edits and a ledger retirement | Any other reference to `BR-0012-0019` found by the rerun must be repointed at `BR-0012-0031` first | ✅          |
| 2   | Keep the chain and write a test for `TC-0012-0330` against the current review payload. Reset `TDD-0340` to `todo`.                                          | A test for a superseded shape            | Tests a payload the product no longer writes                                                       |             |
| 3   | Leave `TDD-0340` `done` over the carrier.                                                                                                                   | None now                                 | The row keeps claiming a proof no test runs                                                        |             |

Option 1 finishes a supersession already recorded on each item and changes no
product acceptance.

## Blocked downstream items

| Item                 | Kind       | Why it depends on the artifact                           |
| -------------------- | ---------- | -------------------------------------------------------- |
| `spec-0012/TDD-0340` | ledger-row | Its `done` rests on a superseded case that no test runs. |

- Not blocked by this CR: every other `spec-0012` row.
- Overlapping open CRs: `CR-20260925-0002` names `TDD-0340` in its action 3 and
  waits on this record for it.

## Impact scope

- Specs: `spec-0012`
- Plans: none
- Tests: `tests/integration/qfai-traceability.md` loses one carrier line; no
  test file changes
- Contracts: none
- Schema: none
- Upstream paths edited under this CR: `.qfai/specs/spec-0012/04_Business-Rules.md`,
  `.qfai/specs/spec-0012/05_Examples.md`, `.qfai/specs/spec-0012/06_Test-Cases.md`,
  `.qfai/specs/spec-0012/tdd/test-list.md`, `.qfai/specs/spec-0012/09_delta.md`

## Decision needed from user

Choose whether to remove the superseded review-schema chain and retire
`TDD-0340` (option 1, recommended), write a test for the superseded case
(option 2), or leave the row as it is (option 3).

## Approved actions (owner skill rerun plan)

1. After explicit approval, record the approver, time and option here. Run
   `/qfai-sdd spec-0012` in `re-derive` mode. Stage 1 Triage is `UPDATE/REMOVE`
   for option 1 or `UPDATE/MODIFY` for option 2. Phase 4 records this CR in
   `spec-0012/09_delta.md`.
2. Option 1: remove `TC-0012-0330`, `EX-0012-0117` and `BR-0012-0019`, and the
   carrier line. Retire `spec-0012/TDD-0340` under `## TDD-ID reservations`;
   its current `Evidence` cell verbatim is
   `review schema 4 UX axes enforcement`. Strike its entry from the carrier-only
   backlog. Option 2: reset `TDD-0340` to `todo` with this CR in `DR-ID`, and
   `/qfai-implement spec-0012` writes the test.
3. Fill `Resolution` and `Applied at`, then set `Applied at` on
   `CR-20260925-0002` if nothing else holds it.

## Resolution

Pending explicit approval and the owner rerun.
