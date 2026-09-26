# Change Request

- ID: `CR-20260923-0003`
- Title: `spec-0003 states the document lane as it was before change scoping`
- Raised by: `qfai-implement`
- Raised at: `2026-09-23T02:45:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `claude-code` — under the user's standing instruction to process every issue of this session with its own judgment; NOT a user decision on these options
- Approved at: `2026-09-23T03:05:00Z`
- Approved option: `1`
- Applied at: `2026-09-23T03:05:00Z` — see Resolution
- Superseded by: `-`

## Context

`.qfai/contracts/cli/shipped-workflows.md` §5 dimension 6 admits a lane scoped
to the change: skipped when a job of the same file has read the diff and found
nothing the lane reads, with its aggregate treating that skip as green only
where the scope said so. `qfai-docs.yml` ships that shape: a `scope` job, a
`checks` matrix that `needs: scope`, and an aggregate that exits 0 on
`skipped` when the scope reported `false`.

`spec-0003` still states the lane as it was before the scope existed, and
three of its statements now contradict the file and the contract:

| Artifact       | What it says                                        | What ships                                                                             |
| -------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `TC-0003-0056` | Verify bullet 3: the check job "depends on nothing" | `checks` has `needs: scope` and a scope-gated `if`, and `TDD-0058`'s test asserts both |
| `BR-0003-0048` | A skipped dependency fails the aggregate            | The docs aggregate exits 0 on `skipped` when the scope output is exactly `false`       |
| `EX-0003-0051` | Only `success` exits 0                              | The same, and the end-to-end case `["skipped","false",0]` pins it                      |

Two more defects surfaced against the same rows:

- **`TC-0003-0058` verify bullet 4 has no row.** A step that cannot preserve
  failure is rejected; the untagged `it.each` "rejects an aggregate step that
  cannot preserve failure" in
  `packages/qfai/tests/integration/shippedWorkflowPortability.test.ts` exercises
  it, and no ledger row carries it.
- **`TDD-0058` to `TDD-0061` name a test file in the wrong layer.** Their
  cases declare `Level: integration`, whose tests `QFAI-ATDD-112` requires
  under `tests/integration/**`, and their `Test file` is
  `packages/qfai/tests/e2e/spec0003ShippedWorkflowSetE2E.test.ts`. A
  `QFAI:SPEC-0003:TC-*` annotation written there is refused by
  `QFAI-ATDD-122`, so the stage that owes the annotation cannot write it where
  the tests are. The `Test file` cell holds a real path, so this skill may not
  rewrite it.

## Reproduction

```text
.qfai/specs/spec-0003/06_Test-Cases.md, TC-0003-0056 verify bullet 3:
  the job depends on nothing
packages/qfai/assets/init/root/.github/workflows/qfai-docs.yml, job checks:
  needs: scope
  if: ${{ needs.scope.outputs.run == 'true' && github.event.action != 'closed' }}
packages/qfai/assets/init/root/.github/workflows/qfai-docs.yml, job docs:
  if [ "${CHECK_RESULT}" = "skipped" ] && [ "${DOCS_SCOPE:-}" = "false" ]; then
    ... exit 0
```

## Options (at least 3) and recommendation

| #   | Option                                                                                                                                    | Cost                                                                                        | Risk                                                                                                      | Recommended |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Align the spec text with contract §5 dimension 6, seed the missing bullet-4 row, and move the four rows' tests into an integration module | Three statements restated, one row seeded, one test module moved and four `Test file` cells | None found. The product already behaves as the restated text says; the contract already admits it         | ✅          |
| 2   | Remove the scope job from `qfai-docs.yml` so the spec text holds again                                                                    | A product change that reverts change scoping                                                | Adopters pay the two document installs on every code-only change again, which the scope exists to stop    |             |
| 3   | Restate the text only, and leave the missing row and the test placement                                                                   | Three statements                                                                            | Bullet 4 stays covered by nothing, and the four rows stay unable to carry the annotation their stage owes |             |

## Proposed change

Option 1.

1. `TC-0003-0056` verify bullet 3 says the check job depends only on the
   scope job of the same file, and runs when the scope reports a change it
   reads.
2. `BR-0003-0048` keeps its rule for every aggregate, and adds the one case
   contract §5 dimension 6 admits: a change-scoped lane's skip is green only
   where the scope output is exactly `false`.
3. `EX-0003-0051` gains that case as a second example.
4. Phase 2b seeds one `Integration` row for `TC-0003-0058` verify bullet 4, at
   `todo`, recording this CR in `DR-ID`, with its own `Boundary`.
5. The cases of `TDD-0058` to `TDD-0061` move from
   `packages/qfai/tests/e2e/spec0003ShippedWorkflowSetE2E.test.ts` into an
   integration module under `packages/qfai/tests/integration/`, and Phase 2b
   rewrites the four rows' `Test file` to it. The end-to-end file keeps its
   `US-*` cases.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                                  |
| -------------------- | ------------ | ------------------------------------------------------------------------------- |
| `spec-0003/TDD-0058` | `ledger-row` | Its case's bullet 3 is restated, and its `Test file` moves                      |
| `spec-0003/TDD-0059` | `ledger-row` | Its `Test file` moves                                                           |
| `spec-0003/TDD-0060` | `ledger-row` | Its `Test file` moves                                                           |
| `spec-0003/TDD-0061` | `ledger-row` | Its `Test file` moves                                                           |
| `spec-0003/TDD-0062` | `ledger-row` | Its case cites `EX-0003-0051`, which this record restates                       |
| `spec-0003/TDD-0063` | `ledger-row` | Its case cites `EX-0003-0051`, and its sibling for bullet 4 is seeded beside it |

- Overlapping open CRs: `CR-20260913-0014` appends a chain to `spec-0003` and
  blocks no existing row. Neither record names an id the other allocates.

## Impact scope

- Specs: `spec-0003`
- Plans: `none`
- Tests: the six rows above and the row seeded for bullet 4; the test module
  the four cases move into
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0003/04_Business-Rules.md`,
  `.qfai/specs/spec-0003/05_Examples.md`,
  `.qfai/specs/spec-0003/06_Test-Cases.md`,
  `.qfai/specs/spec-0003/09_delta.md`,
  `.qfai/specs/spec-0003/tdd/test-list.md`

## Decision needed from user

Approve option 1: align `spec-0003` with the change-scoped document lane,
seed the missing row, and move the four cases into an integration module?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0003`, mode `re-derive`, making the edits in
   `## Proposed change` steps 1 to 3 and recording this Change Request in
   `spec-0003/09_delta.md`'s `## Change Requests` table. Its Phase 2b seeds the
   row in step 4 and rewrites the four `Test file` cells in step 5.
2. `/qfai-atdd spec-0003` moves the four cases into the integration module,
   adds the `QFAI:SPEC-0003:TC-*` annotations the three cases owe, and writes
   the handover entries for all seven rows, naming each row's falsifying
   mutation.
3. `/qfai-implement spec-0003` runs its Change Request preflight, which returns
   the six rows to `todo`, and then takes each through the falsifiability path.

## Resolution

Applied under option 1.

- `TC-0003-0056` verify bullet 3, `BR-0003-0048` and `EX-0003-0051` state the
  change-scoped document lane contract §5 dimension 6 admits.
- `TDD-0092` is seeded for `TC-0003-0058` verify bullet 4, at `todo`, with
  this record in `DR-ID`.
- `TDD-0058` to `TDD-0061` name
  `packages/qfai/tests/integration/shippedWorkflowCheckIndependence.test.ts`,
  which now holds their cases.
- The six parked rows are back at `todo` with this record in `DR-ID`.
- `spec-0003/09_delta.md` records this request.
