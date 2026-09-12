# ATDD Evidence: spec-0013

## Objective

Carry the proof for nine of this spec's twelve `done` ledger rows. The other
three are blocked and the reasons are under Gaps.

## Inputs reviewed (files/paths)

- `.qfai/specs/spec-0013/06_Test-Cases.md`
- `.qfai/specs/spec-0013/02_User-stories.md`
- `.qfai/specs/spec-0013/tdd/test-list.md`
- `packages/qfai/tests/integration/sddUiTemplate.test.ts`
- `packages/qfai/tests/integration/sddPrimaryTasksLane.test.ts`
- `packages/qfai/tests/integration/primaryTasksStructured.test.ts`
- `packages/qfai/tests/core/activeDiscussionPack.test.ts`
- `packages/qfai/tests/core/surfaceTypePopulate.test.ts`

## Decisions made (with rationale)

Every row declares `Run output retained: no`. The cells held a verdict with no
command and no output, so the reviewer verdicts and pack seals a completed entry
normally carries cannot be recorded and are not invented.

No row can produce an observed RED — every implementation shipped long before
this record — so all nine take the falsifiability path.

Seven rows carried a `Selector` written as a summary of the obligation rather
than a test's title. Each was corrected to the title of the case that carries
the obligation, after reading the `Verify` line of its test case against what
the test asserts. Two rows already named their titles verbatim.

## Work performed (what changed, where)

- `.qfai/specs/spec-0013/tdd/test-list.md` — seven `Selector` cells rewritten to
  the titles they name, and the `Evidence` cells of the nine rows below rewritten
  as pointers into this file. No `Status` moved.
- This file created.

## Commands executed + key outputs

Every command ran from `packages/qfai`. The clean-tree runs were taken at
revision `649d8111147436408c90cbbe1b9f9b07e34da8cb`. Each mutation was reverted
from a copy of the pre-mutation bytes, and the tree re-addressed afterwards to
confirm it had returned to the clean value.

| Row        | Mutation                                          | Killed              |
| ---------- | ------------------------------------------------- | ------------------- |
| `TDD-0019` | the template's `primary_tasks` key renamed        | 1 of 2              |
| `TDD-0020` | the empty-list test forced false                  | 3 of 4              |
| `TDD-0021` | the empty-list test forced true                   | 1 of 4              |
| `TDD-0023` | the resolved pack path altered                    | 1 of 4              |
| `TDD-0024` | the pointer-to-pack match made unconditional      | 1 of 4              |
| `TDD-0025` | the companion check forced to "absent"            | 2 of 6              |
| `TDD-0026` | the drift finding's rule code renamed             | 1 of 6              |
| `TDD-0029` | a fourth key added to the required set            | 4 of 6              |
| `TDD-0030` | the shape finding's rule code renamed             | 4 of 6              |

Refactor verify: 25 passed. Checkpoint: 8986 passed.

## Test volume estimate

Not applicable. This run authored no test; it records proof for rows whose tests
already exist.

## Coverage obligations checklist

Unchanged by this run. The spec's obligations and their coverage are scored in
the Coverage Depth Matrix below.

## Ledger rows advanced

No row changed status. Every row below was already `done`.

| TDD-ID     | Obligation      | Layer       | RED provenance | Status |
| ---------- | --------------- | ----------- | -------------- | ------ |
| `TDD-0019` | `TC-0013-0025`  | integration | falsifiability | done   |
| `TDD-0020` | `TC-0013-0026`  | integration | falsifiability | done   |
| `TDD-0021` | `TC-0013-0027`  | integration | falsifiability | done   |
| `TDD-0023` | `TC-0013-0028`  | integration | falsifiability | done   |
| `TDD-0024` | `TC-0013-0029`  | integration | falsifiability | done   |
| `TDD-0025` | `TC-0013-0030`  | integration | falsifiability | done   |
| `TDD-0026` | `TC-0013-0031`  | integration | falsifiability | done   |
| `TDD-0029` | `TC-0013-0034`  | integration | falsifiability | done   |
| `TDD-0030` | `TC-0013-0035`  | integration | falsifiability | done   |

The refactor-verify and checkpoint runs are shared by all nine rows, so each
entry records the same pair:

- Refactor verify command: npx vitest run tests/integration/sddUiTemplate.test.ts tests/integration/sddPrimaryTasksLane.test.ts tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts tests/core/activeDiscussionPack.test.ts tests/core/surfaceTypePopulate.test.ts tests/integration/primaryTasksStructured.test.ts
- Refactor verify result: Test Files 6 passed (6); Tests 25 passed (25)
- Checkpoint verification command: npx vitest run --project integration --project e2e --project cli --project core
- Checkpoint verification result: PASS — exit 0; Test Files 532 passed (540); Tests 8986 passed (9029)

Two files of the `core` project were held out of the checkpoint:
`tests/core/prFixMonitor.test.ts` and `tests/core/prMergePlan.test.ts`. Both
drive a PowerShell script, and this container has no `pwsh`, so all eighteen of
their cases fail on `spawn pwsh ENOENT` whatever the tree holds. They run in
continuous integration, which does have it. Eight further files and 43 cases in
those projects declare themselves inactive and did not run.

### TDD-0019

- TDD-ID: TDD-0019
- Layer: integration
- Test file: packages/qfai/tests/integration/sddUiTemplate.test.ts
- Selector: TC-0013-0025: shipped ui-contract.sample.yaml carries a primary_tasks list per screen
- TC-ref: TC-0013-0025
- Run output retained: no
- Backfill note: the row's cell recorded a verdict with no command and no output, so nothing of the original run survives. The test was re-run for the GREEN below, and the mutation below was applied and reverted to establish that the test discriminates. No reviewer verdict is recorded because none can be reconstructed.
- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Round 1: Satisfied-by: packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/contracts/ui-contract.sample.yaml — the per-screen `primary_tasks` key the shipped template carries.
- Round 1: Falsifiability command: npx vitest run tests/integration/sddUiTemplate.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed, 1 passed (2). This row's own case fails on the absent slot.
- Round 1: Falsifiability revision: working-tree+79766e61bb534ba0571ab93cad0b16e7001a2fa2c95e01128db5ad409d8bf435
- Round 1: GREEN command: npx vitest run tests/integration/sddUiTemplate.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 2 passed (2)
- Round 1: RED test hash: 7380b434efd79ab4b798fa3bc80b41bf076567b1e50df1b60c54b72bd801e55c
- Round 1: RED test manifest: packages/qfai/tests/integration/sddUiTemplate.test.ts
- Refactor verify command: npx vitest run tests/integration/sddUiTemplate.test.ts tests/integration/sddPrimaryTasksLane.test.ts tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts tests/core/activeDiscussionPack.test.ts tests/core/surfaceTypePopulate.test.ts tests/integration/primaryTasksStructured.test.ts
- Refactor verify result: Test Files 6 passed (6); Tests 25 passed (25)
- Refactor verify revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Checkpoint verification command: npx vitest run --project integration --project e2e --project cli --project core
- Checkpoint verification result: PASS — exit 0; Test Files 532 passed (540); Tests 8986 passed (9029)
- Checkpoint verification revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb

### TDD-0020

- TDD-ID: TDD-0020
- Layer: integration
- Test file: packages/qfai/tests/integration/sddPrimaryTasksLane.test.ts
- Selector: TC-0013-0026: QFAI-AUD-001 aligned lane fails when primary_tasks is empty
- TC-ref: TC-0013-0026
- Run output retained: no
- Backfill note: the row's cell recorded a verdict with no command and no output, so nothing of the original run survives. The test was re-run for the GREEN below, and the mutation below was applied and reverted to establish that the test discriminates. No reviewer verdict is recorded because none can be reconstructed.
- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Round 1: Satisfied-by: packages/qfai/src/core/validators/designAudit.ts, checkContractHierarchyFromScreens — the empty-list test that opens the `QFAI-AUD-001` branch.
- Round 1: Falsifiability command: npx vitest run tests/integration/sddPrimaryTasksLane.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 3 failed, 1 passed (4). This row's own case fails on the absent finding.
- Round 1: Falsifiability revision: working-tree+2931d34aa471bfb18f339e1a1d66f4bf091412090a43cf61665b2282ee4700fb
- Round 1: GREEN command: npx vitest run tests/integration/sddPrimaryTasksLane.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 4 passed (4)
- Round 1: RED test hash: dd54681a79a41a321eff0d7aecac91ad559688a61a4530155ddfad172b6428b7
- Round 1: RED test manifest: packages/qfai/tests/integration/sddPrimaryTasksLane.test.ts

Forcing the test false silences the finding for an empty list and for a legacy
contract alike, so three of the file's four cases die. The surviving case is the
one this row's sibling owns.

- Refactor verify command: npx vitest run tests/integration/sddUiTemplate.test.ts tests/integration/sddPrimaryTasksLane.test.ts tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts tests/core/activeDiscussionPack.test.ts tests/core/surfaceTypePopulate.test.ts tests/integration/primaryTasksStructured.test.ts
- Refactor verify result: Test Files 6 passed (6); Tests 25 passed (25)
- Refactor verify revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Checkpoint verification command: npx vitest run --project integration --project e2e --project cli --project core
- Checkpoint verification result: PASS — exit 0; Test Files 532 passed (540); Tests 8986 passed (9029)
- Checkpoint verification revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb

### TDD-0021

- TDD-ID: TDD-0021
- Layer: integration
- Test file: packages/qfai/tests/integration/sddPrimaryTasksLane.test.ts
- Selector: TC-0013-0027: QFAI-AUD-001 aligned lane passes when primary_tasks is non-empty
- TC-ref: TC-0013-0027
- Run output retained: no
- Backfill note: the row's cell recorded a verdict with no command and no output, so nothing of the original run survives. The test was re-run for the GREEN below, and the mutation below was applied and reverted to establish that the test discriminates. No reviewer verdict is recorded because none can be reconstructed.
- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Round 1: Satisfied-by: packages/qfai/src/core/validators/designAudit.ts, checkContractHierarchyFromScreens — the same empty-list test, read in the passing direction.
- Round 1: Falsifiability command: npx vitest run tests/integration/sddPrimaryTasksLane.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed, 3 passed (4). Only this row's own case fails.
- Round 1: Falsifiability revision: working-tree+6a357e439a51f76e496fb8268a6e6b43ebe4bce5ea597f2f89a4cbcb2af8b17c
- Round 1: GREEN command: npx vitest run tests/integration/sddPrimaryTasksLane.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 4 passed (4)
- Round 1: RED test hash: dd54681a79a41a321eff0d7aecac91ad559688a61a4530155ddfad172b6428b7
- Round 1: RED test manifest: packages/qfai/tests/integration/sddPrimaryTasksLane.test.ts

This row needs the opposite mutation from its sibling. Silencing the finding
leaves "passes when non-empty" true for the wrong reason, so the test that
discriminates is the one that fails when the finding fires on a populated list.

- Refactor verify command: npx vitest run tests/integration/sddUiTemplate.test.ts tests/integration/sddPrimaryTasksLane.test.ts tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts tests/core/activeDiscussionPack.test.ts tests/core/surfaceTypePopulate.test.ts tests/integration/primaryTasksStructured.test.ts
- Refactor verify result: Test Files 6 passed (6); Tests 25 passed (25)
- Refactor verify revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Checkpoint verification command: npx vitest run --project integration --project e2e --project cli --project core
- Checkpoint verification result: PASS — exit 0; Test Files 532 passed (540); Tests 8986 passed (9029)
- Checkpoint verification revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb

### TDD-0023

- TDD-ID: TDD-0023
- Layer: integration
- Test file: packages/qfai/tests/core/activeDiscussionPack.test.ts
- Selector: active pack resolved from state.json#discussion.currentId
- TC-ref: TC-0013-0028
- Run output retained: no
- Backfill note: the row's cell recorded a verdict with no command and no output, so nothing of the original run survives. The test was re-run for the GREEN below, and the mutation below was applied and reverted to establish that the test discriminates. No reviewer verdict is recorded because none can be reconstructed.
- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Round 1: Satisfied-by: packages/qfai/src/core/discussionPack.ts, resolveActiveDiscussionPack — the path it returns for the pack the pointer names.
- Round 1: Falsifiability command: npx vitest run tests/core/activeDiscussionPack.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed, 3 passed (4). Only this row's own case fails.
- Round 1: Falsifiability revision: working-tree+42e4c18da50aab10d10eec68a1777bcf971a1b2c3b586da67af18d726dd795e7
- Round 1: GREEN command: npx vitest run tests/core/activeDiscussionPack.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 4 passed (4)
- Round 1: RED test hash: f707c0a49fe7893d759c7aebc8859047777f9b9505d50f0e7d4f202f30f13d71
- Round 1: RED test manifest: packages/qfai/tests/core/activeDiscussionPack.test.ts
- Refactor verify command: npx vitest run tests/integration/sddUiTemplate.test.ts tests/integration/sddPrimaryTasksLane.test.ts tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts tests/core/activeDiscussionPack.test.ts tests/core/surfaceTypePopulate.test.ts tests/integration/primaryTasksStructured.test.ts
- Refactor verify result: Test Files 6 passed (6); Tests 25 passed (25)
- Refactor verify revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Checkpoint verification command: npx vitest run --project integration --project e2e --project cli --project core
- Checkpoint verification result: PASS — exit 0; Test Files 532 passed (540); Tests 8986 passed (9029)
- Checkpoint verification revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb

### TDD-0024

- TDD-ID: TDD-0024
- Layer: integration
- Test file: packages/qfai/tests/core/activeDiscussionPack.test.ts
- Selector: TC-0013-0029: ambiguous/absent active pointer raises a recovery error
- TC-ref: TC-0013-0029
- Run output retained: no
- Backfill note: the row's cell recorded a verdict with no command and no output, so nothing of the original run survives. The test was re-run for the GREEN below, and the mutation below was applied and reverted to establish that the test discriminates. No reviewer verdict is recorded because none can be reconstructed.
- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Round 1: Satisfied-by: packages/qfai/src/core/discussionPack.ts, resolveActiveDiscussionPack — the filter that matches the pointer against the packs on disk.
- Round 1: Falsifiability command: npx vitest run tests/core/activeDiscussionPack.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed, 3 passed (4). The dangling-pointer case fails; the error stops being raised.
- Round 1: Falsifiability revision: working-tree+01dcf4fa9d5f24f9cbd5321207d20ffb4fc433eb459fc66c27021b2f38734669
- Round 1: GREEN command: npx vitest run tests/core/activeDiscussionPack.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 4 passed (4)
- Round 1: RED test hash: f707c0a49fe7893d759c7aebc8859047777f9b9505d50f0e7d4f202f30f13d71
- Round 1: RED test manifest: packages/qfai/tests/core/activeDiscussionPack.test.ts
- Refactor verify command: npx vitest run tests/integration/sddUiTemplate.test.ts tests/integration/sddPrimaryTasksLane.test.ts tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts tests/core/activeDiscussionPack.test.ts tests/core/surfaceTypePopulate.test.ts tests/integration/primaryTasksStructured.test.ts
- Refactor verify result: Test Files 6 passed (6); Tests 25 passed (25)
- Refactor verify revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Checkpoint verification command: npx vitest run --project integration --project e2e --project cli --project core
- Checkpoint verification result: PASS — exit 0; Test Files 532 passed (540); Tests 8986 passed (9029)
- Checkpoint verification revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb

### TDD-0025

- TDD-ID: TDD-0025
- Layer: integration
- Test file: packages/qfai/tests/core/surfaceTypePopulate.test.ts
- Selector: TC-0013-0030: populateSurfaceTypeIfUiCompanion auto-populates frontmatter
- TC-ref: TC-0013-0030
- Run output retained: no
- Backfill note: the row's cell recorded a verdict with no command and no output, so nothing of the original run survives. The test was re-run for the GREEN below, and the mutation below was applied and reverted to establish that the test discriminates. No reviewer verdict is recorded because none can be reconstructed.
- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Round 1: Satisfied-by: packages/qfai/src/core/detection/surfaceType.ts, populateSurfaceTypeIfUiCompanion — the companion check that gates the write.
- Round 1: Falsifiability command: npx vitest run tests/core/surfaceTypePopulate.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 2 failed, 4 passed (6). Both cases under this row's obligation fail.
- Round 1: Falsifiability revision: working-tree+fb1a46558f3457c1660f805f2a7003333eecd0ec8b62dfdadae2819eb3b70d70
- Round 1: GREEN command: npx vitest run tests/core/surfaceTypePopulate.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 6 passed (6)
- Round 1: RED test hash: 89ef6d78d6a7d9db85d6123ae04ccf235c1843d0bea39a118c4b5d15ddb35fed
- Round 1: RED test manifest: packages/qfai/tests/core/surfaceTypePopulate.test.ts

The idempotence case dies with the write case, which is correct: a function that
never writes is trivially idempotent, and the case asserts the key is present
after two runs rather than that nothing happened.

- Refactor verify command: npx vitest run tests/integration/sddUiTemplate.test.ts tests/integration/sddPrimaryTasksLane.test.ts tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts tests/core/activeDiscussionPack.test.ts tests/core/surfaceTypePopulate.test.ts tests/integration/primaryTasksStructured.test.ts
- Refactor verify result: Test Files 6 passed (6); Tests 25 passed (25)
- Refactor verify revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Checkpoint verification command: npx vitest run --project integration --project e2e --project cli --project core
- Checkpoint verification result: PASS — exit 0; Test Files 532 passed (540); Tests 8986 passed (9029)
- Checkpoint verification revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb

### TDD-0026

- TDD-ID: TDD-0026
- Layer: integration
- Test file: packages/qfai/tests/core/surfaceTypePopulate.test.ts
- Selector: D-SURFACE-TYPE-MISSING warns on companion-without-frontmatter
- TC-ref: TC-0013-0031
- Run output retained: no
- Backfill note: the row's cell recorded a verdict with no command and no output, so nothing of the original run survives. The test was re-run for the GREEN below, and the mutation below was applied and reverted to establish that the test discriminates. No reviewer verdict is recorded because none can be reconstructed.
- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Round 1: Satisfied-by: packages/qfai/src/core/validators/surfaceTypeDrift.ts — the rule code the drift finding carries.
- Round 1: Falsifiability command: npx vitest run tests/core/surfaceTypePopulate.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed, 5 passed (6). Only this row's own case fails.
- Round 1: Falsifiability revision: working-tree+c2330cee63af18d074f9be51e5fe54685366f3d54b0dfcece06e0065356c388f
- Round 1: GREEN command: npx vitest run tests/core/surfaceTypePopulate.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 6 passed (6)
- Round 1: RED test hash: 89ef6d78d6a7d9db85d6123ae04ccf235c1843d0bea39a118c4b5d15ddb35fed
- Round 1: RED test manifest: packages/qfai/tests/core/surfaceTypePopulate.test.ts

The silence case holds under the mutation, which is the boundary worth naming:
it asserts no finding of this code appears, and a finding carrying a different
code satisfies it. The pair discriminates on the code only in the emitting
direction.

- Refactor verify command: npx vitest run tests/integration/sddUiTemplate.test.ts tests/integration/sddPrimaryTasksLane.test.ts tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts tests/core/activeDiscussionPack.test.ts tests/core/surfaceTypePopulate.test.ts tests/integration/primaryTasksStructured.test.ts
- Refactor verify result: Test Files 6 passed (6); Tests 25 passed (25)
- Refactor verify revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Checkpoint verification command: npx vitest run --project integration --project e2e --project cli --project core
- Checkpoint verification result: PASS — exit 0; Test Files 532 passed (540); Tests 8986 passed (9029)
- Checkpoint verification revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb

### TDD-0029

- TDD-ID: TDD-0029
- Layer: integration
- Test file: packages/qfai/tests/integration/primaryTasksStructured.test.ts
- Selector: TC-0013-0034: structured primary_tasks accepted
- TC-ref: TC-0013-0034
- Run output retained: no
- Backfill note: the row's cell recorded a verdict with no command and no output, so nothing of the original run survives. The test was re-run for the GREEN below, and the mutation below was applied and reverted to establish that the test discriminates. No reviewer verdict is recorded because none can be reconstructed.
- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Round 1: Satisfied-by: packages/qfai/src/core/contracts/screenContracts.ts, REQUIRED_PRIMARY_TASK_KEYS — the closed set a structured item is measured against.
- Round 1: Falsifiability command: npx vitest run tests/integration/primaryTasksStructured.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 4 failed, 2 passed (6). This row's acceptance case fails on the complete item it is meant to admit.
- Round 1: Falsifiability revision: working-tree+e9c87b9362c368ec472519a028f2a933c792d5228d3460dbcd53ccd142d86c82
- Round 1: GREEN command: npx vitest run tests/integration/primaryTasksStructured.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 6 passed (6)
- Round 1: RED test hash: d798fda11f10e7516c51e3b1aaee98a7c9ab6fd5c86b1e78303e2234803d2c6e
- Round 1: RED test manifest: packages/qfai/tests/integration/primaryTasksStructured.test.ts

Adding a fourth required key rejects every item, so the rejection cases fail too
— they name the key they expect to be reported missing, and the mutation adds a
second one to every finding.

- Refactor verify command: npx vitest run tests/integration/sddUiTemplate.test.ts tests/integration/sddPrimaryTasksLane.test.ts tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts tests/core/activeDiscussionPack.test.ts tests/core/surfaceTypePopulate.test.ts tests/integration/primaryTasksStructured.test.ts
- Refactor verify result: Test Files 6 passed (6); Tests 25 passed (25)
- Refactor verify revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Checkpoint verification command: npx vitest run --project integration --project e2e --project cli --project core
- Checkpoint verification result: PASS — exit 0; Test Files 532 passed (540); Tests 8986 passed (9029)
- Checkpoint verification revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb

### TDD-0030

- TDD-ID: TDD-0030
- Layer: integration
- Test file: packages/qfai/tests/integration/primaryTasksStructured.test.ts
- Selector: TC-0013-0035: incomplete / open structured primary_tasks rejected
- TC-ref: TC-0013-0035
- Run output retained: no
- Backfill note: the row's cell recorded a verdict with no command and no output, so nothing of the original run survives. The test was re-run for the GREEN below, and the mutation below was applied and reverted to establish that the test discriminates. No reviewer verdict is recorded because none can be reconstructed.
- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Round 1: Satisfied-by: packages/qfai/src/core/validators/designAudit.ts, shapeFindingFor — the rule code a shape violation is reported under.
- Round 1: Falsifiability command: npx vitest run tests/integration/primaryTasksStructured.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 4 failed, 2 passed (6). Every rejection case fails; the finding is no longer reported under the code they read.
- Round 1: Falsifiability revision: working-tree+31eb23a6df91e77744655424faf54d2f2bcd603df00be8a19eee4a04997d638b
- Round 1: GREEN command: npx vitest run tests/integration/primaryTasksStructured.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 6 passed (6)
- Round 1: RED test hash: d798fda11f10e7516c51e3b1aaee98a7c9ab6fd5c86b1e78303e2234803d2c6e
- Round 1: RED test manifest: packages/qfai/tests/integration/primaryTasksStructured.test.ts
- Refactor verify command: npx vitest run tests/integration/sddUiTemplate.test.ts tests/integration/sddPrimaryTasksLane.test.ts tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts tests/core/activeDiscussionPack.test.ts tests/core/surfaceTypePopulate.test.ts tests/integration/primaryTasksStructured.test.ts
- Refactor verify result: Test Files 6 passed (6); Tests 25 passed (25)
- Refactor verify revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb
- Checkpoint verification command: npx vitest run --project integration --project e2e --project cli --project core
- Checkpoint verification result: PASS — exit 0; Test Files 532 passed (540); Tests 8986 passed (9029)
- Checkpoint verification revision: 649d8111147436408c90cbbe1b9f9b07e34da8cb

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0013.md`.

## Work Orders Summary

| Role                | Task                                                    | Status (PASS/REVISE/PENDING) |
| ------------------- | ------------------------------------------------------- | ---------------------------- |
| test-design-analyst | Score the thirty-five obligations and write the matrix  | PASS                         |

## Cross-spec obligations

None.

## Execution logs

Recorded per row above, and summarized in the table under
"Commands executed + key outputs".

## Gaps / Open risks

**One row cannot carry a pointer at all.** `TDD-0022` declares `Layer: e2e`, and
an `e2e` row's obligation is read from a `US-Refs` column. This ledger has only a
`TC-Refs` column, so the row's obligation reads as empty and no evidence entry
can match it. The row does name a real user story, `US-0013-0011`, in the column
it has. Adding the column is a change to the table every row shares, not to this
row, and it belongs with the `Boundary` column the same ledger owes.

**Two rows contradict their tests.** `TDD-0027` and `TDD-0028` name
`TC-0013-0032` and `TC-0013-0033`, which specify a `primary_tasks` count band of
3..7. The validator's lower bound was removed; the tests now assert that one
through seven emit nothing. The specification and the code state opposite
things, and writing evidence would fix that contradiction into the record. The
`Selector` of both rows is reported unresolved, which is the one signal this
drift does raise.

**One rule is emitted from two places.** `QFAI-AUD-001` is built independently
in `checkContractsHierarchy` and in `checkContractHierarchyFromScreens`, both
called from `validateDesignAudit` — the first over a discussion-pack sidecar,
the second over the UI contracts. The two message texts and severities are
maintained separately. Nothing here depends on that, and no test covers the
pair, so a change to one can silently diverge from the other.

## Final status

PASS for the nine rows recorded here. The pack is not clean; the rows above
are listed rather than claimed.
