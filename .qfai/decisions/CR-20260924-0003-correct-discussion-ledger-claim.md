# Change Request

- ID: `CR-20260924-0003`
- Title: Correct unsupported discussion ledger completion claims
- Raised by: `requirements-analyst`
- Raised at: `2026-09-24T08:22:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `user` (2026-09-24 reply)
- Approved at: `2026-09-24T08:55:00Z`
- Approved option: `-`
- Applied at: `2026-09-24T09:54:00Z`
- Superseded by: `-`

## Context

`TC-0002-0009` requires a planner-first violation when a discussion artifact
asserts a single final winner. Two `done` ledger rows cite it, but their tests
cover different behavior and cannot establish that violation. The case
declares one violation, so the second row has no distinct boundary.

This correction does not decide whether the product or the requirement should
change. That choice remains in open `CR-20260912-0003`.

## Reproduction

`.qfai/specs/spec-0002/06_Test-Cases.md` declares:

> `TC-0002-0009` — discussion artifact asserts single final winner —
> planner-first violation is emitted.

`.qfai/specs/spec-0002/tdd/test-list.md` marks `TDD-0009` and `TDD-0010`
`done`. Their selectors respectively check skill guidance about `DESIGN.md`
and preflight when `prototyping.yaml` is absent. Both test selectors exist,
but neither emits or asserts the specified violation. Both ledger rows have
`Boundary = -`, which also raises `QFAI-TDDLIST-017`.

## Proposed change

Keep `TC-0002-0009` outstanding. Reset `TDD-0009` to `todo` with test path
and selector placeholders, preserving its old evidence in the delta. Retire
`TDD-0010`, preserve its evidence in this record and reserve its ID. Delete
only the skill-guidance `it` that `TDD-0009` misattributes.

Preserve the three runtime missing-artifact tests that `TDD-0010`
misattributes. Approved but unapplied `CR-20260913-0012` already defines
`spec-0013` test cases `TC-0013-0036` and `TC-0013-0037` for those
boundaries. Apply that record first. Its new optional-artifact criterion takes
the next free ID when applied; `AC-0013-0026` in that record is occupied in
the current tree. Move the runtime tests from
`packages/qfai/tests/core/sddPreflight.test.ts` into an integration test
file and connect them to the new `spec-0013` cases and ledger rows. This
file move aligns their layer with the integration ledger. Keep unrelated
`sddPreflight.test.ts` tests.

## Blocked downstream items

| Item                 | Kind       | Why it depends on the artifact                             |
| -------------------- | ---------- | ---------------------------------------------------------- |
| `spec-0002/TDD-0009` | ledger-row | Its completed evidence does not prove the cited test case. |
| `spec-0002/TDD-0010` | ledger-row | It duplicates the case without a distinct boundary.        |

- Not blocked by this CR: other `spec-0002` rows and the skill-retirement
  implementation.
- Prerequisite: apply `CR-20260913-0012` before this request.
- Overlapping open CR: `CR-20260912-0003` names these rows and their wider
  product requirements. Apply this defect correction first, then refresh
  that request against the corrected ledger before seeking its approval.

## Impact scope

- Specs: `spec-0002`; `spec-0013` as the prerequisite's destination
- Plans: none
- Tests: `packages/qfai/tests/e2e/discussionHardeningE2E.test.ts`,
  `packages/qfai/tests/core/sddPreflight.test.ts`, a new integration test
  file, `packages/qfai/tests/assets/completedRowRunsARealTest.test.ts`,
  `scripts/dogfood-backlog.json`
- Contracts: none
- Schema: none
- Upstream paths edited under this CR: `.qfai/specs/spec-0002/09_delta.md`,
  `.qfai/specs/spec-0002/tdd/test-list.md`. The prerequisite owns
  `spec-0013` upstream edits.

## Decision needed from user

Approve correcting the two false ledger claims and assigning the surviving
runtime tests to the separate `spec-0013` cases after
`CR-20260913-0012` is applied.

## Approved actions (owner skill rerun plan)

1. Apply the prerequisite `CR-20260913-0012` via
   `/qfai-sdd spec-0013` in `re-derive` mode. Use the next free criterion
   ID and its two new test cases and integration ledger rows. Do not bind
   their selectors before the integration test move below.
2. Rerun `/qfai-sdd spec-0002` in `re-derive` mode. Keep its test case,
   reset `TDD-0009` to `todo` and retire `TDD-0010`, reserving its ID.
   Record this CR in `09_delta.md`. The old evidence cells are
   `current e2e guidance test pass` and `current preflight unit test pass`.
3. Delete only the misattributed `it` in
   `packages/qfai/tests/e2e/discussionHardeningE2E.test.ts`. Move the
   missing-artifact runtime `it` selectors from
   `packages/qfai/tests/core/sddPreflight.test.ts` into
   `packages/qfai/tests/integration/`, updating their test-case annotations.
   Remove the two old rows from the completed-row regression list. Run the
   two new integration rows through `/qfai-atdd` and `/qfai-implement`
   evidence gates. Run affected suites and re-pin improved dogfood counts.
4. Refresh open `CR-20260912-0003` against the corrected ledger. Leave its
   product-choice status open until the user decides it separately.

## Resolution

The user approved this correction after the existing prerequisite on
2026-09-24.
