# Change Request

- ID: `CR-20260923-0007`
- Title: `Two clauses of the aggregate failure check have no case`
- Raised by: `qfai-atdd`
- Raised at: `2026-09-23T08:26:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `claude-code` — under the user's standing instruction to process every issue of this session with its own judgment; NOT a user decision on these options
- Approved at: `2026-09-23T08:26:20Z`
- Approved option: `1`
- Applied at: `2026-09-23T08:26:35Z` — see Resolution
- Superseded by: `-`

## Context

`aggregateFailureViolations` in
`packages/qfai/tests/integration/shippedWorkflowPortability.test.ts` rejects an
aggregate that cannot preserve failure. Two of its clauses are about the shape
of the job rather than of its step:

- `job.steps.length !== 1` — an aggregate with a second step doing work of its
  own;
- `job.job["continue-on-error"]` — `continue-on-error` set on the job.

`TC-0003-0058` verify bullet 4 names step shapes only: a conditional, a tolerant
shell, a step-level `continue-on-error`, an action, or work of the step's own.
`TDD-0092`'s seven cases cover exactly those. Removing either job-shape clause
leaves every test green, and no case or row states the obligation.

## Options (at least 3) and recommendation

| #   | Option                                                                                              | Cost                  | Risk                                                                                        | Recommended |
| --- | --------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------- | ----------- |
| 1   | Add a fifth verify bullet to `TC-0003-0058` for the job shape, and seed one `Integration` row on it | One bullet, one row   | None found; the check already rejects both shapes                                           | ✅          |
| 2   | Widen bullet 4 and add the two cases to `TDD-0092`'s selector                                       | One bullet, two cases | Reopens a `done` row's test and its evidence for a boundary it did not own                  |             |
| 3   | Remove the two clauses from the check                                                               | Two lines             | An aggregate with a second step, or tolerant at job level, would pass the portability check |             |

## Proposed change

Option 1.

1. `TC-0003-0058` gains verify bullet 5: an aggregate whose job shape cannot
   preserve failure — a second step, or `continue-on-error` set on the job — is
   rejected as well.
2. `/qfai-sdd` Phase 2b seeds one `Integration` row on `TC-0003-0058` at `todo`,
   with this record in `DR-ID`, `Test file` and `Selector` `-`, and the
   `Boundary` `unpreservable-job-shape-fails-aggregate`.
3. `/qfai-atdd spec-0003` writes the test in the same file and hands the row
   over. The file is in the RED test manifest of `TDD-0062`, `TDD-0063` and
   `TDD-0092`, so the new row's entry carries their shared-artifact re-verify.

## Blocked downstream items

None. The rows on `TC-0003-0058` stay `done`: the bullet they verify is
unchanged, and the new row re-verifies them against the edited file.

## Impact scope

- Specs: `spec-0003`
- Plans: `none`
- Tests: one new case in `shippedWorkflowPortability.test.ts`
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0003/06_Test-Cases.md`,
  `.qfai/specs/spec-0003/09_delta.md`,
  `.qfai/specs/spec-0003/tdd/test-list.md`

## Decision needed from user

Approve option 1: add a job-shape bullet to `TC-0003-0058` and a row for it?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0003` makes steps 1 and 2, and records this request in
   `09_delta.md`.
2. `/qfai-atdd spec-0003` makes step 3.
3. `/qfai-implement spec-0003` takes the new row through the falsifiability
   path.

## Resolution

Applied under option 1.

- `TC-0003-0058` carries verify bullet 5 for the job shape.
- `TDD-0093` is seeded on it at `todo`, with this record in `DR-ID`.
- `spec-0003/09_delta.md` records this request.
