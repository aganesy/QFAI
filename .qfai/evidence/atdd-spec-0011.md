# ATDD Evidence: spec-0011

## Objective

Take `TDD-0026` and `TDD-0039` through the reviews `DR-0298` waived. Both rows
were closed at `exception` with their RED and GREEN recorded and their
`qa-gatekeeper`, completion and code quality reviews skipped. Both were reopened
to `todo`, and this run hands them to `/qfai-implement` on the falsifiability
path.

## Inputs reviewed (files/paths)

- `.qfai/decisions/DR-0298-intent-driven-rows-close-without-per-row-review.md`
- `.qfai/specs/spec-0011/06_Test-Cases.md` (`TC-0011-0018`, `TC-0011-0027`),
  `04_Business-Rules.md` (`BR-0011-0014`), `05_Examples.md` (`EX-0011-0015`,
  `EX-0011-0024`)
- `.qfai/specs/spec-0011/tdd/test-list.md`
- `packages/qfai/tests/integration/implement/orchestrated/seamOnly.test.ts`
- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/orchestrated-mode.md`
- `.qfai/assistant/catalog/test-layers.md`

## Decisions made (with rationale)

- **Both rows take branch 2, falsifiability.** The test and the passage it reads
  already exist, so each case passes on its first run and no natural RED can be
  observed.
- **Each mutation breaks one clause of the `seam-only` passage**, the one the
  row's test case is most about: the minimal connection for `TDD-0026`, and the
  `unrun` result for `TDD-0039`. Each leaves the other row's case passing.
- **The test file is not edited.** It already carries both test case
  annotations under `tests/integration/**`, where `Level: L3` routes them.

## Grilling Session

### /qfai-atdd — run started 2026-09-25T10:48:45.909Z

Preflight: confidence high

No session opened. `DR-0298` names the reviews owed, the rows' test cases fix
what each case checks, and the test already exists. Nothing surfaced during the
run that the spec or the decision record leaves open.

### /qfai-implement — run started 2026-09-25T10:52:10.000Z

Preflight: confidence high

No session was opened. The handover names each row's predicate and mutation,
and nothing surfaced during the run that the spec or the handover leaves open.

## Work performed (what changed, where)

- `.qfai/specs/spec-0011/tdd/test-list.md`: `TDD-0026` and `TDD-0039` moved
  from `exception` to `todo`.
- `.qfai/waivers.yml`: both rows removed from the spec-0011 review waiver.
- `.qfai/evidence/implement-spec-0011.md`: the two rows' `DR-0298` entries
  removed, since an `Integration` row's evidence belongs in this file.

No test or product file changed.

## Commands executed + key outputs

The mutation and restored runs are recorded in each row's entry.

## Test volume estimate

| Layer       | Files touched | Cases   |
| ----------- | ------------- | ------- |
| integration | 0             | 2 kept  |

## Coverage obligations checklist

- `TC-0011-0018`, `TC-0011-0027`: annotated in
  `packages/qfai/tests/integration/implement/orchestrated/seamOnly.test.ts`.
- The pack's other obligations are scored in the Coverage Depth Matrix. This run
  took up only the two rows above.

## Ledger rows advanced

| TDD-ID     | Obligation     | Layer       | RED provenance | Entry                 |
| ---------- | -------------- | ----------- | -------------- | --------------------- |
| `TDD-0026` | `TC-0011-0018` | Integration | falsifiability | [TDD-0026](#tdd-0026) |
| `TDD-0039` | `TC-0011-0027` | Integration | falsifiability | [TDD-0039](#tdd-0039) |

### TDD-0026

- TDD-ID: TDD-0026
- Layer: Integration
- Test file: packages/qfai/tests/integration/implement/orchestrated/seamOnly.test.ts
- Selector: TC-0011-0018 (TDD-0026): A Seam-Only Work Order Lands Only the Minimal Connection
- TC-ref: TC-0011-0018
- Branch: falsifiability — the test and the passage it reads already exist, so the case passes on its first run
- Predicate to break: packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/orchestrated-mode.md, section `## seam-only`, the bullet `Only the minimal connection the target test needs is landed.`
- Mutation: `- Only the minimal connection the target test needs is landed.` to `- The full implementation the target test needs is landed.`

The row was reopened from `exception`, where `DR-0298` had closed it with its
review waived.

#### Round 1

- Round 1: Satisfied-by: packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/orchestrated-mode.md, section `## seam-only`, the bullet `Only the minimal connection the target test needs is landed.`
- Round 1: Falsifiability command: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/implement/orchestrated/seamOnly.test.ts --reporter=verbose --testNamePattern='TC-0011-0018 \(TDD-0026\): A Seam-Only Work Order Lands Only the Minimal Connection' (cwd `packages/qfai`)
- Round 1: Falsifiability result: exit 1; Test Files 1 failed (1); Tests 1 failed | 1 skipped (2). The row's case fails on `` AssertionError: expected '## `seam-only` - The work goes throug…' to match /only the minimal connection the targ…/i `` at `tests/integration/implement/orchestrated/seamOnly.test.ts:23:18`. Run over the whole file, the `TDD-0039` case still passes: Tests 1 failed | 1 passed (2)
- Round 1: Falsifiability revision: 9d74b8328c861cc394d5ac8147a83bc1c7540332
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 9c1fd5fd2f322f6efb4793a6cbb45a4c3000e1351f75b9bc008c979fa4394617
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/recordProse.ts
packages/qfai/tests/helpers/shippedAssistant.ts
packages/qfai/tests/integration/implement/orchestrated/seamOnly.test.ts
```

The mutation is committed as `9d74b8328c861cc394d5ac8147a83bc1c7540332` so the
mutated tree stays addressable. `c5fcbedd8603f8fdca7cde34c0a299698830224f` reverts it.

- Round 1: Revision: ee3586ca5bb84511fb8485094475dce95f4e42de
- Round 1: GREEN command: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/implement/orchestrated/seamOnly.test.ts --reporter=verbose --testNamePattern='TC-0011-0018 \(TDD-0026\): A Seam-Only Work Order Lands Only the Minimal Connection' (cwd `packages/qfai`)
- Round 1: GREEN result: exit 0; `✓ |integration| tests/integration/implement/orchestrated/seamOnly.test.ts > qfai-implement in a workflow run > TC-0011-0018 (TDD-0026): A Seam-Only Work Order Lands Only the Minimal Connection 8ms`; Test Files 1 passed (1); Tests 1 passed | 1 skipped (2), on the tree with the mutation reverted

- Refactor verify command: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/implement/orchestrated/ tests/integration/workflow/plans.test.ts tests/integration/orchestratedModeReferenceSpec0001.test.ts tests/integration/init/entryInstallSet.test.ts tests/e2e/spec0018DeliverAFeatureE2E.test.ts tests/e2e/spec0018StopForMyDecisionE2E.test.ts --reporter=verbose (cwd `packages/qfai`)
- Refactor verify result: exit 0; Test Files 19 passed (19); Tests 51 passed (51). No product or test file changed in this cycle: the mutation and its revert cancel out. `orchestrated-mode.md` is read by path rather than imported, so the suite is every test module found by searching the tests for that file name that reads this skill's copy, directly or through a glob over the skills; modules that read another skill's copy are left out
- Refactor verify revision: ee3586ca5bb84511fb8485094475dce95f4e42de
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the falsifiability mutation run, reviewed revision 9d74b8328c861cc394d5ac8147a83bc1c7540332; qa-gatekeeper#2 PASS, build-phase GREEN + oracle proof, reviewed revision ee3586ca5bb84511fb8485094475dce95f4e42de

- Round 1: reviewer verdict: PASS
- Round 1: Review pack: .qfai/review/review-20260925111900000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal: e732963fe61d3726b8ba5b9d57cd44bb9f91f5a8f8db29b640bb3fd7310dccd7
- Spec review: PASS
- Spec reviewed revision: ee3586ca5bb84511fb8485094475dce95f4e42de
- Spec audited evidence hash: 031bb165a4a4f3c318c197b5971b21684d41b2bbc7d25dadba27323113caf33b
- Spec review pack: .qfai/review/review-20260925111900000 <!-- qfai:not-a-citation -->
- Spec review pack seal: e732963fe61d3726b8ba5b9d57cd44bb9f91f5a8f8db29b640bb3fd7310dccd7
- Code quality review: PASS
- Code quality reviewed revision: ee3586ca5bb84511fb8485094475dce95f4e42de
- Code quality audited evidence hash: 031bb165a4a4f3c318c197b5971b21684d41b2bbc7d25dadba27323113caf33b
- Code quality review pack: .qfai/review/review-20260925111900000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: e732963fe61d3726b8ba5b9d57cd44bb9f91f5a8f8db29b640bb3fd7310dccd7
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: ee3586ca5bb84511fb8485094475dce95f4e42de
- Checkpoint verification command: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/implement/orchestrated/ tests/integration/workflow/plans.test.ts tests/integration/orchestratedModeReferenceSpec0001.test.ts tests/integration/init/entryInstallSet.test.ts tests/e2e/spec0018DeliverAFeatureE2E.test.ts tests/e2e/spec0018StopForMyDecisionE2E.test.ts --reporter=verbose (cwd `packages/qfai`)
- Checkpoint verification result: PASS — Test Files 19 passed (19); Tests 51 passed (51). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: ee3586ca5bb84511fb8485094475dce95f4e42de
- Checkpoint verification seal: a549fbca82ea32f7fceff65e70f7ea1404abeaac8a03a248881a45a5f64d96f6

### TDD-0039

- TDD-ID: TDD-0039
- Layer: Integration
- Test file: packages/qfai/tests/integration/implement/orchestrated/seamOnly.test.ts
- Selector: TC-0011-0027 (TDD-0039): A seam that cannot be landed
- TC-ref: TC-0011-0027
- Branch: falsifiability — the test and the passage it reads already exist, so the case passes on its first run
- Predicate to break: packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/orchestrated-mode.md, section `## seam-only`, the bullet `` With no such finding, it is returned `unrun`. ``
- Mutation: `` - With no such finding, it is returned `unrun`. `` to `` - With no such finding, it is returned `blocked`. ``

The row was reopened from `exception`, where `DR-0298` had closed it with its
review waived.

#### Round 1

- Round 1: Satisfied-by: packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/orchestrated-mode.md, section `## seam-only`, the bullet `` With no such finding, it is returned `unrun`. ``
- Round 1: Falsifiability command: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/implement/orchestrated/seamOnly.test.ts --reporter=verbose --testNamePattern='TC-0011-0027 \(TDD-0039\): A seam that cannot be landed' (cwd `packages/qfai`)
- Round 1: Falsifiability result: exit 1; Test Files 1 failed (1); Tests 1 failed | 1 skipped (2). The row's case fails on `` AssertionError: expected '## `seam-only` - The work goes throug…' to match /with no such finding, it is returned…/i `` at `tests/integration/implement/orchestrated/seamOnly.test.ts:42:18`. Run over the whole file, the `TDD-0026` case still passes: Tests 1 failed | 1 passed (2)
- Round 1: Falsifiability revision: 40682b50829549ff44e85ff0619a6cf140b312cd
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 9c1fd5fd2f322f6efb4793a6cbb45a4c3000e1351f75b9bc008c979fa4394617
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/recordProse.ts
packages/qfai/tests/helpers/shippedAssistant.ts
packages/qfai/tests/integration/implement/orchestrated/seamOnly.test.ts
```

The mutation is committed as `40682b50829549ff44e85ff0619a6cf140b312cd` so the
mutated tree stays addressable. `ee3586ca5bb84511fb8485094475dce95f4e42de` reverts it.

- Round 1: Revision: ee3586ca5bb84511fb8485094475dce95f4e42de
- Round 1: GREEN command: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/implement/orchestrated/seamOnly.test.ts --reporter=verbose --testNamePattern='TC-0011-0027 \(TDD-0039\): A seam that cannot be landed' (cwd `packages/qfai`)
- Round 1: GREEN result: exit 0; `✓ |integration| tests/integration/implement/orchestrated/seamOnly.test.ts > qfai-implement in a workflow run > TC-0011-0027 (TDD-0039): A seam that cannot be landed 6ms`; Test Files 1 passed (1); Tests 1 passed | 1 skipped (2), on the tree with the mutation reverted

- Refactor verify command: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/implement/orchestrated/ tests/integration/workflow/plans.test.ts tests/integration/orchestratedModeReferenceSpec0001.test.ts tests/integration/init/entryInstallSet.test.ts tests/e2e/spec0018DeliverAFeatureE2E.test.ts tests/e2e/spec0018StopForMyDecisionE2E.test.ts --reporter=verbose (cwd `packages/qfai`)
- Refactor verify result: exit 0; Test Files 19 passed (19); Tests 51 passed (51). No product or test file changed in this cycle: the mutation and its revert cancel out. `orchestrated-mode.md` is read by path rather than imported, so the suite is every test module found by searching the tests for that file name that reads this skill's copy, directly or through a glob over the skills; modules that read another skill's copy are left out
- Refactor verify revision: ee3586ca5bb84511fb8485094475dce95f4e42de
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the falsifiability mutation run, reviewed revision 40682b50829549ff44e85ff0619a6cf140b312cd; qa-gatekeeper#2 PASS, build-phase GREEN + oracle proof, reviewed revision ee3586ca5bb84511fb8485094475dce95f4e42de

- Round 1: reviewer verdict: REVISE — implementation-reviewer: the case never asserts the condition line the failure results apply to, so deleting `When the seam cannot be landed or observed:` leaves it green; completion-reviewer PASS
- Round 1: Review pack: .qfai/review/review-20260925111900001 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal: ccaa13eb19c32eafe0fc831b139f490822623bbb936d730bff0627b86d9c11f1

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0011.md` (committed). Totals: ✅ 118 / ⚠️ 38 / ❌ 49, with 212 not applicable, across 417 scored cells.

## Work Orders Summary

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | test-design-analyst | test-design-analyst | Score every obligation of the pack | 02_User-stories.md, 04_Business-Rules.md, 06_Test-Cases.md | .qfai/evidence/coverage-depth-spec-0011.md | PASS |
| 2 | - | n/a | grilling(-@2026-09-25T10:48:45.909Z/none): none | - | - | PASS |
| 3 | - | n/a | grilling(-@2026-09-25T10:52:10.000Z/none): none | - | - | PASS |
| 4 | qa-gatekeeper | qa-gatekeeper#1 | /qfai-implement: TDD-0026 RED phase gate on the falsifiability mutation run | #tdd-0026 | #tdd-0026 Round 1 | PASS |
| 5 | qa-gatekeeper | qa-gatekeeper#1 | /qfai-implement: TDD-0039 RED phase gate on the falsifiability mutation run | #tdd-0039 | #tdd-0039 Round 1 | PASS |
| 6 | qa-gatekeeper | qa-gatekeeper#2 | /qfai-implement: TDD-0026 build-phase GREEN + oracle proof | #tdd-0026 | #tdd-0026 Round 1; advisories taken: the verbatim passing line added to GREEN result, and the Refactor verify suite widened to every reader of the file | PASS |
| 7 | qa-gatekeeper | qa-gatekeeper#2 | /qfai-implement: TDD-0039 build-phase GREEN + oracle proof | #tdd-0039 | #tdd-0039 Round 1; the same two advisories taken | PASS |
| 8 | completion-reviewer | completion-reviewer | /qfai-implement: completion review of TDD-0026, attempt 1 | #tdd-0026 | review-20260925111900000 | PASS |
| 9 | implementation-reviewer | implementation-reviewer | /qfai-implement: code quality review of TDD-0026, attempt 1 | #tdd-0026 | review-20260925111900000 | PASS |
| 10 | orchestrator | orchestrator | /qfai-implement: checkpoint verification of TDD-0026, off a checkpoint boundary | #tdd-0026 | Checkpoint verification fields | PASS |
| 11 | completion-reviewer | completion-reviewer | /qfai-implement: completion review of TDD-0039, attempt 1 | #tdd-0039 | review-20260925111900001 | PASS |
| 12 | implementation-reviewer | implementation-reviewer | /qfai-implement: code quality review of TDD-0039, attempt 1 | #tdd-0039 | review-20260925111900001; the case never asserts the condition line `When the seam cannot be landed or observed:`, so deleting it leaves the case green | REVISE |

## Cross-spec obligations

None.

## Execution logs

Recorded per row under `## Ledger rows advanced`.

## Gaps / Open risks

- This run took up two of the sixteen rows `DR-0298` closed in spec-0011. The
  other fourteen stay at `exception` under the spec-0011 review waiver.
- Each row's one mutation breaks one clause of the `seam-only` passage. No
  mutation has been run against the case's other assertions.
- Each row's earlier cycle, recorded when `DR-0298` closed it, is kept at
  `1a74b7c45^:.qfai/evidence/implement-spec-0011.md` rather than here as an
  earlier round, so this cycle is numbered Round 1.
- `TDD-0039` stands at `review-fix`. `implementation-reviewer` found that its
  case never asserts the line `When the seam cannot be landed or observed:`, so
  deleting that line leaves the case green. The fix is owed: an assertion tying
  the line to the list under it, a falsifiability run that deletes the line,
  and Round 2 with both reviews. `TDD-0026` reads the same test file, so that
  edit also owes a shared-artifact re-verify of `TDD-0026`.
- Both rows record the `qa-gatekeeper` verdict on two lines rather than the
  one-line `PASS x2 (...)` form, and their `Refactor verify result` does not
  name which resolution step chose the suite. The reviewers raised both as
  advisory record defects.
- The matrix records 49 `❌` cells, each with its reason. Among them:
  - the handoff fields spec-0011 names (`extractedDesignSystem` and a warning
    for legacy fields) are not what the product ships, which needs a spec
    change rather than a test;
  - the spec states a 10-point gate where `qfai-implement/SKILL.md` ships 12;
  - `TC-0011-0011` has no case, and `TC-0011-0012`'s drift half belongs to
    spec-0004;
  - the cases for `TC-0011-0001` and `TC-0011-0008` cannot fail as written;
  - the shipped `diagnose-only` section does not state what `matchedRowIds`
    holds when no obligation matches, which `EX-0011-0017` asks for.

## Final status (PASS / PASS with cross-spec obligations / FAIL) + who confirmed

FAIL — the pack's other ATDD-owned rows are still owed, as the matrix records.

`TDD-0026` is `done`: `qa-gatekeeper`, `completion-reviewer` and
`implementation-reviewer` passed it. `TDD-0039` is at `review-fix` after a
blocking `implementation-reviewer` finding.
