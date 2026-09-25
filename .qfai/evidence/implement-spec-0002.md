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
revision `fa483eab391a3f731d93f61b28d35951c697496b`. Each mutation was reverted
from a copy of the pre-mutation bytes, and the tree re-addressed afterwards to
confirm it had returned to the clean value.

| Run                       | Command                                                  | Result             |
| ------------------------- | -------------------------------------------------------- | ------------------ |
| `TDD-0011` GREEN          | `npx vitest run tests/validators/uix/threeLayer.test.ts` | 10 passed          |
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

- Round 1: Revision: fa483eab391a3f731d93f61b28d35951c697496b
- Round 1: Satisfied-by: packages/qfai/src/core/validators/uix/threeLayer.ts, validateThreeLayerFamilyCompleteness — the guard that returns early for a pack whose surface is not UI-bearing.
- Round 1: Falsifiability command: npx vitest run tests/validators/uix/threeLayer.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed, 9 passed (10). The row's own case fails with `expected [ 3 issues ] to have a length of +0 but got 3` — one per canonical sidecar the non-UI pack does not have.
- Round 1: Falsifiability revision: working-tree+d4cd3c6fe9339d860562b77fa15f0195adff4b1e1095d11abf972708a0ba676e
- Round 1: GREEN command: npx vitest run tests/validators/uix/threeLayer.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 10 passed (10)
- Round 1: Re-taken. The round was first observed at
  `955d78ccf4323d25c9eba36c1586da746c48203a`, and the test file it names has
  changed twice since — once to make every row of this ledger name a test that
  exists, and once to leave only declared identities in test titles. A recorded
  observation over a file that has moved is evidence for a tree nobody has, so
  the GREEN, the mutation, the refactor verification and the checkpoint were
  each taken again on this revision rather than the revision being re-typed.
  The mutation still kills exactly one case, and it is still this row's. The
  checkpoint selected 4654 cases, of which 4619 ran and passed and 35 are
  declared skips in the suite; the field above states the pair the way this
  file's earlier entry does.

The mutation removed the non-UI guard. Exactly one case dies, which is the
obligation's own: the other nine seed a UI-bearing pack, where the guard never
returned early.

- Refactor verify command: npx vitest run tests/core/sddPreflight.test.ts tests/validators/uix/threeLayer.test.ts
- Refactor verify result: Test Files 2 passed (2); Tests 36 passed (36)
- Refactor verify revision: fa483eab391a3f731d93f61b28d35951c697496b
- Checkpoint verification command: npx vitest run --project core --project validators --exclude 'tests/core/prFixMonitor.test.ts' --exclude 'tests/core/prMergePlan.test.ts'
- Checkpoint verification result: PASS — exit 0; Test Files 235 passed (235); Tests 4619 passed (4654)
- Checkpoint verification revision: fa483eab391a3f731d93f61b28d35951c697496b

The two excluded files, `tests/core/prFixMonitor.test.ts` and
`tests/core/prMergePlan.test.ts`, both drive a PowerShell script. This container
has no `pwsh`, so eighteen of their nineteen cases fail on `spawn pwsh ENOENT`
whatever the tree holds, and the command carries the exclusion so that a reader
running it gets the result above rather than those eighteen failures. They run in
continuous integration, which does have `pwsh`. Five further cases in the
projects above declare themselves inactive and did not run.

### TDD-0012

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: validators
- Reset by: `CR-20260912-0003` (option 1; TC-0002-0011 re-derived to the visual-surface sentence, row re-pointed by the rerun).
- Test file: `packages/qfai/tests/assets/assets.test.ts`
- Selector: `ensures qfai-discussion skill and artifact rules use canonical pack wording`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/assets/assets.test.ts --testNamePattern='ensures qfai-discussion skill and artifact rules use canonical pack wording' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (1 passed). The case already required the narrowed sentence in the package README, the skill and the artifact rules.
- GREEN result: exit 0; 1 passed | 93 skipped (94)
- Changed files: `packages/qfai/tests/assets/assets.test.ts` (the TC annotation on the re-pointed case)

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

## /qfai-implement run started 2026-09-25T10:08:44.375Z

Rows `TDD-0008` and `TDD-0016`, reopened `exception` -> `todo` from the
accepted-risk record `DR-0298` so that each runs its cycle with the reviews that
record waived. Their row-level evidence is in
`.qfai/evidence/atdd-spec-0002.md#tdd-0008` and `#tdd-0016`.

`TDD-0009` and `TDD-0012` stay at `exception` under `DR-0298`. The plan phase
found that each answers an `L3` test case from outside `tests/integration/**`,
so neither can pass a review until its test moves. `TDD-0012` also needs its
`Layer` corrected.

### Plan phase

| Role                          | Instance                | Verdict | Summary                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------- | ----------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `delivery-planner` (blocking) | `delivery-planner#1`    | PASS    | No Change Request blocks a row. Each row has no `BR-Ref`, so each is its own review unit. Dispatch is serial: the rows' tests read the same shipped files, so one row's mutation is reverted and `git diff` is clean before the next starts. Only files under `packages/qfai/assets/init/**` are mutated                                                        |
| `test-design-analyst`         | `test-design-analyst#1` | REVISE  | Not blocking. `TDD-0008` and `TDD-0016` can discharge their obligations; `TDD-0016` does not assert the story's first clause. `TDD-0009`'s test is in `tests/e2e` with no annotation for its `L3` case, and `TDD-0012`'s is in `tests/assets` under a `validators` Layer cell. Both need a test move before review, so both are left at `exception` by this run |

### Work Orders Summary

| Step | Role (sub-agent)    | Agent instance        | Task title                                                                   | Input (refs)                                              | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ------------------- | --------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------- | ------------- | ---------------------------- |
| 1    | delivery-planner    | delivery-planner#1    | /qfai-implement plan: order and dispatch for the four rows the waiver parked | test-list.md, 06_Test-Cases.md, 02_User-stories.md, CR-\* | #plan-phase   | PASS                         |
| 2    | test-design-analyst | test-design-analyst#1 | /qfai-implement plan: coverage and layer check over the spec-0002 rows       | test-list.md, 06_Test-Cases.md, 02_User-stories.md        | #plan-phase   | REVISE                       |

## Record defects

Open entries from the reviews of the `/qfai-implement` run started
2026-09-25T10:08:44.375Z. Each is repaired before spec-0002 completion is
declared.

- `record:evidence-repeated-runs`, `TDD-0008`, Round 1: the re-take on the
  merged base overwrote the first run's falsifiability, GREEN and
  refactor-verify values instead of listing both runs. The handover's
  `Classification result` and `Other rows` still describe the pre-merge test
  file, and the mutation also fails the spec-0010 case at line 643 of the same
  file.
- `record:stage-evidence-currency`, `coverage-depth-spec-0002.md`: Finding 4
  and the closing section still describe `TDD-0008` at `todo` and a six-row
  ledger.
- `record:falsifiability-entry-complete-before-gate`, `TDD-0016`, Round 1: the
  RED test manifest was widened after `qa-gatekeeper#2` passed the RED. The
  build-phase gate recomputed it, and the rework round re-takes it.
