# Implementation Evidence: spec-0002

## Objective

Carry the proof for `TDD-0011`, the one `validators` row of this spec's ledger
whose test could be identified. The stage split puts an `E2E` / `API` /
`Integration` row's proof in `.qfai/evidence/atdd-spec-0002.md`; every other
layer anchors here.

## Decisions made (with rationale)

`TDD-0011` names `TC-0002-0010`: a non-UI pack without sidecars raises no
UI-only blocking issue. Its `Selector` named `new format pass`, which asserts
that a well-formed three-layer contract yields no issue — a different claim.

The replacement was chosen by mutation rather than by name. `non-UI skip` reads
like the discharging case and is not: it calls `validateThreeLayerModel`, which
reads each canonical sidecar and skips an absent one, so removing that
function's non-UI guard leaves all ten cases in the file green. The zero-issue
result comes from the sidecars being absent, not from the guard.

`skips non-UI packs` calls `validateThreeLayerFamilyCompleteness`, which reports
an issue per absent sidecar. Removing that function's guard fails it. That is
the case the obligation owns, and the row now names it.

The row declares `Run output retained: no`. Its cell said "current three-layer
validator pass", which is a verdict and not a record. The RED cannot be
observed — the implementation shipped long before this record — so the row takes
the falsifiability path.

## Commands executed + key outputs

Every command ran from `packages/qfai`. The clean-tree runs were taken at
revision `955d78ccf4323d25c9eba36c1586da746c48203a`. Each mutation was reverted
from a copy of the pre-mutation bytes, and the tree re-addressed afterwards to
confirm it had returned to the clean value.

| Run                       | Command                                                | Result             |
| ------------------------- | ------------------------------------------------------ | ------------------ |
| `TDD-0011` GREEN          | `npx vitest run tests/validators/uix/threeLayer.test.ts` | 10 passed        |
| `TDD-0011` falsifiability | `npx vitest run tests/validators/uix/threeLayer.test.ts` | 1 failed, 9 passed |

## Items processed

### TDD-0011

- TDD-ID: TDD-0011
- Layer: validators
- Test file: packages/qfai/tests/validators/uix/threeLayer.test.ts
- Selector: skips non-UI packs
- TC-ref: TC-0002-0010
- Run output retained: no
- Backfill note: the row's cell recorded a verdict with no command and no output, so nothing of the original run survives. The test was re-run for the GREEN below, and the mutation below was applied and reverted to establish that the test discriminates. No reviewer verdict is recorded because none can be reconstructed.
- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: 955d78ccf4323d25c9eba36c1586da746c48203a
- Round 1: Satisfied-by: packages/qfai/src/core/validators/uix/threeLayer.ts, validateThreeLayerFamilyCompleteness — the guard that returns early for a pack whose surface is not UI-bearing.
- Round 1: Falsifiability command: npx vitest run tests/validators/uix/threeLayer.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed, 9 passed (10). The row's own case fails with `expected [ 3 issues ] to have a length of +0` — one per canonical sidecar the non-UI pack does not have.
- Round 1: Falsifiability revision: working-tree+e025dced9b3e47ccdc6c0eec724792699dddfa919cfe4d2032195acb671e82d2
- Round 1: GREEN command: npx vitest run tests/validators/uix/threeLayer.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 10 passed (10)

The mutation removed the non-UI guard. Exactly one case dies, which is the
obligation's own: the other nine seed a UI-bearing pack, where the guard never
returned early.

- Refactor verify command: npx vitest run tests/core/sddPreflight.test.ts tests/validators/uix/threeLayer.test.ts
- Refactor verify result: Test Files 2 passed (2); Tests 36 passed (36)
- Refactor verify revision: 955d78ccf4323d25c9eba36c1586da746c48203a
- Checkpoint verification command: npx vitest run --project core --project validators
- Checkpoint verification result: PASS — exit 0; Test Files 222 passed (222); Tests 4121 passed (4126)
- Checkpoint verification revision: 955d78ccf4323d25c9eba36c1586da746c48203a

Two files of the `core` project were held out of the checkpoint:
`tests/core/prFixMonitor.test.ts` and `tests/core/prMergePlan.test.ts`. Both
drive a PowerShell script, and this container has no `pwsh`, so all eighteen of
their cases fail on `spawn pwsh ENOENT` whatever the tree holds. They run in
continuous integration, which does have it. Five further cases in the projects
above declare themselves inactive and did not run.

## Test results summary

`TDD-0011` green at the recorded revision, and falsified by a mutation of the
code it depends on.

## Gaps / Open risks

`TDD-0012` shares this row's test file and is not backfilled. Its obligation,
`TC-0002-0011`, is about README and skill wording; the file reads neither, so
no case in it can discharge the row.

`non-UI skip` remains in the file. It passes under a mutation of the behaviour
its name describes, so it is not proof of anything, and a reader scanning test
titles would take it for the safe-skip case.

## Final status

PASS for the row recorded here.
