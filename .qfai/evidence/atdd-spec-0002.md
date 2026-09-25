# ATDD Evidence: spec-0002

## Objective

Two runs have written here.

- The first carried the proof for `TDD-0001`, the one `Integration` row whose
  test could be identified then.
- The run started 2026-09-25T19:23:36.331Z regenerates the coverage records after
  `CR-20260912-0003` (option 1) re-derived the pack and its ledger. That is
  the record half of the request's approved action 9. The other half, the
  tests the six `todo` E2E rows owe, is not done, so action 9 stays open. The
  run writes no test and advances no row.

## Inputs reviewed (files/paths)

- `.qfai/specs/spec-0002/06_Test-Cases.md`
- `.qfai/specs/spec-0002/04_Business-Rules.md`
- `.qfai/specs/spec-0002/tdd/test-list.md`
- `packages/qfai/tests/core/sddPreflight.test.ts`
- `packages/qfai/src/core/discussionPack.ts`

Run started 2026-09-25T19:23:36.331Z, in addition:

- `.qfai/specs/spec-0002/01_Spec.md` to `07_Decisions.md`, and `09_delta.md`
- `.qfai/decisions/CR-20260912-0003-spec-0002-states-two-rules-the-product-replaced.md`
- `.qfai/decisions/DR-0298-intent-driven-rows-close-without-per-row-review.md`
- The ten test files listed under Commands executed

## Decisions made (with rationale)

Run started 2026-09-25T19:23:36.331Z: the run regenerates the two coverage
records and writes no test. Action 9 of `CR-20260912-0003` asks for both: the
records, and the tests for every ATDD-owned row still owed. This run does the
records only. The tests for `TDD-0013`, `-0014`, `-0015`, `-0017`, `-0018`
and `-0019` are still owed, so action 9 stays open, and the six rows stay at
`todo` under Gaps. The reset rows `TDD-0008`, `-0009`, `-0012` and
`-0016` already have tests and are at `exception` under `DR-0298`, so they owe
this stage nothing.

First run:

`TDD-0001` names `TC-0002-0001`: a discussion pack of fifteen files passes
readiness with no required-file issue. The row's `Test file` and `Selector`
named a test that does not exist — the wording predates the rename that came
with the move onto `DESIGN.md`. Both were corrected to the test that discharges
the obligation, identified by what it asserts rather than by what it is called:
`REQUIRED_DISCUSSION_PACK_MARKDOWN_FILES` holds exactly fifteen names, the test
seeds all fifteen and asserts the run reports no blockers.

The row declares `Run output retained: no`. Its `Evidence` cell said "current
asset test pass", which is a verdict and not a record, so the reviewer verdicts
and pack seals a completed entry normally carries cannot be recorded and must
not be invented.

The RED cannot be observed — the implementation shipped long before this
record — so the row takes the falsifiability path, and the mutation below is
what that path asks for.

## Grilling Session

### /qfai-atdd — run started 2026-09-25T19:23:36.331Z

Preflight: confidence high

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |

No session was opened. The spec, the ledger and the approved action are settled
input, and the run's work is to score them.

## Work performed (what changed, where)

Run started 2026-09-25T19:23:36.331Z:

- `.qfai/evidence/coverage-depth-spec-0002.md` — regenerated from the pack as
  option 1 of `CR-20260912-0003` leaves it: seven active stories, five active
  test cases and four active business rules. Both tables were re-scored from
  the tests that carry each obligation, both totals recounted, every `❌` and
  `⚠️` cell named, and the findings rewritten.
- This file — this run's grilling block, the totals under
  `## Coverage Depth Matrix`, the work orders, and the gaps.

No test, ledger row or spec file changed.

First run:

- `.qfai/specs/spec-0002/tdd/test-list.md` — `TDD-0001`'s `Test file`,
  `Selector` and `Evidence` corrected. `TDD-0011`'s `Selector` and `Evidence`
  corrected; that row is `validators`, so its proof is in
  `.qfai/evidence/implement-spec-0002.md`. No `Status` moved.
- This file created.

## Commands executed + key outputs

Every command ran from `packages/qfai`. The clean-tree runs were taken at
revision `84081298686311832c7e7ac3b7da08eb542b40b0`. The mutation was reverted
from a copy of the pre-mutation bytes, and the tree re-addressed afterwards to
confirm it had returned to the clean value.

| Run                       | Command                                                                                                                                     | Result              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `TDD-0001` GREEN          | `npx vitest run tests/core/sddPreflight.test.ts`                                                                                            | 26 passed           |
| `TDD-0001` falsifiability | `npx vitest run tests/core/sddPreflight.test.ts`                                                                                            | 1 failed, 25 passed |
| Refactor verify           | `npx vitest run tests/core/sddPreflight.test.ts tests/validators/uix/threeLayer.test.ts`                                                    | 36 passed           |
| Checkpoint                | `npx vitest run --project core --project validators --exclude 'tests/core/prFixMonitor.test.ts' --exclude 'tests/core/prMergePlan.test.ts'` | 4601 passed         |

Run started 2026-09-25T19:23:36.331Z, each file run alone from `packages/qfai` with
`NO_COLOR=1 node node_modules/vitest/vitest.mjs run <file> --reporter=dot`:

| File                                                           | Result    |
| -------------------------------------------------------------- | --------- |
| `tests/core/sddPreflight.test.ts`                              | 23 passed |
| `tests/validators/uix/threeLayer.test.ts`                      | 10 passed |
| `tests/integration/validatorConvergenceIntegration.test.ts`    | 7 passed  |
| `tests/integration/discussionSkillTemplateIntegration.test.ts` | 24 passed |
| `tests/e2e/discussionHardeningE2E.test.ts`                     | 2 passed  |
| `tests/e2e/spec0002PlannerFirstE2E.test.ts`                    | 1 passed  |
| `tests/assets/assets.test.ts`                                  | 94 passed |
| `tests/assets/sddStage0PrototypingOptional.test.ts`            | 12 passed |
| `tests/assets/designDirectionInterview.test.ts`                | 12 passed |
| `tests/integration/sddOptionalArtifactPreflight.test.ts`       | 3 passed  |

Scoped gate, from the repository root against the built package:
`node packages/qfai/dist/cli/index.cjs validate --profile atdd --fail-on error --spec spec-0002`
exits 1 with `error=9`. All nine are `QFAI-TEST-003` (`describe.skip`) in
`packages/qfai/tests/e2e/spec0004SaasPackageAndPackLocationE2E.test.ts`,
`packages/qfai/tests/e2e/spec0006DoctorRemediationE2E.test.ts` and
`packages/qfai/tests/integration/spec0004SaasPackageAndPackLocation.test.ts`.
None names a spec-0002 obligation. The one spec-0002 finding is
`QFAI-ATDD-119` (`info`): nine obligations are covered by an annotation carrier
alone — `US-0002-0001`, `-0002`, `-0003`, `-0008`, `-0009`, `-0010`, and
`TC-0002-0001`, `-0009`, `-0011`.

## Test volume estimate

Not applicable to either run. Neither authored a test.

## Coverage obligations checklist

Scored per obligation in the Coverage Depth Matrix below. In short:

| Obligation                                                  | Covered by                                                                                       |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `US-0002-0005`                                              | `packages/qfai/tests/e2e/spec0002PlannerFirstE2E.test.ts` (`TDD-0016`)                           |
| `US-0002-0001`, `-0002`, `-0003`, `-0008`, `-0009`, `-0010` | No test; `TDD-0013`, `-0014`, `-0015`, `-0017`, `-0018`, `-0019` are `todo`                      |
| `TC-0002-0001`, `-0008`, `-0009`, `-0010`, `-0011`          | A passing test each; three are carrier-only for placement or annotation reasons the matrix names |
| `CON-API`, `CON-DB`                                         | None referenced by this spec                                                                     |

## Ledger rows advanced

No run recorded here moved a row's status. `TDD-0001` was already `done` when
its evidence was written. `TDD-0008`, `-0009` and `-0016` were closed at
`exception` under `DR-0298` by `/qfai-implement`, which wrote their sections.

| TDD-ID     | Obligation     | Layer       | RED provenance   | Status    |
| ---------- | -------------- | ----------- | ---------------- | --------- |
| `TDD-0001` | `TC-0002-0001` | integration | falsifiability   | done      |
| `TDD-0008` | `TC-0002-0008` | integration | none (`DR-0298`) | exception |
| `TDD-0009` | `TC-0002-0009` | integration | none (`DR-0298`) | exception |
| `TDD-0016` | `US-0002-0005` | E2E         | none (`DR-0298`) | exception |

### TDD-0001

- TDD-ID: TDD-0001
- Layer: integration
- Test file: packages/qfai/tests/core/sddPreflight.test.ts
- Selector: returns ready when latest discussion-pack passes readiness checks
- TC-ref: TC-0002-0001
- Run output retained: no
- Backfill note: the row's cell recorded a verdict with no command and no output, so nothing of the original run survives. The test was re-run for the GREEN below, and the mutation below was applied and reverted to establish that the test discriminates. No reviewer verdict is recorded because none can be reconstructed.
- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: 84081298686311832c7e7ac3b7da08eb542b40b0
- Round 1: Satisfied-by: packages/qfai/src/core/discussionPack.ts, REQUIRED_DISCUSSION_PACK_MARKDOWN_FILES — the fifteen names a pack must hold for readiness to report no missing file.
- Round 1: Falsifiability command: npx vitest run tests/core/sddPreflight.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed, 25 passed (26). The row's own case fails on `expect(result.packGaps).toEqual([])`, an assertion inside its selector.
- Round 1: Falsifiability revision: working-tree+1ef4f7bef2f8c031f9e09e181e9f5c1f7bd86c9c25ad1cf8ea6e5bdc82d3fc51
- Round 1: GREEN command: npx vitest run tests/core/sddPreflight.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 26 passed (26)
- Round 1: RED test hash: 35c8ceeb6d77cd1886af8be635186cb03f08822b8b3f28937d5635744e335089
- Round 1: RED test manifest: packages/qfai/tests/core/sddPreflight.test.ts

The mutation added a sixteenth name to the required list. One of the file's
twenty-six cases dies, and it is the row's own: a missing required file is
recorded as a pack gap and leaves `status` at `ready`, so the assertion that
discriminates on the list is the one holding a complete pack to no gap.

- Refactor verify command: npx vitest run tests/core/sddPreflight.test.ts tests/validators/uix/threeLayer.test.ts
- Refactor verify result: Test Files 2 passed (2); Tests 36 passed (36)
- Refactor verify revision: 84081298686311832c7e7ac3b7da08eb542b40b0
- Checkpoint verification command: npx vitest run --project core --project validators --exclude 'tests/core/prFixMonitor.test.ts' --exclude 'tests/core/prMergePlan.test.ts'
- Checkpoint verification result: PASS — exit 0; Test Files 233 passed (233); Tests 4601 passed (4636)
- Checkpoint verification revision: 84081298686311832c7e7ac3b7da08eb542b40b0

The two excluded files, `tests/core/prFixMonitor.test.ts` and
`tests/core/prMergePlan.test.ts`, both drive a PowerShell script, and fail on
`spawn pwsh ENOENT` wherever `pwsh` is absent whatever the tree holds. The
command carries the exclusion so that the result above is the same on a host
that has it and one that does not. Both files run in continuous integration.
Thirty-five further cases in the projects above declare themselves inactive and
did not run.

### TDD-0008

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: integration
- Reset by: `CR-20260912-0003` (option 1; TC-0002-0008 re-derived to the narrowed direction rule).
- Test file: `packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts`
- Selector: `SKILL.md の UI-bearing completion が brand SSOT を要求している`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/discussionSkillTemplateIntegration.test.ts --testNamePattern='SKILL.md の UI-bearing completion が brand SSOT を要求している' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (1 passed). The case now reads the UI-bearing completion conditions and asserts the explorations stay unranked, no design system is finalized, and the brand direction is the user's; the shipped matrix and skill already say so, because the change request's product edit landed with its approval.
- GREEN result: exit 0; 1 passed | 18 skipped (19)
- Changed files: `packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts`

### TDD-0009

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: integration
- Reset by: `CR-20260912-0003` (option 1; TC-0002-0009 re-derived: a pack marking one screen exploration final is refused).
- Test file: `packages/qfai/tests/e2e/discussionHardeningE2E.test.ts`
- Selector: `SKILL.md が UI-bearing artifact family (DESIGN.md + sidecars) を説明している`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/discussionHardeningE2E.test.ts --testNamePattern='SKILL.md が UI-bearing artifact family' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (1 passed). The case now asserts that the UI-bearing conditions block completion until the explorations are carried unranked, and that the skill forbids a single visual winner.
- GREEN result: exit 0; 1 passed | 1 skipped (2)
- Changed files: `packages/qfai/tests/e2e/discussionHardeningE2E.test.ts`

### TDD-0016

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: E2E
- Reset by: `CR-20260912-0003` (US-0002-0005 re-derived). The spec's plan names no spec-0018 journey for this story.
- Test file: `packages/qfai/tests/e2e/spec0002PlannerFirstE2E.test.ts`
- Selector: `US-0002-0005: the installed discussion skill carries explorations unranked and records the user's brand direction`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0002PlannerFirstE2E.test.ts --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (1 passed). The journey runs `qfai init` into a temp root and reads the installed discussion skill and completion matrix.
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/tests/e2e/spec0002PlannerFirstE2E.test.ts`

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0002.md`.
Totals: ✅ 23 / ⚠️ 19 / ❌ 41, with n/a 37, across 120 scored cells —
108 matrix depth cells (12 rows × 9 columns) and 12 business rule cells
(4 rows × 3 columns). `Status` is a row verdict, not a mark, and is outside
every total. The 16 row verdicts read ✅ 0 / ⚠️ 10 / ❌ 6.

## Work Orders Summary

| Step | Role (sub-agent)    | Agent instance        | Task title                                                                          | Input (refs)                                                    | Output (refs)                              | Status (PASS/REVISE/PENDING) |
| ---- | ------------------- | --------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------ | ---------------------------- |
| 1    | test-design-analyst | test-design-analyst   | Score the twelve obligations and write the matrix (first run)                       | 02_User-stories.md, 06_Test-Cases.md, 04_Business-Rules.md      | .qfai/evidence/coverage-depth-spec-0002.md | PASS                         |
| 2    | test-design-analyst | test-design-analyst#2 | Regenerate the matrix after CR-20260912-0003 (run started 2026-09-25T19:23:36.331Z) | CR-20260912-0003 action 9; 01-07 of spec-0002; tdd/test-list.md | .qfai/evidence/coverage-depth-spec-0002.md | PASS                         |
| 3    | -                   | -                     | grilling(-@2026-09-25T19:23:36.331Z/none): none                                     | -                                                               | -                                          | PASS                         |

## Cross-spec obligations

The scoped gate exits 1 on nine `QFAI-TEST-003` findings, one row each. The
three files sit outside the `tests/<layer>/spec-NNNN/**` layout, so each owner
is read from the `QFAI:SPEC-NNNN` annotation the file carries, as for a
`QFAI-TEST-001` stub.

| Finding       | Contract ID | Test file                                                                     | Owning spec | Why not this stage's work                                                                      | Closed by                                            |
| ------------- | ----------- | ----------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| QFAI-TEST-003 | -           | packages/qfai/tests/e2e/spec0004SaasPackageAndPackLocationE2E.test.ts:41      | spec-0004   | A `describe.skip` in spec-0004's acceptance test; this stage may not edit another spec's test. | spec-0004's next `/qfai-atdd` run, or `/qfai-verify` |
| QFAI-TEST-003 | -           | packages/qfai/tests/e2e/spec0004SaasPackageAndPackLocationE2E.test.ts:67      | spec-0004   | A `describe.skip` in spec-0004's acceptance test; this stage may not edit another spec's test. | spec-0004's next `/qfai-atdd` run, or `/qfai-verify` |
| QFAI-TEST-003 | -           | packages/qfai/tests/e2e/spec0004SaasPackageAndPackLocationE2E.test.ts:88      | spec-0004   | A `describe.skip` in spec-0004's acceptance test; this stage may not edit another spec's test. | spec-0004's next `/qfai-atdd` run, or `/qfai-verify` |
| QFAI-TEST-003 | -           | packages/qfai/tests/integration/spec0004SaasPackageAndPackLocation.test.ts:45 | spec-0004   | A `describe.skip` in spec-0004's acceptance test; this stage may not edit another spec's test. | spec-0004's next `/qfai-atdd` run, or `/qfai-verify` |
| QFAI-TEST-003 | -           | packages/qfai/tests/integration/spec0004SaasPackageAndPackLocation.test.ts:62 | spec-0004   | A `describe.skip` in spec-0004's acceptance test; this stage may not edit another spec's test. | spec-0004's next `/qfai-atdd` run, or `/qfai-verify` |
| QFAI-TEST-003 | -           | packages/qfai/tests/integration/spec0004SaasPackageAndPackLocation.test.ts:77 | spec-0004   | A `describe.skip` in spec-0004's acceptance test; this stage may not edit another spec's test. | spec-0004's next `/qfai-atdd` run, or `/qfai-verify` |
| QFAI-TEST-003 | -           | packages/qfai/tests/e2e/spec0006DoctorRemediationE2E.test.ts:41               | spec-0006   | A `describe.skip` in spec-0006's acceptance test; this stage may not edit another spec's test. | spec-0006's next `/qfai-atdd` run, or `/qfai-verify` |
| QFAI-TEST-003 | -           | packages/qfai/tests/e2e/spec0006DoctorRemediationE2E.test.ts:60               | spec-0006   | A `describe.skip` in spec-0006's acceptance test; this stage may not edit another spec's test. | spec-0006's next `/qfai-atdd` run, or `/qfai-verify` |
| QFAI-TEST-003 | -           | packages/qfai/tests/e2e/spec0006DoctorRemediationE2E.test.ts:78               | spec-0006   | A `describe.skip` in spec-0006's acceptance test; this stage may not edit another spec's test. | spec-0006's next `/qfai-atdd` run, or `/qfai-verify` |

## Execution logs

Recorded per row above, and summarized in the table under
"Commands executed + key outputs".

## Gaps / Open risks

What stays open after this run, with its owner. The matrix names every open
cell under `## Every ❌ cell, named` and every finding under `## Findings`.

| Gap                                                                                                                                                                                           | Owner                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Six E2E rows at `todo` with no test: `TDD-0013`, `-0014`, `-0015`, `-0017`, `-0018`, `-0019` (matrix finding 1)                                                                               | The rest of `CR-20260912-0003` action 9: a later `/qfai-atdd spec-0002` run                  |
| Four ❌ depth cells on rows that are closed: `TC-0002-0001` Special values (`TDD-0001`), `TC-0002-0009` Combinatorial (`TDD-0009`), `TC-0002-0010` Edge cases and Special values (`TDD-0011`) | The row that owes each; a later `/qfai-atdd spec-0002` run                                   |
| `TC-0002-0001`, `-0009`, `-0011` are carrier-only (matrix finding 2)                                                                                                                          | A later `/qfai-atdd spec-0002` run, or a Change Request where a `Level` or `Layer` must move |
| The `TC-0002-0010` annotation sits on a case that cannot fail on the non-UI guard (matrix finding 3)                                                                                          | A later `/qfai-atdd spec-0002` run                                                           |
| A test title claims a comparison it does not make, and one annotated case accepts the replaced wording (matrix findings 4, 5)                                                                 | `/qfai-implement spec-0002`, which owns `TDD-0012`                                           |
| The `TDD-0010` reservation names a retained test case no file contains (matrix finding 6)                                                                                                     | `/qfai-implement spec-0002`, which owns the ledger                                           |
| `QFAI-DPACK-002` is asserted by no test (matrix finding 7)                                                                                                                                    | `/qfai-implement spec-0002`                                                                  |
| The shipped completion matrix's `## CLI Packs` section cites a condition 7 that does not exist (matrix finding 8)                                                                             | A product fix to `discussion-completion-matrix.md`, outside this stage                       |
| `TDD-0008`, `-0009`, `-0012`, `-0016` record no failing run before their pass (matrix finding 9)                                                                                              | A review pass that reopens them, as `DR-0298` provides                                       |
| `TDD-0001`: `QFAI-TDDLIST-008` (the recorded RED test hash no longer matches its manifest) and `QFAI-TDDLIST-023` (`done` on a carrier-only case)                                             | `/qfai-implement spec-0002`                                                                  |
| `CR-20260912-0003` action 7 re-verifies `TDD-0011` in place                                                                                                                                   | `/qfai-implement spec-0002`                                                                  |
| The scoped gate exits 1 on the nine findings under Cross-spec obligations                                                                                                                     | spec-0004 and spec-0006                                                                      |

## Final status

PASS for the row recorded here. The pack is not clean; the rows above are
listed rather than claimed.
