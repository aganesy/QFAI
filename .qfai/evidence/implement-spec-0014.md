# Implementation Evidence: spec-0014

## Objective

Carry the proof for the two `unit` rows of this spec's ledger. The stage split
puts an `E2E` / `API` / `Integration` row's proof in
`.qfai/evidence/atdd-spec-0014.md`; every other layer anchors here.

## Decisions made (with rationale)

Both rows carried a `Selector` written as a summary of the obligation rather
than a test's title, and both were corrected to the title of the case that
carries the obligation:

| Row        | Was                           | Now                                                                                                             |
| ---------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `TDD-0033` | `iter-NN path layout`         | `returns 0 and creates iter-00/ with iterate-plan.json (target-url provided)`                                     |
| `TDD-0034` | `cycle 0 deletes fullHarness` | `re-seeds acceptedIterationIndex / stopReason and deletes reviewerGate / fullHarness / executionPlan on cycle 0`  |

Each row declares `Run output retained: no`. The cells held a verdict with no
command and no output, so the reviewer verdicts and pack seals a completed entry
normally carries cannot be recorded and are not invented.

Neither row can produce an observed RED — both implementations shipped long
before this record — so both take the falsifiability path.

## Commands executed + key outputs

Every command ran from `packages/qfai`. The clean-tree runs were taken at
revision `be74e075f00e815c888e3808e75bfde5e3cb952f`. Each mutation was reverted
from a copy of the pre-mutation bytes, and the tree re-addressed afterwards to
confirm it had returned to the clean value.

| Run                       | Result               |
| ------------------------- | -------------------- |
| `TDD-0033` GREEN          | 103 passed           |
| `TDD-0033` falsifiability | 7 failed, 96 passed  |
| `TDD-0034` GREEN          | 103 passed           |
| `TDD-0034` falsifiability | 1 failed, 102 passed |

## Items processed

### TDD-0033

- TDD-ID: TDD-0033
- Layer: unit
- Test file: packages/qfai/tests/cli/commands/prototypingIterate.test.ts
- Selector: returns 0 and creates iter-00/ with iterate-plan.json (target-url provided)
- TC-ref: TC-0014-0033
- Run output retained: no
- Backfill note: the row's cell recorded a verdict with no command and no output, so nothing of the original run survives. The test was re-run for the GREEN below, and the mutation below was applied and reverted to establish that the test discriminates. No reviewer verdict is recorded because none can be reconstructed.
- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: be74e075f00e815c888e3808e75bfde5e3cb952f
- Round 1: Satisfied-by: packages/qfai/src/core/prototyping/iteration.ts, iterationDir — the constant that builds `.qfai/evidence/prototyping/iter-NN`.
- Round 1: Falsifiability command: npx vitest run tests/cli/commands/prototypingIterate.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 7 failed, 96 passed (103). This row's own case fails on the plan's `iterationDir`.
- Round 1: Falsifiability revision: working-tree+288326c7a91387d0a9fba93632e443e43ff5fc1e30d6d29e756fb166ce4b3c3c
- Round 1: GREEN command: npx vitest run tests/cli/commands/prototypingIterate.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 103 passed (103)

The mutation renamed the per-cycle directory from `iter-NN` to `cycle-NN`.
Seven cases die, which is what the obligation's shape predicts: the layout
constant is what every path assertion in the file reads.

- Refactor verify command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts tests/cli/commands/prototypingIterate.test.ts tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts tests/integration/cli/commands/prototypingCertify.upgradeScope.test.ts
- Refactor verify result: Test Files 4 passed (4); Tests 126 passed (126)
- Refactor verify revision: be74e075f00e815c888e3808e75bfde5e3cb952f
- Checkpoint verification command: npx vitest run --project integration --project cli
- Checkpoint verification result: PASS — exit 0; Test Files 188 passed (192); Tests 2263 passed (2282)
- Checkpoint verification revision: be74e075f00e815c888e3808e75bfde5e3cb952f

Four files and nineteen cases in those projects declare themselves inactive and
did not run.

### TDD-0034

- TDD-ID: TDD-0034
- Layer: unit
- Test file: packages/qfai/tests/cli/commands/prototypingIterate.test.ts
- Selector: re-seeds acceptedIterationIndex / stopReason and deletes reviewerGate / fullHarness / executionPlan on cycle 0
- TC-ref: TC-0014-0034
- Run output retained: no
- Backfill note: the row's cell recorded a verdict with no command and no output, so nothing of the original run survives. The test was re-run for the GREEN below, and the mutation below was applied and reverted to establish that the test discriminates. No reviewer verdict is recorded because none can be reconstructed.
- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: be74e075f00e815c888e3808e75bfde5e3cb952f
- Round 1: Satisfied-by: packages/qfai/src/cli/commands/prototypingIterate.ts — the cycle-0 hard reset's deletion of the legacy `fullHarness` block.
- Round 1: Falsifiability command: npx vitest run tests/cli/commands/prototypingIterate.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed, 102 passed (103). Only this row's own case fails.
- Round 1: Falsifiability revision: working-tree+157293a189d198742f0582f273e8b6beef00f2796dfdc23f61cc157142f1c6a6
- Round 1: GREEN command: npx vitest run tests/cli/commands/prototypingIterate.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 103 passed (103)

The mutation removed the deletion. One case dies, and it is this row's: the
block is per-loop state nothing else in the file asserts on.

- Refactor verify command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts tests/cli/commands/prototypingIterate.test.ts tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts tests/integration/cli/commands/prototypingCertify.upgradeScope.test.ts
- Refactor verify result: Test Files 4 passed (4); Tests 126 passed (126)
- Refactor verify revision: be74e075f00e815c888e3808e75bfde5e3cb952f
- Checkpoint verification command: npx vitest run --project integration --project cli
- Checkpoint verification result: PASS — exit 0; Test Files 188 passed (192); Tests 2263 passed (2282)
- Checkpoint verification revision: be74e075f00e815c888e3808e75bfde5e3cb952f

## Test results summary

Both rows green at the recorded revision, and each falsified by a mutation of
the code it depends on.

## Gaps / Open risks

`TDD-0028` and `TDD-0029` share this pack and sit at `exception`, so they carry
no completed-evidence obligation and are not recorded here.

## Final status

PASS for the two rows recorded here.
