# ATDD Evidence: spec-0001

## Objective

Take `TDD-0035` and `TDD-0036` through the reviews `DR-0298` waived. Both rows
had closed at `exception` with their RED and GREEN recorded in
`implement-spec-0001.md` and no `qa-gatekeeper`, `completion-reviewer` or
`implementation-reviewer` verdict. Both are `Layer: Integration`, so this file
owns their evidence.

The six other rows `DR-0298` closed in this ledger (`TDD-0034`, `TDD-0037` …
`TDD-0041`) are not part of this run and stay at `exception`.

## Inputs reviewed (files/paths)

- `.qfai/specs/spec-0001/03_Acceptance-Criteria.md` (`AC-0001-0013`)
- `.qfai/specs/spec-0001/04_Business-Rules.md` (`BR-0001-0025`)
- `.qfai/specs/spec-0001/06_Test-Cases.md` (`TC-0001-0026`, `TC-0001-0027`)
- `.qfai/specs/spec-0001/tdd/test-list.md`
- `.qfai/decisions/DR-0298-intent-driven-rows-close-without-per-row-review.md`
- `.qfai/evidence/implement-spec-0001.md#tdd-0035`, `#tdd-0036`
- `packages/qfai/tests/integration/stageSkillEntryCheckSpec0001.test.ts`
- `packages/qfai/assets/init/.qfai/assistant/constitution/shared-skill-operating-baseline.md`,
  `## Workflow Run Entry Check`

## Decisions made (with rationale)

- Both rows take the falsifiability branch. The shipped text they read already
  exists, so each case passes on its first run, and the RED recorded under
  `DR-0298` was taken on a tree that no longer exists.
- Both rows move `exception -> todo`. The anomaly `DR-0298` recorded was the
  waived review, not a change to an approved obligation, so no Change Request
  is needed. Each row keeps `DR-0298` in `DR-ID`.

## Grilling Session

### /qfai-atdd — run started 2026-09-25T10:14:05.606Z

Preflight: confidence high

No session opened. `TC-0001-0026` and `TC-0001-0027` fix what each case
reads, the cases already exist and pass, and `DR-0298` names what was waived.
Nothing surfaced during the run that the spec or that record leaves open.

## Work performed (what changed, where)

## Commands executed + key outputs

## Test volume estimate

No test is added. The run re-uses the two cases in
`stageSkillEntryCheckSpec0001.test.ts`.

## Coverage obligations checklist

| Obligation     | Row        | Test                                        |
| -------------- | ---------- | ------------------------------------------- |
| `TC-0001-0026` | `TDD-0035` | `stageSkillEntryCheckSpec0001.test.ts` case 1 |
| `TC-0001-0027` | `TDD-0036` | `stageSkillEntryCheckSpec0001.test.ts` case 2 |

## Ledger rows advanced

| TDD-ID     | Obligation     | Layer       | RED provenance | Status |
| ---------- | -------------- | ----------- | -------------- | ------ |
| `TDD-0035` | `TC-0001-0026` | Integration | falsifiability | blocked |
| `TDD-0036` | `TC-0001-0027` | Integration | falsifiability | refactor |

### TDD-0035

- TDD-ID: TDD-0035
- Layer: Integration
- Test file: packages/qfai/tests/integration/stageSkillEntryCheckSpec0001.test.ts
- Selector: TC-0001-0026: the entry check hands over, works the order, or is off
- TC-ref: TC-0001-0026
- Branch: falsifiability — the shipped baseline already states the entry check, so the case passed on its first run
- Predicate to break: packages/qfai/assets/init/.qfai/assistant/constitution/shared-skill-operating-baseline.md:173, the `pass-on` row of the `## Workflow Run Entry Check (Mandatory)` table, sentence ``Pass the request to `qfai-run` in the same turn.``
- Mutation: on line 173, ``Pass the request to `qfai-run` in the same turn.`` to ``Pass the request to `qfai-run` in the next turn.``
- Why it fails: ``rowOf(section, "`pass-on`")`` still returns line 173, and the row still holds `` `active` ``, `Neither invoked by name nor handed a QFAI work order` and `Edit nothing`, so lines 25 to 27 pass.
  The row no longer says the hand-over happens in the same turn, so ``expect(passOn).toMatch(/pass the request to `qfai-run` in the same turn/i)`` fails as an assertion at `tests/integration/stageSkillEntryCheckSpec0001.test.ts:28`
- Type check: the edit is to a Markdown file, so no type-checked file changes. The replacement has the same length, so the table stays aligned
- Other rows: `TDD-0036` still passes, because its case reads only the `error` row on line 176. No other test matches `in the same turn`; `tests/integration/sdd/entryCheck.test.ts` reads `skills/qfai-sdd/references/orchestrated-mode.md`, not this file
- Classification command: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/stageSkillEntryCheckSpec0001.test.ts -t "TC-0001-0026: the entry check hands over, works the order, or is off" (run from `packages/qfai`)
- Classification result: Test Files 1 passed (1); Tests 1 passed | 1 skipped (2), at b0c0cdcac2558808fcf69800e84c8f53cb8f36de
- Not consumed: the plan phase found that the selector carries three states, `pass-on`, `worker` and `off`, so the row is `blocked` on `CR-20260925-0285` before any mutation run. The entry above stays as the handover for the `pass-on` state once the row is re-scoped

### TDD-0036

- TDD-ID: TDD-0036
- Layer: Integration
- Test file: packages/qfai/tests/integration/stageSkillEntryCheckSpec0001.test.ts
- Selector: TC-0001-0027: a work order that matches no issued one edits nothing and is refused
- TC-ref: TC-0001-0027
- Branch: falsifiability — the shipped baseline already states the `error` state, so the case passed on its first run
- Predicate to break: packages/qfai/assets/init/.qfai/assistant/constitution/shared-skill-operating-baseline.md:176, the `error` row of the `## Workflow Run Entry Check (Mandatory)` table, cell `Edit nothing, and return the refusal to the harness`
- Mutation: on line 176, `Edit nothing, and return the refusal to the harness` to `Edit nothing, and return the refusal to the operator`, with one trailing space of the cell's padding removed
- Why it fails: ``rowOf(..., "`error`")`` still returns line 176, and the row still holds `matches no issued one` and `Edit nothing`, so lines 43 and 44 pass.
  The refusal now goes to the operator rather than the harness, so `expect(mismatch).toMatch(/return the refusal to the harness/i)` fails as an assertion at `tests/integration/stageSkillEntryCheckSpec0001.test.ts:45`
- Type check: the edit is to a Markdown file, so no type-checked file changes
- Other rows: `TDD-0035` still passes, because its case reads the `pass-on`, `worker` and `off` rows on lines 173, 175 and 177. `tests/integration/sdd/entryCheck.test.ts` matches `return the refusal to the harness` in `skills/qfai-sdd/references/orchestrated-mode.md`, not in this file, so it is unaffected
- Classification command: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/stageSkillEntryCheckSpec0001.test.ts -t "TC-0001-0027: a work order that matches no issued one edits nothing and is refused" (run from `packages/qfai`)
- Classification result: Test Files 1 passed (1); Tests 1 passed | 1 skipped (2), at b0c0cdcac2558808fcf69800e84c8f53cb8f36de

#### Round 1

- Round 1: Satisfied-by: packages/qfai/assets/init/.qfai/assistant/constitution/shared-skill-operating-baseline.md, `## Workflow Run Entry Check (Mandatory)` — the `error` row, which says a skill handed a QFAI work order that matches no issued one edits nothing and returns the refusal to the harness
- Round 1: Falsifiability command: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/stageSkillEntryCheckSpec0001.test.ts -t "TC-0001-0027: a work order that matches no issued one edits nothing and is refused" (run from `packages/qfai`)
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 1 skipped (2). The row's case fails on ``AssertionError: expected '| `error`   | `active`          | Han…' to match /return the refusal to the harness/i`` at `tests/integration/stageSkillEntryCheckSpec0001.test.ts:45:22`

The edit, line 176, with one trailing space of the cell's padding removed:

```diff
-| `error`   | `active`          | Handed a QFAI work order that matches no issued one  | Edit nothing, and return the refusal to the harness                                                                                          |
+| `error`   | `active`          | Handed a QFAI work order that matches no issued one  | Edit nothing, and return the refusal to the operator                                                                                         |
```

- Round 1: Falsifiability revision: working-tree+aa99dee9b05c3cca23f2007b3211e63d782491c913d9540c0bdf61256bbb6052
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 9da494986674153a87a7553152653399734dfed602662b2bdeaf9e2418e03c1a
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/stageSkillEntryCheckSpec0001.test.ts
```

- Round 1: Revision: 22822f5a5efd828b06a40a30175d963a3bbe27d8
- Round 1: GREEN command: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/stageSkillEntryCheckSpec0001.test.ts -t "TC-0001-0027: a work order that matches no issued one edits nothing and is refused" (run from `packages/qfai`)
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 1 skipped (2): the row's case passes and the file's other case, `TC-0001-0026`, is the one `-t` leaves out. Run after `git checkout -- packages/qfai/assets/init/.qfai/assistant/constitution/shared-skill-operating-baseline.md`, which restores the file as it is at that revision

- Refactor verify command: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/stageSkillEntryCheckSpec0001.test.ts (run from `packages/qfai`)
- Refactor verify result: Test Files 1 passed (1); Tests 2 passed (2). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: 22822f5a5efd828b06a40a30175d963a3bbe27d8
- qa-gatekeeper: PASS x2 (qa-gatekeeper#1, Round 1 — RED phase gate on the mutated tree working-tree+aa99dee9b05c3cca23f2007b3211e63d782491c913d9540c0bdf61256bbb6052; qa-gatekeeper#2 — build-phase GREEN + oracle proof at 233cb417abb855bdc2e90138ee292bc7c2c0e82e, whose code tree is 22822f5a5efd828b06a40a30175d963a3bbe27d8)
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS — RED phase gate with the mutation in place (baseline line 176, refusal to the operator); AssertionError at stageSkillEntryCheckSpec0001.test.ts:45:22; the TC-0001-0026 case still passes; Falsifiability revision and RED test hash recompute; qa-gatekeeper#2 PASS — build-phase GREEN and oracle proof after the revert: selector 1 passed | 1 skipped, file 2/2, no diff under packages/ against 22822f5a5

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0001.md` (committed). Totals: ✅ 75 / ⚠️ 50 / ❌ 153.

## Work Orders Summary

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | test-design-analyst | test-design-analyst#2 | Write the Coverage Depth Matrix for spec-0001 | 02_User-stories.md, 04_Business-Rules.md, 06_Test-Cases.md, the annotated tests | coverage-depth-spec-0001.md | PASS |
| 2 | acceptance-test-engineer | acceptance-test-engineer | Hand over `TDD-0035` and `TDD-0036` on the falsifiability branch | the test file, the shipped baseline | #tdd-0035, #tdd-0036 | PASS |
| 3 | - | n/a | grilling(-@2026-09-25T10:14:05.606Z/none): none | - | - | PASS |

## Cross-spec obligations

None.

## Execution logs

Recorded per row above.

## Gaps / Open risks

- `TDD-0035` is `blocked` on `CR-20260925-0285`. Its handover entry stands for the `pass-on` state once the row is re-scoped.
- The matrix records findings this run does not act on: six places where the spec and the shipped files disagree, 24 test cases whose one test reads spec-0001's own text, and ten stories with no E2E test. See its `## Findings`.
- This file does not close the `/qfai-atdd` stage for spec-0001. No stage review pack was opened.

## Final status (PASS / PASS with cross-spec obligations / FAIL) + who confirmed

FAIL for the stage: only `TDD-0036` is taken through its reviews in this run, and `TDD-0035` waits on a Change Request. The stage review is not run.
