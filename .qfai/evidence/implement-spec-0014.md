# Implementation Evidence: spec-0014

## Objective

Carry the proof for one of the two `unit` rows of this spec's ledger. The stage
split puts an `E2E` / `API` / `Integration` row's proof in
`.qfai/evidence/atdd-spec-0014.md`; every other layer anchors here.

## Decisions made (with rationale)

Both rows carried a `Selector` written as a summary of the obligation rather
than a test's title. `TDD-0034` was corrected to
`re-seeds acceptedIterationIndex / stopReason and deletes reviewerGate /
fullHarness / executionPlan on cycle 0`, the title of the case that carries its
obligation. `TDD-0033` keeps its original `Selector` and its original `Evidence`
cell; the reason is under Gaps.

The row declares `Run output retained: no`. The cells held a verdict with no
command and no output, so the reviewer verdicts and pack seals a completed entry
normally carries cannot be recorded and are not invented.

No observed RED is possible — the implementation shipped long before this
record — so the row takes the falsifiability path.

## Commands executed + key outputs

Every command ran from `packages/qfai`. The clean-tree runs were taken at
revision `649d8111147436408c90cbbe1b9f9b07e34da8cb`. Each mutation was reverted
from a copy of the pre-mutation bytes, and the tree re-addressed afterwards to
confirm it had returned to the clean value.

Both runs select the row's `Selector` and nothing else, so the counts are over
the selected case, not over the file. A whole-file run can stay red through a
case belonging to another row, and then it says nothing about whether this row's
test discriminates.

| Run                       | Selected | Result   |
| ------------------------- | -------- | -------- |
| `TDD-0034` GREEN          | 1 of 103 | 1 passed |
| `TDD-0034` falsifiability | 1 of 103 | 1 failed |

## Items processed

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

- Round 1: Revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Round 1: Satisfied-by: packages/qfai/src/cli/commands/prototypingIterate.ts — the cycle-0 hard reset's deletion of the legacy `fullHarness` block.
- Round 1: Falsifiability command: npx vitest run tests/cli/commands/prototypingIterate.test.ts -t 're-seeds acceptedIterationIndex / stopReason and deletes reviewerGate / fullHarness / executionPlan on cycle 0'
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed (1 of the file's 103 selected), on `expected true to be false`. The selector holds one case and it dies.
- Round 1: Falsifiability revision: working-tree+6ff18197d3f57229580697a36ad6136e482aae2782abbec14ff7ddb20ce8831f
- Round 1: GREEN command: npx vitest run tests/cli/commands/prototypingIterate.test.ts -t 're-seeds acceptedIterationIndex / stopReason and deletes reviewerGate / fullHarness / executionPlan on cycle 0'
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed (1 of the file's 103 selected)

The mutation, in `packages/qfai/src/cli/commands/prototypingIterate.ts` line
2260, deletes the line:

```diff
-  delete body.fullHarness;
```

The selector holds one case and it dies: the block is per-loop state nothing
else in the file asserts on.

- Refactor verify command: npx vitest run tests/integration/verifySemanticsSpec0014.test.ts tests/cli/commands/prototypingIterate.test.ts tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts tests/integration/cli/commands/prototypingCertify.upgradeScope.test.ts
- Refactor verify result: Test Files 4 passed (4); Tests 126 passed (126)
- Refactor verify revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Checkpoint verification command: npx vitest run --project integration --project cli
- Checkpoint verification result: PASS — exit 0; Test Files 187 passed (191); Tests 2258 passed (2277)
- Checkpoint verification revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb

## Test results summary

The recorded row is green at the recorded revision and falsified by a mutation
of the code it depends on.

## Gaps / Open risks

`TDD-0033` is not backfilled. Its obligation, `TC-0014-0033`, reads "active
layout uses `.qfai/evidence/prototyping/iter-NN/` only", and its parent
`AC-0014-0005` adds that the legacy `screenshots/` / `html/` directory layout is
"no longer accepted as the active SSOT".

The product still requires that layout. `uiEvidenceArtifacts.ts` builds
`screenshotRoot` as `<prototyping root>/screenshots` and looks there first,
falling back to `iter-NN`; `validate.ts` documents that path as the required
one; and `prototypingIterate.ts` mirrors each accepted iteration's files into
`screenshots/` and `html/` so the lookup finds something. Two cases in
`uiEvidenceArtifacts.test.ts` require a legacy-only project to report no issue.

The half of the obligation that makes the criterion true is therefore
contradicted by the code, and no test discriminates it. A mutation against the
narrower assertion would fix that disagreement into the record.

`TDD-0028` and `TDD-0029` share this pack and sit at `exception`, so they carry
no completed-evidence obligation and are not recorded here.

## Final status

PASS for the one row recorded here. This is a per-row verdict, not a stage
verdict.
