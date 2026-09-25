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

## Shared-artifact re-verify

`CR-20260912-0003` approved action 7 re-verifies `TDD-0011` in place, with
`Status` left at `done`. Its obligation, `TC-0002-0010`, and its case,
`skips non-UI packs`, did not change. The row's `### TDD-0011` entry above is
not rewritten; this block carries the fresh observation.

The test file has not changed since the entry's revision
`fa483eab391a3f731d93f61b28d35951c697496b`. The annotation edits the Change
Request names are in `d2d1a33be` and `c09247729`, both ancestors of that
revision. The `non-UI skip` fixture has not been edited. So no assertion
moved, and no falsifiability evidence is owed beyond the re-taken proof below.

### spec-0002/TDD-0011

- Evidence file: .qfai/evidence/implement-spec-0002.md
- Revision: b5d357c14ae396a0d436491692af17be018b278c
- Selector: skips non-UI packs
- TC-ref: TC-0002-0010
- Re-verify command: cd packages/qfai && npx vitest run tests/validators/uix/threeLayer.test.ts -t "skips non-UI packs"
- Re-verify result: PASS — exit 0; Test Files 1 passed (1); Tests 1 passed | 9 skipped (10)
- Proof command: cd packages/qfai && npx vitest run tests/validators/uix/threeLayer.test.ts, with the line `if (!(await isUiBearingSpec(root))) return [];` removed from `validateThreeLayerFamilyCompleteness` in `packages/qfai/src/core/validators/uix/threeLayer.ts`. This is the mutation the entry's `Round 1: Satisfied-by` names. The file's SHA-256 is `81a5e79a4a9534a1486ce9d33aa474f2c3d109761a9491f615bc315313481b03` at the revision above and `f994e6acfc4becd749a678f9aa8c3f21ce4320319b1ae49b3e39569fb0e7d349` with that one line and its newline deleted; nothing else in the tree differed.
- Proof result: FAIL — exit 1; Test Files 1 failed (1); Tests 1 failed | 9 passed (10). Only the row's own case fails, at `tests/validators/uix/threeLayer.test.ts:218:20`, with `AssertionError: expected [ { …(6) }, { …(6) }, { …(6) } ] to have a length of +0 but got 3` — one issue per canonical sidecar the non-UI pack does not have.
- Restored GREEN command: cd packages/qfai && npx vitest run tests/validators/uix/threeLayer.test.ts, after the file was restored from a copy of its pre-mutation bytes and its SHA-256 read back as `81a5e79a…1b03`.
- Restored GREEN result: PASS — exit 0; Test Files 1 passed (1); Tests 10 passed (10)
- Refactor verify command: cd packages/qfai && npx vitest run tests/core/sddPreflight.test.ts tests/validators/uix/threeLayer.test.ts
- Refactor verify result: PASS — exit 0; Test Files 2 passed (2); Tests 33 passed (33). Round 1 counted 36 because `sddPreflight.test.ts` had three more cases before `2da2aed1c`; `threeLayer.test.ts` still runs all 10.
- RED test manifest:

```text
packages/qfai/tests/validators/uix/threeLayer.test.ts
```

- RED test hash: 6e3670043157d44f32dd3a256599773b496ff5399b0182c7abf08ce7e2922ca6
- Status: `done`, unchanged.
- product-surface-reviewer: not required. The row is a `validators` row with no display logic.
- implementation-reviewer: PASS on 2026-09-26, over this block at `b5d357c14ae396a0d436491692af17be018b278c`. It re-ran the selector and the refactor verify, recomputed the mutated-file hash and the RED test hash, and checked every field the validator reads.
- completion-reviewer: PASS on 2026-09-26, over this block at `b5d357c14ae396a0d436491692af17be018b278c`. It re-ran the selector and the mutation in a scratch copy, and confirmed that `TC-0002-0010` is still covered, the ledger row is untouched and the `### TDD-0011` entry is unchanged.

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
