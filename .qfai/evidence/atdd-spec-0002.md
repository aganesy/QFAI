# ATDD Evidence: spec-0002

## Objective

Carry the proof for the one `Integration` row of this spec's ledger whose test
could be identified. The pack's other rows are not backfilled here, and the
reason is recorded under Gaps.

## Inputs reviewed (files/paths)

- `.qfai/specs/spec-0002/06_Test-Cases.md`
- `.qfai/specs/spec-0002/04_Business-Rules.md`
- `.qfai/specs/spec-0002/tdd/test-list.md`
- `packages/qfai/tests/core/sddPreflight.test.ts`
- `packages/qfai/src/core/discussionPack.ts`

## Decisions made (with rationale)

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

## Work performed (what changed, where)

- `.qfai/specs/spec-0002/tdd/test-list.md` — `TDD-0001`'s `Test file`,
  `Selector` and `Evidence` corrected. `TDD-0011`'s `Selector` and `Evidence`
  corrected; that row is `validators`, so its proof is in
  `.qfai/evidence/implement-spec-0002.md`. No `Status` moved.
- This file created.

## Commands executed + key outputs

Every command ran from `packages/qfai`. The clean-tree runs were taken at
revision `955d78ccf4323d25c9eba36c1586da746c48203a`. The mutation was reverted
from a copy of the pre-mutation bytes, and the tree re-addressed afterwards to
confirm it had returned to the clean value.

| Run                       | Command                                                                        | Result                |
| ------------------------- | ------------------------------------------------------------------------------ | --------------------- |
| `TDD-0001` GREEN          | `npx vitest run tests/core/sddPreflight.test.ts`                                | 26 passed             |
| `TDD-0001` falsifiability | `npx vitest run tests/core/sddPreflight.test.ts`                                | 14 failed, 12 passed  |
| Refactor verify           | `npx vitest run tests/core/sddPreflight.test.ts tests/validators/uix/threeLayer.test.ts` | 36 passed    |
| Checkpoint                | `npx vitest run --project core --project validators`                            | 4121 passed           |

## Test volume estimate

Not applicable. This run authored no test; it records proof for a row whose
test already exists.

## Coverage obligations checklist

Unchanged by this run. The spec's obligations and their coverage are scored in
the Coverage Depth Matrix below.

## Ledger rows advanced

No row changed status. The row below was already `done`; this run supplies the
evidence its cell points at.

| TDD-ID     | Obligation     | Layer       | RED provenance | Status |
| ---------- | -------------- | ----------- | -------------- | ------ |
| `TDD-0001` | `TC-0002-0001` | integration | falsifiability | done   |

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

- Round 1: Revision: 955d78ccf4323d25c9eba36c1586da746c48203a
- Round 1: Satisfied-by: packages/qfai/src/core/discussionPack.ts, REQUIRED_DISCUSSION_PACK_MARKDOWN_FILES — the fifteen names a pack must hold for readiness to report no missing file.
- Round 1: Falsifiability command: npx vitest run tests/core/sddPreflight.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 14 failed, 12 passed (26). The row's own case fails on `expect(result.status).toBe("ready")`, an assertion inside its selector.
- Round 1: Falsifiability revision: working-tree+07809600906897d63380808641f2288d0e880dff0aae9eb94d170ee493112cee
- Round 1: GREEN command: npx vitest run tests/core/sddPreflight.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 26 passed (26)
- Round 1: RED test hash: f5cedfb3dce8f430517a4288c839b7cd6b7c2574bfdf34079ca21b27fe4ba854
- Round 1: RED test manifest: packages/qfai/tests/core/sddPreflight.test.ts

The mutation added a sixteenth name to the required list. Fourteen of the
file's twenty-six cases die, which is what the obligation's shape predicts:
every case that seeds a pack and expects it to be readable reads that list.

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

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0002.md`.
Totals: ✅ 11 / ⚠️ 20 / ❌ 34, with 1 not applicable, across 66 scored cells —
45 matrix depth cells, 5 matrix status cells, 12 business rule cells and 4
business rule status cells. No obligation reaches a green status.

## Work Orders Summary

| Role                | Task                                             | Status (PASS/REVISE/PENDING) |
| ------------------- | ------------------------------------------------ | ---------------------------- |
| test-design-analyst | Score the five obligations and write the matrix  | PASS                         |

## Cross-spec obligations

None.

## Execution logs

Recorded per row above, and summarized in the table under
"Commands executed + key outputs".

## Gaps / Open risks

Four of the pack's six ledger rows are not backfilled, and none of them can be
until the row is true.

| Row                        | What stops it                                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `TDD-0008`                 | `TC-0002-0008` asks that a planner-first pass be preserved. Nothing in the package emits a planner-first finding.  |
| `TDD-0009`, `TDD-0010`     | `TC-0002-0009` asks that a planner-first violation be emitted. Same: the validator that did so was retired.        |
| `TDD-0012`                 | `TC-0002-0011` names README and skill wording. Its test file reads neither, and no case in it covers the README.   |

`TDD-0009` and `TDD-0010` also share one obligation with no `Boundary` between
them, which is a separate finding on the ledger.

One test in the pack's neighbourhood passes without proving anything:
`packages/qfai/tests/validators/uix/threeLayer.test.ts`, `non-UI skip`. Removing
the non-UI guard from the function it calls leaves it green, because that
function returns nothing for an absent sidecar either way. The case that does
discriminate is `skips non-UI packs`, and `TDD-0011` now names it.

## Final status

PASS for the row recorded here. The pack is not clean; the rows above are
listed rather than claimed.
