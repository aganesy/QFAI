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

## Grilling Session

### /qfai-atdd — run started 2026-09-25T10:14:58.575Z

Preflight: confidence high

No session opened. The plan fixed the two rows, the test each one names and the
mutation that falsifies each. Both named lines hold the named text at this
revision, and nothing surfaced during the run that the spec leaves open.

### /qfai-implement — run started 2026-09-25T10:08:44.375Z

Preflight: confidence high

No session opened. The plan phase fixed the two rows, their order and the
mutation each one takes, and the `/qfai-atdd` handover names each predicate.
Nothing surfaced during the run that the spec or the handover leaves open.

## Ledger rows advanced

`TDD-0001` was already `done`; its entry supplies the evidence its cell points
at.

The run started 2026-09-25T10:14:58.575Z hands over `TDD-0008` and `TDD-0016`.
Both rows are back at `todo`, and both cases passed on their first run, so both
take branch 2. `/qfai-implement` Phase Red step 3c applies each mutation and
writes the falsifiability trio into the row's entry.

| TDD-ID     | Obligation     | Layer       | RED provenance | Status |
| ---------- | -------------- | ----------- | -------------- | ------ |
| `TDD-0001` | `TC-0002-0001` | integration | falsifiability | done   |
| `TDD-0008` | `TC-0002-0008` | integration | falsifiability | todo   |
| `TDD-0016` | `US-0002-0005` | E2E         | falsifiability | todo   |

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

- TDD-ID: TDD-0008
- Layer: integration
- Test file: packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts
- Selector: SKILL.md の UI-bearing completion が brand SSOT を要求している
- TC-ref: TC-0002-0008
- Branch: falsifiability — the shipped completion matrix already keeps the design system out of the completion conditions, so the case passed on its first run
- Predicate to break: packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/references/discussion-completion-matrix.md:64, `design system is not finalized here (discussion is planner-first).` — the clause of condition 4 under `## UI-bearing Packs` that leaves the design system unfinalized at discussion
- Mutation: `design system is not finalized here` to `design system is finalized here`
- Why it fails: the case collects the ordered list under `## UI-bearing Packs` and matches it against `/design\s+system\s+is\s+not\s+finalized/`. The mutated condition no longer holds that phrase, so `toMatch` fails as an assertion at `tests/integration/discussionSkillTemplateIntegration.test.ts:147`. The assertions before it still pass: the mutation leaves the `SKILL.md` file names and the unranked-exploration clause in place
- Type check: the mutated file is Markdown, so no type check applies
- Other rows: `TDD-0016` also fails, at `tests/e2e/spec0002PlannerFirstE2E.test.ts:38`, which matches `/design\s+system\s+is\s+not\s+finalized\s+here/` against the matrix `qfai init` installs from the same asset. `TDD-0009` and `TDD-0012` still pass. `TDD-0009`'s case matches condition 4 only up to `no single screen exploration is selected`, and `TDD-0012`'s case does not read the matrix
- Classification command: pnpm -C packages/qfai exec vitest run tests/integration/discussionSkillTemplateIntegration.test.ts -t "SKILL.md の UI-bearing completion が brand SSOT を要求している"
- Classification result: Test Files 1 passed (1); Tests 1 passed | 22 skipped (23), at working-tree+847e4e5d2f5a213dee5b863880cbcf058c7a22c470ac65b086a7095d48919fc1

The row was reopened from `exception`, where `DR-0298` had closed it with its
review waived.

#### Round 1

- Round 1: Satisfied-by: packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/references/discussion-completion-matrix.md, condition 4 under `## UI-bearing Packs` — `design system is not finalized here (discussion is planner-first).`, which keeps the design system out of what a UI-bearing pack must settle at discussion
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/discussionSkillTemplateIntegration.test.ts -t "SKILL.md の UI-bearing completion が brand SSOT を要求している"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 22 skipped (23). The row's case fails on ``AssertionError: expected '1. Both reference registries in `04_S…' to match /design\s+system\s+is\s+not\s+finalized/`` at `tests/integration/discussionSkillTemplateIntegration.test.ts:147:23`

The edit, the negation dropped from condition 4 at line 64:

```diff
-   design system is not finalized here (discussion is planner-first).
+   design system is finalized here (discussion is planner-first).
```

- Round 1: Falsifiability revision: working-tree+6060fccdca596fe5fb9bb99d61a8acd38184b22c44cad0e7e0ba01aa68f4943f
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 2f58fd8eed2a9ad961c2472bb4ac0d45f102e454bb29f0a94c85df2eb9578518
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/stdout.ts
packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts
```

- Round 1: Revision: 828fdace78bc09c28b22ec8510653729e75a83da
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/discussionSkillTemplateIntegration.test.ts -t "SKILL.md の UI-bearing completion が brand SSOT を要求している"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 22 skipped (23). Run after `git checkout -- packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/references/discussion-completion-matrix.md`, which restores the file as it is at that revision

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/discussionSkillTemplateIntegration.test.ts tests/e2e/spec0002PlannerFirstE2E.test.ts
- Refactor verify result: Test Files 2 passed (2); Tests 24 passed (24). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the two test files are the suite the shared matrix reaches
- Refactor verify revision: 828fdace78bc09c28b22ec8510653729e75a83da

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

- TDD-ID: TDD-0016
- Layer: E2E
- Test file: packages/qfai/tests/e2e/spec0002PlannerFirstE2E.test.ts
- Selector: US-0002-0005: the installed discussion skill carries explorations unranked and records the user's brand direction
- US-ref: US-0002-0005
- Branch: falsifiability — the completion matrix `qfai init` installs already marks a brand direction taken without the user, so the journey passed on its first run
- Predicate to break: packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/references/discussion-completion-matrix.md:68, `` user carries `chosen_by: assumption` and an open entry in `11_OQ-Register.md`. `` — the end of condition 5 under `## UI-bearing Packs`, which begins on line 67 with `A direction taken without the`
- Mutation: `` carries `chosen_by: assumption` and an open entry `` to `carries no marker and an open entry`, with the line break after `without the` kept
- Why it fails: the journey runs `qfai init` into a temporary root, which copies the matrix from the package assets, and matches the installed `## UI-bearing Packs` section against `` /taken\s+without\s+the\s+user\s+carries\s+`chosen_by: assumption`/ ``. With the marker gone the pattern has nothing to match, so `toMatch` fails as an assertion at `tests/e2e/spec0002PlannerFirstE2E.test.ts:40`. The assertions on lines 36 to 39 still pass
- Type check: the mutated file is Markdown, so no type check applies
- Other rows: `TDD-0008` also fails, at `tests/integration/discussionSkillTemplateIntegration.test.ts:149`, which matches the same pattern against the asset directly. `TDD-0009` and `TDD-0012` still pass, because neither case reads condition 5
- Classification command: pnpm -C packages/qfai exec vitest run tests/e2e/spec0002PlannerFirstE2E.test.ts -t "US-0002-0005"
- Classification result: Test Files 1 passed (1); Tests 1 passed (1), at working-tree+847e4e5d2f5a213dee5b863880cbcf058c7a22c470ac65b086a7095d48919fc1

The row was reopened from `exception`, where `DR-0298` had closed it with its
review waived.

#### Round 1

- Round 1: Satisfied-by: packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/references/discussion-completion-matrix.md, condition 5 under `## UI-bearing Packs` — ``A direction taken without the user carries `chosen_by: assumption` and an open entry in `11_OQ-Register.md`.``, which requires a brand direction the user did not choose to be marked as an assumption in the matrix `qfai init` installs
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/e2e/spec0002PlannerFirstE2E.test.ts -t "US-0002-0005"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed (1). The row's case fails on `AssertionError: expected 'UI-bearing Packs\n\nCompletion is blo…' to match /taken\s+without\s+the\s+user\s+carrie…/` at `tests/e2e/spec0002PlannerFirstE2E.test.ts:40:25`

The edit, the marker dropped from condition 5 at line 68:

```diff
-   user carries `chosen_by: assumption` and an open entry in `11_OQ-Register.md`.
+   user carries no marker and an open entry in `11_OQ-Register.md`.
```

- Round 1: Falsifiability revision: working-tree+64c75cd77ebc0efaa7be2cf5ad80c6926bd5ca9d5ed76c0a4196059053ae08c5
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 32024a896f6ae95837816ac90b8ff4155c70ea0b1e681ff84ae8501204866041
- Round 1: RED test manifest:

```text
packages/qfai/tests/e2e/spec0002PlannerFirstE2E.test.ts
packages/qfai/tests/helpers/stdout.ts
```

- Round 1: Revision: 828fdace78bc09c28b22ec8510653729e75a83da
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/e2e/spec0002PlannerFirstE2E.test.ts -t "US-0002-0005"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed (1). Run after `git checkout -- packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/references/discussion-completion-matrix.md`, which restores the file as it is at that revision

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/discussionSkillTemplateIntegration.test.ts tests/e2e/spec0002PlannerFirstE2E.test.ts
- Refactor verify result: Test Files 2 passed (2); Tests 24 passed (24). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the two test files are the suite the shared matrix reaches
- Refactor verify revision: 828fdace78bc09c28b22ec8510653729e75a83da

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0002.md`.
Totals: ✅ 12 / ⚠️ 27 / ❌ 74, with 7 not applicable, across 120 scored cells —
108 matrix depth cells (12 rows × 9 columns) and 12 business rule cells
(4 rows × 3 columns). `Status` is a row verdict, not a mark, and is outside
every total.

## Work Orders Summary

| Role                | Task                                              | Status (PASS/REVISE/PENDING) |
| ------------------- | ------------------------------------------------- | ---------------------------- |
| test-design-analyst | Score the twelve obligations and write the matrix | PASS                         |

### Rows for the run started 2026-09-25T10:14:58.575Z

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | acceptance-test-engineer | acceptance-test-engineer | Hand over `TDD-0008` and `TDD-0016` on the falsifiability branch | both test files, `discussion-completion-matrix.md`, 06_Test-Cases.md `TC-0002-0008`, 02_User-stories.md `US-0002-0005` | #tdd-0008, #tdd-0016 | PASS |
| 2 | - | n/a | grilling(-@2026-09-25T10:14:58.575Z/none): none | - | - | PASS |
| 3 | test-design-analyst | test-design-analyst#2 | Rescore `TC-0002-0008` and `US-0002-0005` in the matrix | both test files, 06_Test-Cases.md, 02_User-stories.md, CR-20260912-0003 | coverage-depth-spec-0002.md | PASS |

### Rows for the /qfai-implement run started 2026-09-25T10:08:44.375Z

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 4 | - | n/a | grilling(-@2026-09-25T10:08:44.375Z/none): none | - | - | PASS |

## Cross-spec obligations

None.

## Execution logs

Recorded per row above, and summarized in the table under
"Commands executed + key outputs".

## Gaps / Open risks

Two rows stay at `exception` under `DR-0298`. Each answers an L3 test case with
a test outside `tests/integration/**`, so neither can be handed over until its
test is moved and its `Layer` corrected.

| Row        | Obligation     | What keeps it at `exception`                                                          |
| ---------- | -------------- | ------------------------------------------------------------------------------------- |
| `TDD-0009` | `TC-0002-0009` | Its test is in `tests/e2e/discussionHardeningE2E.test.ts`, with no TC annotation      |
| `TDD-0012` | `TC-0002-0011` | Its test is in `tests/assets/assets.test.ts`, and its `Layer` cell reads `validators` |

`TDD-0016`'s case reaches only part of `US-0002-0005`.

| Reached by the case                                   | Not reached                               |
| ----------------------------------------------------- | ----------------------------------------- |
| The screen explorations are carried unranked          | Discussion defines exploration conditions |
| Only the brand direction the user chooses is recorded | Discussion defines anti-goals             |

One test in the pack's neighbourhood passes without proving anything:
`packages/qfai/tests/validators/uix/threeLayer.test.ts`, `non-UI skip`. Removing
the non-UI guard from the function it calls leaves it green, because that
function returns nothing for an absent sidecar either way. The case that does
discriminate is `skips non-UI packs`, and `TDD-0011` now names it.

## Final status

PASS for the row recorded here. The pack is not clean; the rows above are
listed rather than claimed.
