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
revision `84081298686311832c7e7ac3b7da08eb542b40b0`. The mutation was reverted
from a copy of the pre-mutation bytes, and the tree re-addressed afterwards to
confirm it had returned to the clean value.

| Run                       | Command                                                                                                                                     | Result               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `TDD-0001` GREEN          | `npx vitest run tests/core/sddPreflight.test.ts`                                                                                            | 26 passed            |
| `TDD-0001` falsifiability | `npx vitest run tests/core/sddPreflight.test.ts`                                                                                            | 1 failed, 25 passed  |
| Refactor verify           | `npx vitest run tests/core/sddPreflight.test.ts tests/validators/uix/threeLayer.test.ts`                                                    | 36 passed            |
| Checkpoint                | `npx vitest run --project core --project validators --exclude 'tests/core/prFixMonitor.test.ts' --exclude 'tests/core/prMergePlan.test.ts'` | 4601 passed          |

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
Totals: ✅ 11 / ⚠️ 17 / ❌ 91, with 1 not applicable, across 120 scored cells —
108 matrix depth cells (12 rows × 9 columns) and 12 business rule cells
(4 rows × 3 columns). `Status` is a row verdict, not a mark, and is outside
every total.

## Work Orders Summary

| Role                | Task                                              | Status (PASS/REVISE/PENDING) |
| ------------------- | ------------------------------------------------- | ---------------------------- |
| test-design-analyst | Score the twelve obligations and write the matrix | PASS                         |

## Cross-spec obligations

None.

## Execution logs

Recorded per row above, and summarized in the table under
"Commands executed + key outputs".

## Gaps / Open risks

Four of the pack's six ledger rows are not backfilled, and none of them can be
until the row is true.

| Row                    | What stops it                                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TDD-0008`             | `TC-0002-0008` asks that a planner-first pass be preserved. Nothing in the package emits a planner-first finding.                                                                     |
| `TDD-0009`, `TDD-0010` | `TC-0002-0009` asks that a planner-first violation be emitted. Same: the validator that did so was retired.                                                                           |
| `TDD-0012`             | `TC-0002-0011` names README and skill wording. The row names `threeLayer.test.ts`, which reads neither. The case that reads both is in `assets.test.ts`, which the row does not name. |

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
