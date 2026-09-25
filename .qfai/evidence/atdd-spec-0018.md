# ATDD Evidence: spec-0018

## Objective

Take `TDD-0376`, `TDD-0377` and `TDD-0378` through the reviewed cycle. They
were closed at `exception` under `DR-0298`, which waived their per-row reviews.
They cover `BR-0018-0094` and `BR-0018-0095`: an absent `workflow.mode` means
`active`, and a mode outside the three is refused.

## Inputs reviewed (files/paths)

- `.qfai/specs/spec-0018/03_Acceptance-Criteria.md`
- `.qfai/specs/spec-0018/04_Business-Rules.md`
- `.qfai/specs/spec-0018/05_Examples.md`
- `.qfai/specs/spec-0018/06_Test-Cases.md`
- `.qfai/specs/spec-0018/tdd/test-list.md`
- `.qfai/evidence/implement-spec-0018.md` (the earlier close of each row)
- `packages/qfai/tests/integration/workflow/mode.test.ts`
- `packages/qfai/tests/integration/workflow/anInvalidModeIsRefused.test.ts`
- `packages/qfai/tests/integration/workflow/workflowProject.ts`
- `packages/qfai/src/core/config.ts`
- `packages/qfai/src/cli/commands/workflow.ts`

## Decisions made (with rationale)

- Every row takes the falsifiability branch. The tests and the production code
  both exist, and each case passed on its first run after the reopen.
- Each mutation changes one line of the predicate the row's case names, and
  fails that row alone: the other two rows pass on each mutated tree.
- Each mutation is committed alone and reverted by the next commit, so each
  falsifiability run has a git revision of its own.

## Grilling Session

### /qfai-implement — run started 2026-09-25T15:43:01.083Z

Preflight: confidence high

No session opened. The three rows, their test cases and their business rules
are settled input, and the tests and the code already exist. Each case passes
at the reopen, which routes it to the falsifiability branch without a decision
to make.

## Work performed (what changed, where)

- No production or test file changed at the final revision. The three cases and
  the code that satisfies them already exist.
- Each row's mutation was committed, run and reverted. The records are in the
  row's entry below.

## Commands executed + key outputs

| Command                                                                                                                                                                          | Result                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/mode.test.ts`                                                                 | Test Files 1 passed (1); Tests 2 passed (2) |
| `cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/anInvalidModeIsRefused.test.ts`                                               | Test Files 1 passed (1); Tests 1 passed (1) |
| Each row's selector under its mutation                                                                                                                                           | Recorded in the row's `Round 1`             |

## Test volume estimate

Three existing cases in two test files. No case is added.

## Coverage obligations checklist

- `TC-0018-0173`, `TC-0018-0174`: one annotated case each, in `mode.test.ts`.
- `TC-0018-0175`: one annotated case, in `anInvalidModeIsRefused.test.ts`.
- `BR-0018-0094` and `BR-0018-0095`: every test case that traces to them has a
  row in this entry.

## Ledger rows advanced

The three rows were reopened `exception` -> `todo`. Every case passed on its
first run, so every row takes the falsifiability branch.

| TDD-ID     | Obligation     | Layer       | RED provenance | Entry                 |
| ---------- | -------------- | ----------- | -------------- | --------------------- |
| `TDD-0376` | `TC-0018-0173` | Integration | falsifiability | [TDD-0376](#tdd-0376) |
| `TDD-0377` | `TC-0018-0174` | Integration | falsifiability | [TDD-0377](#tdd-0377) |
| `TDD-0378` | `TC-0018-0175` | Integration | falsifiability | [TDD-0378](#tdd-0378) |

### TDD-0376

- TDD-ID: TDD-0376
- Layer: Integration
- Test file: packages/qfai/tests/integration/workflow/mode.test.ts
- Selector: TC-0018-0173 (TDD-0376): Built CLI start with no workflow key in qfai
- TC-ref: TC-0018-0173
- Reopened: `exception` -> `todo` at 10c72c9ab0838eee1f5cf395e038277ed0c51d70, to take the qa-gatekeeper and reviewer turns the row closed without. `DR-0298` stays in `DR-ID` as the record of why it was parked.
- Branch: falsifiability — `readWorkflowMode` already reads an absent `workflow` key as `active`, so the case passed on its first run
- Predicate to break: packages/qfai/src/core/config.ts:396, `readWorkflowMode` — `if (workflow === undefined) return "active";`, which puts `active` in force when the config has no `workflow` key
- Mutation: `return "active";` to `return "off";` on that line, committed alone as 8bcbdcf33d3f0426830f5592e5cb7f7e75fedb74 and reverted by the commit after it
- Why it fails: with no `workflow` key the mode in force becomes `off`, so `start` creates no run and `status` reports `off`, and the `toEqual` on `{ created, mode }` fails
- Type check: `"off"` is a member of `WorkflowMode`; `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` in `packages/qfai` exits 0 on the mutated tree
- Other rows: `TDD-0377` and `TDD-0378` still pass on the mutated tree
- Classification command: cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/mode.test.ts -t "TC-0018-0173 \(TDD-0376\): Built CLI start with no workflow key in qfai"
- Classification result: Test Files 1 passed (1); Tests 1 passed | 1 skipped (2), at 10c72c9ab0838eee1f5cf395e038277ed0c51d70

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/core/config.ts, `readWorkflowMode` — an absent `workflow` key reads as `active`
- Round 1: Falsifiability command: cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/mode.test.ts -t "TC-0018-0173 \(TDD-0376\): Built CLI start with no workflow key in qfai"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 1 skipped (2). The row's case fails on `AssertionError: expected { created: false, mode: 'off' } to deeply equal { created: true, mode: 'active' }` at `tests/integration/workflow/mode.test.ts:19:78`, run after `pnpm -C packages/qfai build` on the mutated tree

The edit, at line 396:

```diff
-  if (workflow === undefined) return "active";
+  if (workflow === undefined) return "off";
```

- Round 1: Falsifiability revision: 8bcbdcf33d3f0426830f5592e5cb7f7e75fedb74
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 92871fa60b25aa4a9ffec0ec76c3f3815785187ca71bb9b4fe9e3cc3c889828b
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/workflow/mode.test.ts
packages/qfai/tests/integration/workflow/workflowProject.ts
```

- Round 1: Revision: af0b531172dcc2eddb7460d518b41bb30ad8fb38
- Round 1: GREEN command: cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/mode.test.ts -t "TC-0018-0173 \(TDD-0376\): Built CLI start with no workflow key in qfai"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 1 skipped (2). Taken after `pnpm -C packages/qfai build`, on a tree whose `packages/qfai/src` equals 10c72c9ab0838eee1f5cf395e038277ed0c51d70

- Refactor verify command: cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/mode.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 2 passed (2). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: af0b531172dcc2eddb7460d518b41bb30ad8fb38

- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the falsifiability mutation run, reviewed revision 8bcbdcf33d3f0426830f5592e5cb7f7e75fedb74; qa-gatekeeper#2 PASS, GREEN, refactor verify and the mutation as oracle proof, reviewed revision af0b531172dcc2eddb7460d518b41bb30ad8fb38

- Round 1: reviewer verdict (attempt 1): PASS
- Round 1: Review pack (attempt 1): .qfai/review/review-20260926020000001 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): f787066f2508f37723a916fdbf17f60737904a0d89ef3cc74d1991608fde4ac8
- Spec review: PASS
- Spec reviewed revision: af0b531172dcc2eddb7460d518b41bb30ad8fb38
- Spec audited evidence hash: 77bfe405d5fb589d0b7250367901f537705dbfc400de034813857f5e7b82f506
- Spec review pack: .qfai/review/review-20260926020000001 <!-- qfai:not-a-citation -->
- Spec review pack seal: f787066f2508f37723a916fdbf17f60737904a0d89ef3cc74d1991608fde4ac8
- Code quality review: PASS
- Code quality reviewed revision: af0b531172dcc2eddb7460d518b41bb30ad8fb38
- Code quality audited evidence hash: 77bfe405d5fb589d0b7250367901f537705dbfc400de034813857f5e7b82f506
- Code quality review pack: .qfai/review/review-20260926020000001 <!-- qfai:not-a-citation -->
- Code quality review pack seal: f787066f2508f37723a916fdbf17f60737904a0d89ef3cc74d1991608fde4ac8
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: af0b531172dcc2eddb7460d518b41bb30ad8fb38
- Checkpoint verification command: cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/mode.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 2 passed (2). Off a checkpoint boundary, since other rows of spec-0018 are still open, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: af0b531172dcc2eddb7460d518b41bb30ad8fb38
- Checkpoint verification seal: 430bd2cfde9900a07e22668cd6e55c0fef7cae206acd2cf25b224056524e3ec0

### TDD-0377

- TDD-ID: TDD-0377
- Layer: Integration
- Test file: packages/qfai/tests/integration/workflow/mode.test.ts
- Selector: TC-0018-0174 (TDD-0377): npx qfai validate with workflow
- TC-ref: TC-0018-0174
- Reopened: `exception` -> `todo` at 10c72c9ab0838eee1f5cf395e038277ed0c51d70, to take the qa-gatekeeper and reviewer turns the row closed without. `DR-0298` stays in `DR-ID` as the record of why it was parked.
- Branch: falsifiability — `loadConfig` already raises the `workflow.mode` config issue for a mode outside the three, so the case passed on its first run
- Predicate to break: packages/qfai/src/core/config.ts:375, `loadConfig` — `if (readWorkflowMode(parsed) === null) {`, which raises the `QFAI_CONFIG_INVALID` issue naming `workflow.mode` when the value is none of the three
- Mutation: `=== null` to `=== "off"` on that line, committed alone as 07dbf529305d1ee19a675a5b68783ffeeabbb483 and reverted by the commit after it
- Why it fails: `always` reads as `null`, which no longer matches the condition, so no issue is raised and the severities collected are `[]` instead of `["error"]`
- Type check: `"off"` is a member of `WorkflowMode | null`; `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` in `packages/qfai` exits 0 on the mutated tree
- Other rows: `TDD-0376` and `TDD-0378` still pass on the mutated tree
- Classification command: cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/mode.test.ts -t "TC-0018-0174 \(TDD-0377\): npx qfai validate with workflow"
- Classification result: Test Files 1 passed (1); Tests 1 passed | 1 skipped (2), at 10c72c9ab0838eee1f5cf395e038277ed0c51d70

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/core/config.ts, `loadConfig` — a mode outside the three raises one `QFAI_CONFIG_INVALID` issue of severity error naming `workflow.mode`
- Round 1: Falsifiability command: cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/mode.test.ts -t "TC-0018-0174 \(TDD-0377\): npx qfai validate with workflow"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 1 skipped (2). The row's case fails on `AssertionError: expected [] to deeply equal [ 'error' ]` at `tests/integration/workflow/mode.test.ts:33:49`, run after `pnpm -C packages/qfai build` on the mutated tree

The edit, at line 375:

```diff
-  if (readWorkflowMode(parsed) === null) {
+  if (readWorkflowMode(parsed) === "off") {
```

- Round 1: Falsifiability revision: 07dbf529305d1ee19a675a5b68783ffeeabbb483
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 92871fa60b25aa4a9ffec0ec76c3f3815785187ca71bb9b4fe9e3cc3c889828b
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/workflow/mode.test.ts
packages/qfai/tests/integration/workflow/workflowProject.ts
```

- Round 1: Revision: af0b531172dcc2eddb7460d518b41bb30ad8fb38
- Round 1: GREEN command: cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/mode.test.ts -t "TC-0018-0174 \(TDD-0377\): npx qfai validate with workflow"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 1 skipped (2). Taken after `pnpm -C packages/qfai build`, on a tree whose `packages/qfai/src` equals 10c72c9ab0838eee1f5cf395e038277ed0c51d70

- Refactor verify command: cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/mode.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 2 passed (2). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: af0b531172dcc2eddb7460d518b41bb30ad8fb38

- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the falsifiability mutation run, reviewed revision 07dbf529305d1ee19a675a5b68783ffeeabbb483; qa-gatekeeper#2 PASS, GREEN, refactor verify and the mutation as oracle proof, reviewed revision af0b531172dcc2eddb7460d518b41bb30ad8fb38

- Round 1: reviewer verdict (attempt 1): PASS
- Round 1: Review pack (attempt 1): .qfai/review/review-20260926020000002 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): 7c28e70f12a4602c424fe09e762fbaca43858b7e61d2e0b6e8b99e66317e4624
- Spec review: PASS
- Spec reviewed revision: af0b531172dcc2eddb7460d518b41bb30ad8fb38
- Spec audited evidence hash: db4fe217933deb7ef390815776e713070433d23e6bf7148e8d007b60a1cae8d7
- Spec review pack: .qfai/review/review-20260926020000002 <!-- qfai:not-a-citation -->
- Spec review pack seal: 7c28e70f12a4602c424fe09e762fbaca43858b7e61d2e0b6e8b99e66317e4624
- Code quality review: PASS
- Code quality reviewed revision: af0b531172dcc2eddb7460d518b41bb30ad8fb38
- Code quality audited evidence hash: db4fe217933deb7ef390815776e713070433d23e6bf7148e8d007b60a1cae8d7
- Code quality review pack: .qfai/review/review-20260926020000002 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 7c28e70f12a4602c424fe09e762fbaca43858b7e61d2e0b6e8b99e66317e4624
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: af0b531172dcc2eddb7460d518b41bb30ad8fb38
- Checkpoint verification command: cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/mode.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 2 passed (2). Off a checkpoint boundary, since other rows of spec-0018 are still open, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: af0b531172dcc2eddb7460d518b41bb30ad8fb38
- Checkpoint verification seal: 430bd2cfde9900a07e22668cd6e55c0fef7cae206acd2cf25b224056524e3ec0

### TDD-0378

- TDD-ID: TDD-0378
- Layer: Integration
- Test file: packages/qfai/tests/integration/workflow/anInvalidModeIsRefused.test.ts
- Selector: TC-0018-0175 (TDD-0378): Built CLI start with workflow
- TC-ref: TC-0018-0175
- Reopened: `exception` -> `todo` at 10c72c9ab0838eee1f5cf395e038277ed0c51d70, to take the qa-gatekeeper and reviewer turns the row closed without. `DR-0298` stays in `DR-ID` as the record of why it was parked.
- Branch: falsifiability — `start` already refuses a mode outside the three before it writes anything, so the case passed on its first run
- Predicate to break: packages/qfai/src/cli/commands/workflow.ts:687, `start` — `if (mode === null) return refuse(null, INVALID_MODE);`, which refuses `fail-closed` with cause `invalid-mode` when the mode is none of the three
- Mutation: `mode === null` to `mode === "off"` on that line, committed alone as 42a118538785942d612917133dea6cd6b682b3e2 and reverted by the commit after it
- Why it fails: `always` reads as `null`, which now falls through to the branch for a mode other than `active`, so `start` exits 0 with no error, and the `toEqual` on `{ exit, code, cause, runDirs }` fails
- Type check: `"off"` is a member of `WorkflowMode | null`; `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` in `packages/qfai` exits 0 on the mutated tree
- Other rows: `TDD-0376` and `TDD-0377` still pass on the mutated tree
- Classification command: cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/anInvalidModeIsRefused.test.ts -t "TC-0018-0175 \(TDD-0378\): Built CLI start with workflow"
- Classification result: Test Files 1 passed (1); Tests 1 passed (1), at 10c72c9ab0838eee1f5cf395e038277ed0c51d70

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/cli/commands/workflow.ts, `start` — a mode outside the three is refused `fail-closed` with cause `invalid-mode` and exit 2, before any run directory is written
- Round 1: Falsifiability command: cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/anInvalidModeIsRefused.test.ts -t "TC-0018-0175 \(TDD-0378\): Built CLI start with workflow"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed (1). The row's case fails on `AssertionError: expected { exit: +0, code: undefined, …(2) } to deeply equal { exit: 2, code: 'fail-closed', …(2) }` at `tests/integration/workflow/anInvalidModeIsRefused.test.ts:29:6`; `cause` is `undefined` where `invalid-mode` is expected, and `runDirs` is `[]` on both sides. Run after `pnpm -C packages/qfai build` on the mutated tree

The edit, at line 687:

```diff
-  if (mode === null) return refuse(null, INVALID_MODE);
+  if (mode === "off") return refuse(null, INVALID_MODE);
```

- Round 1: Falsifiability revision: 42a118538785942d612917133dea6cd6b682b3e2
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 58670d8249daadced98d75acec15c41ed5b72abeebabd95e9e80153d8ccf8425
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/workflow/anInvalidModeIsRefused.test.ts
packages/qfai/tests/integration/workflow/workflowProject.ts
```

- Round 1: Revision: af0b531172dcc2eddb7460d518b41bb30ad8fb38
- Round 1: GREEN command: cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/anInvalidModeIsRefused.test.ts -t "TC-0018-0175 \(TDD-0378\): Built CLI start with workflow"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed (1). Taken after `pnpm -C packages/qfai build`, on a tree whose `packages/qfai/src` equals 10c72c9ab0838eee1f5cf395e038277ed0c51d70

- Refactor verify command: cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/anInvalidModeIsRefused.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 1 passed (1). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: af0b531172dcc2eddb7460d518b41bb30ad8fb38

- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the falsifiability mutation run, reviewed revision 42a118538785942d612917133dea6cd6b682b3e2; qa-gatekeeper#2 PASS, GREEN, refactor verify and the mutation as oracle proof, reviewed revision af0b531172dcc2eddb7460d518b41bb30ad8fb38

- Round 1: reviewer verdict (attempt 1): PASS
- Round 1: Review pack (attempt 1): .qfai/review/review-20260926020000003 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): b42d347affa6d2a696147f58332ce6ba99d302083839ff0fbac650e22294b7fb
- Spec review: PASS
- Spec reviewed revision: af0b531172dcc2eddb7460d518b41bb30ad8fb38
- Spec audited evidence hash: b2c21650e95bdd71c53918ca2741c3ec1d7bf8e6a150d3f8993bcd5f14b1b0c0
- Spec review pack: .qfai/review/review-20260926020000003 <!-- qfai:not-a-citation -->
- Spec review pack seal: b42d347affa6d2a696147f58332ce6ba99d302083839ff0fbac650e22294b7fb
- Code quality review: PASS
- Code quality reviewed revision: af0b531172dcc2eddb7460d518b41bb30ad8fb38
- Code quality audited evidence hash: b2c21650e95bdd71c53918ca2741c3ec1d7bf8e6a150d3f8993bcd5f14b1b0c0
- Code quality review pack: .qfai/review/review-20260926020000003 <!-- qfai:not-a-citation -->
- Code quality review pack seal: b42d347affa6d2a696147f58332ce6ba99d302083839ff0fbac650e22294b7fb
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: af0b531172dcc2eddb7460d518b41bb30ad8fb38
- Checkpoint verification command: cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/workflow/anInvalidModeIsRefused.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 1 passed (1). Off a checkpoint boundary, since other rows of spec-0018 are still open, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: af0b531172dcc2eddb7460d518b41bb30ad8fb38
- Checkpoint verification seal: 4333de8d3aa954beaf8453f7e54acbb9a5ec641972d2e072a3483a79da1dd6d4

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0018.md` (committed). Totals: ✅ 820 / ⚠️ 42 / ❌ 6.

These are the matrix depth cells (✅ 644 / ⚠️ 0 / ❌ 6, with 1861 not
applicable) and the business rule cells (✅ 176 / ⚠️ 42 / ❌ 0, with 169 not
applicable). `Status` is a row verdict and is outside every total.

## Work Orders Summary

### Rows for the /qfai-implement run started 2026-09-25T15:43:01.083Z

| Step | Role (sub-agent) | Agent instance     | Task title                                                                                       | Input (refs)          | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | ------------------ | ------------------------------------------------------------------------------------------------ | --------------------- | ------------- | ---------------------------- |
| 1    | -                | n/a                | grilling(-@2026-09-25T15:43:01.083Z/none): none                                                  | -                     | -             | PASS                         |
| 2    | backend-engineer | backend-engineer#1 | Falsifiability runs for `TDD-0376` to `TDD-0378`, each committed alone and reverted to its GREEN | #tdd-0376 to #tdd-0378 | Round 1       | PASS                         |
| 3    | backend-engineer | backend-engineer#1 | Refactor verify for `TDD-0376` to `TDD-0378` at the final revision                               | #tdd-0376 to #tdd-0378 | Refactor verify fields | PASS                |
| 4 | qa-gatekeeper | qa-gatekeeper#1 | RED phase gate on each falsifiability mutation run, `TDD-0376` to `TDD-0378` | #tdd-0376 to #tdd-0378, 8bcbdcf33, 07dbf5293, 42a118538 | qa-gatekeeper fields | PASS |
| 5 | qa-gatekeeper | qa-gatekeeper#2 | GREEN, refactor verify and oracle proof, `TDD-0376` to `TDD-0378` | #tdd-0376 to #tdd-0378, af0b531172dcc2eddb7460d518b41bb30ad8fb38 | qa-gatekeeper fields | PASS |

| 6 | completion-reviewer | completion-reviewer#1 | Spec review, `TDD-0376` | #tdd-0376, spec-0018, af0b531172dcc2eddb7460d518b41bb30ad8fb38 | review-20260926020000001 R01 <!-- qfai:not-a-citation --> | PASS |
| 7 | implementation-reviewer | implementation-reviewer#1 | Code quality review, `TDD-0376` | #tdd-0376, test and production predicate, af0b531172dcc2eddb7460d518b41bb30ad8fb38 | review-20260926020000001 R02 <!-- qfai:not-a-citation --> | PASS |
| 8 | completion-reviewer | completion-reviewer#2 | Spec review, `TDD-0377` | #tdd-0377, spec-0018, af0b531172dcc2eddb7460d518b41bb30ad8fb38 | review-20260926020000002 R01 <!-- qfai:not-a-citation --> | PASS |
| 9 | implementation-reviewer | implementation-reviewer#2 | Code quality review, `TDD-0377` | #tdd-0377, test and production predicate, af0b531172dcc2eddb7460d518b41bb30ad8fb38 | review-20260926020000002 R02 <!-- qfai:not-a-citation --> | PASS |
| 10 | completion-reviewer | completion-reviewer#3 | Spec review, `TDD-0378` | #tdd-0378, spec-0018, af0b531172dcc2eddb7460d518b41bb30ad8fb38 | review-20260926020000003 R01 <!-- qfai:not-a-citation --> | PASS |
| 11 | implementation-reviewer | implementation-reviewer#3 | Code quality review, `TDD-0378` | #tdd-0378, test and production predicate, af0b531172dcc2eddb7460d518b41bb30ad8fb38 | review-20260926020000003 R02 <!-- qfai:not-a-citation --> | PASS |
| 12 | orchestrator | orchestrator | Checkpoint verification for `TDD-0376` to `TDD-0378`, off a checkpoint boundary | #tdd-0376 to #tdd-0378 | Checkpoint verification fields | PASS |

## Test results summary

| Suite                                                      | Result                                      |
| ---------------------------------------------------------- | ------------------------------------------- |
| `tests/integration/workflow/mode.test.ts`                  | Test Files 1 passed (1); Tests 2 passed (2) |
| `tests/integration/workflow/anInvalidModeIsRefused.test.ts` | Test Files 1 passed (1); Tests 1 passed (1) |

Both at af0b531172dcc2eddb7460d518b41bb30ad8fb38, after `pnpm -C packages/qfai build`.

## Cross-spec obligations

None.

## Execution logs

Recorded per row above.

## Gaps / Open risks

- The other Integration rows of spec-0018 that were closed under `DR-0298` are
  still at `exception`. This run covers the three rows of `BR-0018-0094` and
  `BR-0018-0095` only.
- The reviewers raised advisory findings, none blocking. Each is in its pack.
  - `TDD-0378`'s `Owning module` names `packages/qfai/src/core/workflow/decide.ts`.
    The refusal is in `start` in `packages/qfai/src/cli/commands/workflow.ts`,
    and the Plan puts the rule under `packages/qfai/src/core/config.ts`. The
    cell belongs to `/qfai-sdd`.
  - The CLI-VAL `## Workflow mode setting` clause asks the message to name the
    three values. No test asserts that half, and `TC-0018-0174` does not ask
    for it.
  - `TC-0018-0175` tests one invalid value. A `workflow` value that is not a
    mapping, and a `mode` that is not a string, reach the same refusal with no
    case of their own.
  - The skill does not say which `Satisfied-by` form a row reopened by
    `exception` -> `todo` takes when its own earlier cycle wrote the predicate,
    nor whether that row needs a fresh `/qfai-atdd` handover. These entries
    classify the rows here and name the production symbol.
  - `TC-0018-0173` catches a refused `start` into a boolean, and
    `TC-0018-0174` writes its config after `minimalProject` instead of passing
    it in. Both are test tidy-ups.

## Final status

PASS for the three rows, confirmed by the orchestrator. `TDD-0376`, `TDD-0377`
and `TDD-0378` are `done`: each carries a PASS from `qa-gatekeeper`,
`completion-reviewer` and `implementation-reviewer`. They leave the
`DR-0298` waiver. The stage stays open for the Integration rows still at
`exception`.
