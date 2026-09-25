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
| `TDD-0036` | `TC-0001-0027` | Integration | falsifiability | todo   |

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

## Coverage Depth Matrix

## Work Orders Summary

## Cross-spec obligations

None.

## Execution logs

Recorded per row above.

## Gaps / Open risks

## Final status (PASS / PASS with cross-spec obligations / FAIL) + who confirmed
