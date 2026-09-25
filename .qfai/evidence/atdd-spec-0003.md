# ATDD Evidence: spec-0003

## Objective

Bind the three shipped-workflow test cases `TC-0003-0056`, `-0057` and `-0058` to
integration tests under `tests/integration/**`, and hand their seven ledger rows
to `/qfai-implement` on the falsifiability path. `CR-20260923-0003` restated the
cases and seeded `TDD-0092` for the fourth verify bullet of `TC-0003-0058`; this
run is its approved action 2.

## Inputs reviewed (files/paths)

- `.qfai/decisions/CR-20260923-0003-spec-0003-states-the-document-lane-as-it-was-before-change-scoping.md`
- `.qfai/specs/spec-0003/06_Test-Cases.md` (`TC-0003-0056` to `-0058`), `04_Business-Rules.md` (`BR-0003-0047`, `-0048`), `05_Examples.md` (`EX-0003-0050`, `-0051`)
- `.qfai/specs/spec-0003/tdd/test-list.md`
- `.qfai/contracts/cli/shipped-workflows.md` §5
- `packages/qfai/assets/init/root/.github/workflows/qfai-docs.yml`, `qfai-validate.yml`
- `packages/qfai/tests/e2e/spec0003ShippedWorkflowSetE2E.test.ts`, `packages/qfai/tests/integration/shippedWorkflowPortability.test.ts`
- `.qfai/assistant/catalog/test-layers.md`

## Decisions made (with rationale)

- **The four cases of `TC-0003-0056` and `-0057` move into one integration module**,
  `packages/qfai/tests/integration/shippedWorkflowCheckIndependence.test.ts`. Both
  cases declare `Level: integration`, whose annotation `QFAI-ATDD-112` requires under
  `tests/integration/**` and `QFAI-ATDD-122` refuses under `tests/e2e/**`.
- **Each file keeps its own set-up.** The delivered tree, the job reader and the step
  runner are local to the integration module and to the end-to-end file. A shared
  helper would have two consumers, and the repository extracts one on its third.
- **All seven rows take branch 2, falsifiability.** Each test and the behaviour it
  checks shipped in the same change, so no natural RED can be observed.
- **`TDD-0063` and `TDD-0092` name the checker as their predicate.** Each test plants
  its own copy of the aggregate, so no change to a shipped file can fail it. The code
  the case exercises is the check in `aggregateFailureViolations`, and that is where
  the discriminating mutation sits.
- **`TDD-0001`'s test is the row's own integration case, rewritten.** The two tests
  `CR-20260923-0011` names assert the clause, but neither sits in
  `tests/integration/**`, where `TC-0003-0001`'s `Level` routes it. The reasoning is
  in the `TDD-0001` entry.

## Grilling Session

### /qfai-atdd — run started 2026-09-23T03:14:36.552Z

Preflight: confidence high

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
| S1 | adopted | 2026-09-23T03:16:00Z | d842484798a82f6de425bf892e17e7b36d2e196e | 2026-09-23T03:17:30Z | where the four integration-level cases live, and where their set-up comes from | empty | none in flight | 1 | 0 | 0 |

### /qfai-implement — run started 2026-09-23T03:29:00.000Z

Preflight: confidence high

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
| S1 | adopted | 2026-09-23T03:53:00Z | working-tree+0c16e336d92d65224ec37609bd8d897cbb70d42c505d6c0d0adf6c102605203f | 2026-09-23T03:53:07Z | a falsifiability predicate that lives in the row's own Test file, which step 3c assumes is production code | empty | none in flight | 1 | 0 | 0 |
| S2 | adopted | 2026-09-23T04:08:10Z | 6368454b0f56a50611aa309f82eb80e8cc35b758 | 2026-09-23T04:08:20Z | how to answer the code quality REVISE on the two-consumer workflow-tree helper | empty | none in flight | 1 | 0 | 0 |

### /qfai-atdd — run started 2026-09-23T08:28:13.966Z

Preflight: confidence high

No session opened. `CR-20260923-0007` fixes the row, the verify bullet it covers,
the test file and the two job shapes, and nothing surfaced during the run that the
spec or the change request leaves open.


### /qfai-implement — run started 2026-09-23T08:31:57.000Z

Preflight: confidence high

No session was opened: `CR-20260923-0007` settles every decision this row needs.

### /qfai-atdd — run started 2026-09-23T11:24:46.722Z

Preflight: confidence high

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
| S1 | adopted | 2026-09-23T11:27:41Z | working-tree+b6717d99336497714758bb9eafe114d2ddc4f4c194e332da052432f02b99161f | 2026-09-23T11:28:00Z | neither test the change request names for TDD-0001 sits in the directory TC-0003-0001's Level routes to | empty | none in flight | 1 | 0 | 0 |

### /qfai-implement — run started 2026-09-23T11:42:45.972Z

Preflight: confidence high

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
| S1 | adopted | 2026-09-23T11:44:45Z | 0d2064bd1dd3e976ae8e39ea31b9c04f6e180209 | 2026-09-23T11:44:51Z | TDD-0037 is done under a replaced test, and the one exit from done, the upstream reset, is refused for a row the approving CR's actions do not name | empty | none in flight | 1 | 0 | 0 |

### /qfai-atdd — run started 2026-09-25T03:20:00.000Z

Preflight: confidence high

No session opened. `CR-20260925-0011` fixes the row, the test case it covers and
the text it checks, and nothing surfaced during the run that the spec or the
change request leaves open.

### /qfai-implement — run started 2026-09-25T03:24:00.000Z

Preflight: confidence high

No session was opened: `CR-20260925-0011` settles every decision this row needs.

## Work performed (what changed, where)

- New `packages/qfai/tests/integration/shippedWorkflowCheckIndependence.test.ts`: the
  document-check and validation-profile cases, titles unchanged, annotated
  `QFAI:SPEC-0003:TC-0003-0056` / `-0057`. It carries its own `project`, `jobsOf`
  and `runStep`.
- `packages/qfai/tests/e2e/spec0003ShippedWorkflowSetE2E.test.ts`: the two moved
  blocks removed; the eight `US-*` describes and their set-up stay.
- `packages/qfai/tests/integration/shippedWorkflowPortability.test.ts`: the three
  `TC-0003-0058` cases annotated `QFAI:SPEC-0003:TC-0003-0058`.
- `packages/qfai/tsconfig.tests.json`: the new file listed.
- `packages/qfai/tests/integration/shippedWorkflowPortability.test.ts`: a new
  `TDD-0093` `it.each` in the `TC-0003-0058` describe, annotated
  `QFAI:SPEC-0003:TC-0003-0058`, with one case per job shape of verify bullet 5.
  `CR-20260923-0007` asked for it.
- `packages/qfai/tests/integration/shippedWorkflowInertness.test.ts`: the `TDD-0037`
  describe and its count case renamed to the counts the case asserts. No assertion
  changed. `CR-20260923-0011` asked for it.
- `packages/qfai/tests/integration/initSpec0003.test.ts`: the `TC-0003-0001` case
  now runs init into an empty directory and asserts all three verify bullets, for the
  `TDD-0001` row that `CR-20260923-0011` reset.

- New `packages/qfai/tests/integration/initCopilotLegacyWindow.test.ts`: the
  `TC-0003-0059` case for `TDD-0094`, annotated `QFAI:SPEC-0003:TC-0003-0059`, and
  listed in `packages/qfai/tsconfig.tests.json`. `tests/integration/qfai-traceability.md`
  carries the case. `CR-20260925-0011` asked for it.

## Commands executed + key outputs

```text
pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts tests/e2e/spec0003ShippedWorkflowSetE2E.test.ts tests/integration/shippedWorkflowPortability.test.ts
  Test Files 3 passed (3); Tests 66 passed (66)
npx tsc --noEmit -p packages/qfai/tsconfig.tests.json   -> exit 0
```

For `TDD-0093`:

```text
pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts
  Test Files 1 passed (1); Tests 23 passed (23)
pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "TC-0003-0058 \(TDD-0093\): rejects an aggregate job whose shape cannot preserve failure"
  Test Files 1 passed (1); Tests 2 passed | 21 skipped (23)
npx tsc --noEmit -p packages/qfai/tsconfig.tests.json   -> exit 0
```

The re-verify runs of `TDD-0062`, `TDD-0063` and `TDD-0092` are in the `TDD-0093`
entry.

For `TDD-0001` and `TDD-0037`:

```text
pnpm -C packages/qfai exec vitest run tests/integration/initSpec0003.test.ts tests/integration/shippedWorkflowInertness.test.ts
  Test Files 2 passed (2); Tests 30 passed (30)
npx tsc --noEmit -p packages/qfai/tsconfig.tests.json   -> exit 0
npx eslint packages/qfai/tests/integration/initSpec0003.test.ts packages/qfai/tests/integration/shippedWorkflowInertness.test.ts --max-warnings 0   -> exit 0
```

The selector, mutation and re-verify runs are in each row's entry.

For `TDD-0094`:

```text
pnpm -C packages/qfai exec vitest run tests/integration/initCopilotLegacyWindow.test.ts -t "TC-0003-0059 \(TDD-0094\): generated Copilot instructions state the closed legacy window"
  before the fix: Test Files 1 failed (1); Tests 3 failed | 1 passed (4)
  after the fix:  Test Files 1 passed (1); Tests 4 passed (4)
```

The RED, stripped, Oracle proof and Refactor verify runs are in the row's entry.

## Test volume estimate

| Layer | Files touched | Cases |
| ----- | ------------- | ----- |
| integration | 2 | 22 moved, 21 kept |
| e2e | 1 | 23 kept |

## Coverage obligations checklist

- `TC-0003-0056`, `-0057`, `-0058`: annotated under `tests/integration/**`.
- The other obligations of this pack are scored in the Coverage Depth Matrix; this
  run took up only the rows `CR-20260923-0003` names.

## Ledger rows advanced

| TDD-ID | Obligation | Layer | RED provenance | Entry |
| ------ | ---------- | ----- | -------------- | ----- |
| `TDD-0058` | `TC-0003-0056` | Integration | falsifiability | [TDD-0058](#tdd-0058) |
| `TDD-0059` | `TC-0003-0056` | Integration | falsifiability | [TDD-0059](#tdd-0059) |
| `TDD-0060` | `TC-0003-0057` | Integration | falsifiability | [TDD-0060](#tdd-0060) |
| `TDD-0061` | `TC-0003-0057` | Integration | falsifiability | [TDD-0061](#tdd-0061) |
| `TDD-0062` | `TC-0003-0058` | Integration | falsifiability | [TDD-0062](#tdd-0062) |
| `TDD-0063` | `TC-0003-0058` | Integration | falsifiability | [TDD-0063](#tdd-0063) |
| `TDD-0092` | `TC-0003-0058` | Integration | falsifiability | [TDD-0092](#tdd-0092) |
| `TDD-0093` | `TC-0003-0058` | Integration | falsifiability | [TDD-0093](#tdd-0093) |
| `TDD-0001` | `TC-0003-0001` | Integration | falsifiability | [TDD-0001](#tdd-0001) |
| `TDD-0037` | `TC-0003-0037` | Integration | falsifiability, test-only replacement | [TDD-0037](#tdd-0037) |
| `TDD-0094` | `TC-0003-0059` | Integration | observed-red | [TDD-0094](#tdd-0094) |

### TDD-0058

- TDD-ID: TDD-0058
- Layer: Integration
- Test file: packages/qfai/tests/integration/shippedWorkflowCheckIndependence.test.ts
- Selector: TC-0003-0056 (TDD-0058): delivers both isolated native matrix units without changing checker commands
- TC-ref: TC-0003-0056
- Branch: falsifiability — the test and the behaviour it checks shipped in the same change, so no natural RED can be observed
- Predicate to break: packages/qfai/assets/init/root/.github/workflows/qfai-docs.yml, job `checks`, `strategy.matrix.check` — the two legs, `shape` and `mermaid`
- Mutation: `check: [shape, mermaid]` to `check: [shape]`

#### Round 1

- Round 1: Satisfied-by: packages/qfai/assets/init/root/.github/workflows/qfai-docs.yml, job `checks`, `strategy.matrix.check` — the two legs, `shape` and `mermaid`
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts -t "TC-0003-0056 \(TDD-0058\): delivers both isolated native matrix units without changing checker commands"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 21 skipped (22). The row's case fails on `AssertionError: expected { check: [ 'shape' ] } to deeply equal { check: [ 'shape', 'mermaid' ] }` at `tests/integration/shippedWorkflowCheckIndependence.test.ts:61:32`

The edit:

```diff
-        check: [shape, mermaid]
+        check: [shape]
```

- Round 1: Falsifiability revision: working-tree+efa8887570e027f30f5f9b4c8802a2062106058348473127b1fb6548b8ba9936
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 5a6861a72ff0e02245a67d571c00527349e91394bf4eea431505ba08f50885ce
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/shippedWorkflowFixtures.ts
packages/qfai/tests/helpers/stdout.ts
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/shippedWorkflowCheckIndependence.test.ts
```

- Round 1: RED test replacement: test-only replacement — implementation-reviewer REVISE, Round 1 attempt 1 (the two-consumer helper was inlined); the proof above is stale — test replaced, and /qfai-implement re-takes it under the corrected test
- Round 1: Replacement proof revision: working-tree+721a10e5695f96894c2e3a026853fa5a6205e58a1a0ac77457c0ecb43c2e6360
- Round 1: Replacement proof command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts -t "TC-0003-0056 \(TDD-0058\): delivers both isolated native matrix units without changing checker commands"
- Round 1: Replacement proof result: Test Files 1 failed (1); Tests 1 failed | 21 skipped (22). The same mutation as the proof above, re-run under the corrected test, fails the row's case on `AssertionError: expected { check: [ 'shape' ] } to deeply equal { check: [ 'shape', 'mermaid' ] }` at `tests/integration/shippedWorkflowCheckIndependence.test.ts:153:32`

- Round 1: Revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts -t "TC-0003-0056 \(TDD-0058\): delivers both isolated native matrix units without changing checker commands"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 21 skipped (22)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 22 passed (22). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: 8264ee9066edb66e49848e1f385cc15431220c42
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 REVISE on the RED test manifest; qa-gatekeeper#2 PASS, RED phase gate on the falsifiability mutation run, reviewed revision working-tree+efa8887570e027f30f5f9b4c8802a2062106058348473127b1fb6548b8ba9936; qa-gatekeeper#3 PASS, build-phase GREEN + oracle proof, reviewed revision 6368454b0f56a50611aa309f82eb80e8cc35b758; qa-gatekeeper#4 PASS, RED phase gate on the falsifiability proof re-taken under the corrected test, reviewed revision working-tree+721a10e5695f96894c2e3a026853fa5a6205e58a1a0ac77457c0ecb43c2e6360; qa-gatekeeper#5 PASS, build-phase GREEN + that proof, reviewed revision 8264ee9066edb66e49848e1f385cc15431220c42

- Round 1: reviewer verdict (attempt 1): REVISE — implementation-reviewer: the new shared helper tests/helpers/deliveredWorkflowTree.ts has two consumers; the acceptance test goes back to /qfai-atdd on the no-new-behaviour path
- Round 1: Review pack (attempt 1): .qfai/review/review-20260923040010000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): 4e419f3230190025e5530165e471b2447b924bfb4229143409c4bfd097a80cd4

- Round 1: reviewer verdict (attempt 2): PASS
- Round 1: Review pack (attempt 2): .qfai/review/review-20260923040020000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 2): 6d9c437b985d0172bf1e0cf2f01c938082a3a3a2e78e00d6bd96245b98a6300d
- Spec review: PASS
- Spec reviewed revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Spec audited evidence hash: 7b459d797e8970baf40a741690a5b552ce7f12ab43b56dcaa03ad44337c27242
- Spec review pack: .qfai/review/review-20260923040020000 <!-- qfai:not-a-citation -->
- Spec review pack seal: 6d9c437b985d0172bf1e0cf2f01c938082a3a3a2e78e00d6bd96245b98a6300d
- Code quality review: PASS
- Code quality reviewed revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Code quality audited evidence hash: 7b459d797e8970baf40a741690a5b552ce7f12ab43b56dcaa03ad44337c27242
- Code quality review pack: .qfai/review/review-20260923040020000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 6d9c437b985d0172bf1e0cf2f01c938082a3a3a2e78e00d6bd96245b98a6300d
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 22 passed (22). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Checkpoint verification seal: 8c6285bb550ec6ae6f68478e4251c2d8299e7095e05e9105f32af65ec3b7ad58

### TDD-0059

- TDD-ID: TDD-0059
- Layer: Integration
- Test file: packages/qfai/tests/integration/shippedWorkflowCheckIndependence.test.ts
- Selector: TC-0003-0056 (TDD-0059): keeps the existing external check name and always runs its matrix aggregate
- TC-ref: TC-0003-0056
- Branch: falsifiability — the test and the behaviour it checks shipped in the same change, so no natural RED can be observed
- Predicate to break: packages/qfai/assets/init/root/.github/workflows/qfai-docs.yml, job `docs`, `name:` — the external check name adopter branch protection requires
- Mutation: the aggregate's `name:` from `qfai docs (document shape and Mermaid syntax)` to `qfai docs (document checks)`

#### Round 1

- Round 1: Satisfied-by: packages/qfai/assets/init/root/.github/workflows/qfai-docs.yml, job `docs`, `name:` — the external check name adopter branch protection requires
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts -t "TC-0003-0056 \(TDD-0059\): keeps the existing external check name and always runs its matrix aggregate"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 21 skipped (22). The row's case fails on `AssertionError: expected 'qfai docs (document checks)' to be 'qfai docs (document shape and Mermaid…' // Object.is equality` at `tests/integration/shippedWorkflowCheckIndependence.test.ts:93:28`

The edit:

```diff
-    name: qfai docs (document shape and Mermaid syntax)
+    name: qfai docs (document checks)
```

- Round 1: Falsifiability revision: working-tree+ab9fcde10a43a277e36c3a59c1053e7fb21f536f84cd507c2c039a05c77defe0
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 5a6861a72ff0e02245a67d571c00527349e91394bf4eea431505ba08f50885ce
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/shippedWorkflowFixtures.ts
packages/qfai/tests/helpers/stdout.ts
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/shippedWorkflowCheckIndependence.test.ts
```

- Round 1: RED test replacement: test-only replacement — implementation-reviewer REVISE, Round 1 attempt 1 (the two-consumer helper was inlined); the proof above is stale — test replaced, and /qfai-implement re-takes it under the corrected test
- Round 1: Replacement proof revision: working-tree+79c0b5c6fc87897aa937ccd08e91c00cd80d73eff973b9ca40351c494c408121
- Round 1: Replacement proof command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts -t "TC-0003-0056 \(TDD-0059\): keeps the existing external check name and always runs its matrix aggregate"
- Round 1: Replacement proof result: Test Files 1 failed (1); Tests 1 failed | 21 skipped (22). The same mutation as the proof above, re-run under the corrected test, fails the row's case on `AssertionError: expected 'qfai docs (document checks)' to be 'qfai docs (document shape and Mermaid…' // Object.is equality` at `tests/integration/shippedWorkflowCheckIndependence.test.ts:185:28`

- Round 1: Revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts -t "TC-0003-0056 \(TDD-0059\): keeps the existing external check name and always runs its matrix aggregate"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 21 skipped (22)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 22 passed (22). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: 8264ee9066edb66e49848e1f385cc15431220c42
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the falsifiability mutation run, reviewed revision working-tree+ab9fcde10a43a277e36c3a59c1053e7fb21f536f84cd507c2c039a05c77defe0; qa-gatekeeper#2 PASS, build-phase GREEN + oracle proof, reviewed revision 6368454b0f56a50611aa309f82eb80e8cc35b758; qa-gatekeeper#3 PASS, RED phase gate on the falsifiability proof re-taken under the corrected test, reviewed revision working-tree+79c0b5c6fc87897aa937ccd08e91c00cd80d73eff973b9ca40351c494c408121; qa-gatekeeper#4 PASS, build-phase GREEN + that proof, reviewed revision 8264ee9066edb66e49848e1f385cc15431220c42

- Round 1: reviewer verdict (attempt 1): REVISE — implementation-reviewer: the new shared helper tests/helpers/deliveredWorkflowTree.ts has two consumers; the acceptance test goes back to /qfai-atdd on the no-new-behaviour path
- Round 1: Review pack (attempt 1): .qfai/review/review-20260923040011000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): 880d532627ed9f06beeaf2e23c7a05e7e97ef02fd4703f66af8aaa67a964a008

- Round 1: reviewer verdict (attempt 2): PASS
- Round 1: Review pack (attempt 2): .qfai/review/review-20260923040021000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 2): e5c44d55d827f8515dd0fe46fde1d10d19b935679f12735183803c59036795e9
- Spec review: PASS
- Spec reviewed revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Spec audited evidence hash: 9e4cbc33730db648468efc1b9b1a686ea23d8cd714dd34e0f35c0873254abcba
- Spec review pack: .qfai/review/review-20260923040021000 <!-- qfai:not-a-citation -->
- Spec review pack seal: e5c44d55d827f8515dd0fe46fde1d10d19b935679f12735183803c59036795e9
- Code quality review: PASS
- Code quality reviewed revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Code quality audited evidence hash: 9e4cbc33730db648468efc1b9b1a686ea23d8cd714dd34e0f35c0873254abcba
- Code quality review pack: .qfai/review/review-20260923040021000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: e5c44d55d827f8515dd0fe46fde1d10d19b935679f12735183803c59036795e9
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 22 passed (22). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Checkpoint verification seal: 8c6285bb550ec6ae6f68478e4251c2d8299e7095e05e9105f32af65ec3b7ad58

### TDD-0060

- TDD-ID: TDD-0060
- Layer: Integration
- Test file: packages/qfai/tests/integration/shippedWorkflowCheckIndependence.test.ts
- Selector: TC-0003-0057 (TDD-0060): delivers full validation and PR-only drift in isolated native matrix jobs
- TC-ref: TC-0003-0057
- Branch: falsifiability — the test and the behaviour it checks shipped in the same change, so no natural RED can be observed
- Predicate to break: packages/qfai/assets/init/root/.github/workflows/qfai-validate.yml, job `validate`, the drift step's `if:` — the condition that keeps the drift profile to pull requests
- Mutation: the drift step's `if:` loses `&& github.event_name == 'pull_request'`

#### Round 1

- Round 1: Satisfied-by: packages/qfai/assets/init/root/.github/workflows/qfai-validate.yml, job `validate`, the drift step's `if:` — the condition that keeps the drift profile to pull requests
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts -t "TC-0003-0057 \(TDD-0060\): delivers full validation and PR-only drift in isolated native matrix jobs"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 21 skipped (22). The row's case fails on `AssertionError: expected [ …(2) ] to deeply equal [ …(2) ]` at `tests/integration/shippedWorkflowCheckIndependence.test.ts:178:7`. The diff names the drift step: expected `"if": "matrix.profile == 'drift' && github.event_name == 'pull_request'"`, received `"if": "matrix.profile == 'drift'"`

The edit:

```diff
-        if: matrix.profile == 'drift' && github.event_name == 'pull_request'
+        if: matrix.profile == 'drift'
```

- Round 1: Falsifiability revision: working-tree+5ef2ee5e7f466e7441fd057c4476edd43c59af8045fad6f4f1c5a1c2b816d9ba
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 5a6861a72ff0e02245a67d571c00527349e91394bf4eea431505ba08f50885ce
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/shippedWorkflowFixtures.ts
packages/qfai/tests/helpers/stdout.ts
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/shippedWorkflowCheckIndependence.test.ts
```

- Round 1: RED test replacement: test-only replacement — implementation-reviewer REVISE, Round 1 attempt 1 (the two-consumer helper was inlined); the proof above is stale — test replaced, and /qfai-implement re-takes it under the corrected test
- Round 1: Replacement proof revision: working-tree+785fc9312811ff6bc22d4c6b8ebeaaaede497ebb7f84e2c9c5b4d09330a35db9
- Round 1: Replacement proof command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts -t "TC-0003-0057 \(TDD-0060\): delivers full validation and PR-only drift in isolated native matrix jobs"
- Round 1: Replacement proof result: Test Files 1 failed (1); Tests 1 failed | 21 skipped (22). The same mutation as the proof above, re-run under the corrected test, fails the row's case on `AssertionError: expected [ …(2) ] to deeply equal [ …(2) ]` at `tests/integration/shippedWorkflowCheckIndependence.test.ts:270:7`. The diff names the drift step: expected `"if": "matrix.profile == 'drift' && github.event_name == 'pull_request'"`, received `"if": "matrix.profile == 'drift'"`

- Round 1: Revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts -t "TC-0003-0057 \(TDD-0060\): delivers full validation and PR-only drift in isolated native matrix jobs"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 21 skipped (22)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 22 passed (22). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: 8264ee9066edb66e49848e1f385cc15431220c42
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the falsifiability mutation run, reviewed revision working-tree+5ef2ee5e7f466e7441fd057c4476edd43c59af8045fad6f4f1c5a1c2b816d9ba; qa-gatekeeper#2 PASS, build-phase GREEN + oracle proof, reviewed revision 6368454b0f56a50611aa309f82eb80e8cc35b758; qa-gatekeeper#3 PASS, RED phase gate on the falsifiability proof re-taken under the corrected test, reviewed revision working-tree+785fc9312811ff6bc22d4c6b8ebeaaaede497ebb7f84e2c9c5b4d09330a35db9; qa-gatekeeper#4 PASS, build-phase GREEN + that proof, reviewed revision 8264ee9066edb66e49848e1f385cc15431220c42

- Round 1: reviewer verdict (attempt 1): REVISE — implementation-reviewer: the new shared helper tests/helpers/deliveredWorkflowTree.ts has two consumers; the acceptance test goes back to /qfai-atdd on the no-new-behaviour path
- Round 1: Review pack (attempt 1): .qfai/review/review-20260923040012000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): af46183d545ce2dda79f5838aec1b8be857fd8c82c22c5b516185d4efd2ed18e

- Round 1: reviewer verdict (attempt 2): PASS
- Round 1: Review pack (attempt 2): .qfai/review/review-20260923040022000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 2): c699849b03dd124c497a12812cbde937f85469cc022e7f07022803e4c66ba524
- Spec review: PASS
- Spec reviewed revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Spec audited evidence hash: 56b7180977289d12ec58fbe88c90ca1125a29b6759333b852cf30920f1ba205b
- Spec review pack: .qfai/review/review-20260923040022000 <!-- qfai:not-a-citation -->
- Spec review pack seal: c699849b03dd124c497a12812cbde937f85469cc022e7f07022803e4c66ba524
- Code quality review: PASS
- Code quality reviewed revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Code quality audited evidence hash: 56b7180977289d12ec58fbe88c90ca1125a29b6759333b852cf30920f1ba205b
- Code quality review pack: .qfai/review/review-20260923040022000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: c699849b03dd124c497a12812cbde937f85469cc022e7f07022803e4c66ba524
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 22 passed (22). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Checkpoint verification seal: 8c6285bb550ec6ae6f68478e4251c2d8299e7095e05e9105f32af65ec3b7ad58

### TDD-0061

- TDD-ID: TDD-0061
- Layer: Integration
- Test file: packages/qfai/tests/integration/shippedWorkflowCheckIndependence.test.ts
- Selector: TC-0003-0057 (TDD-0061): keeps the existing external validation check as an always-run complete verdict
- TC-ref: TC-0003-0057
- Branch: falsifiability — the test and the behaviour it checks shipped in the same change, so no natural RED can be observed
- Predicate to break: packages/qfai/assets/init/root/.github/workflows/qfai-validate.yml, job `summary`, `name:` — the external check name adopter branch protection requires
- Mutation: the aggregate's `name:` from `qfai validate (full profile, fail on error)` to `qfai validate (verdict)`

#### Round 1

- Round 1: Satisfied-by: packages/qfai/assets/init/root/.github/workflows/qfai-validate.yml, job `summary`, `name:` — the external check name adopter branch protection requires
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts -t "TC-0003-0057 \(TDD-0061\): keeps the existing external validation check as an always-run complete verdict"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 21 skipped (22). The row's case fails on `AssertionError: expected 'qfai validate (verdict)' to be 'qfai validate (full profile, fail on …' // Object.is equality` at `tests/integration/shippedWorkflowCheckIndependence.test.ts:194:31`

The edit:

```diff
-    name: qfai validate (full profile, fail on error)
+    name: qfai validate (verdict)
```

- Round 1: Falsifiability revision: working-tree+ff2ac28815bfa059ac8825a2e1bde65db692dc2a4def0a2961a00422c7467883
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 5a6861a72ff0e02245a67d571c00527349e91394bf4eea431505ba08f50885ce
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/shippedWorkflowFixtures.ts
packages/qfai/tests/helpers/stdout.ts
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/shippedWorkflowCheckIndependence.test.ts
```

- Round 1: RED test replacement: test-only replacement — implementation-reviewer REVISE, Round 1 attempt 1 (the two-consumer helper was inlined); the proof above is stale — test replaced, and /qfai-implement re-takes it under the corrected test
- Round 1: Replacement proof revision: working-tree+e0271491bba06aec582d11a8c8b0505964e639ac665cac4fa134773ab7850d81
- Round 1: Replacement proof command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts -t "TC-0003-0057 \(TDD-0061\): keeps the existing external validation check as an always-run complete verdict"
- Round 1: Replacement proof result: Test Files 1 failed (1); Tests 1 failed | 21 skipped (22). The same mutation as the proof above, re-run under the corrected test, fails the row's case on `AssertionError: expected 'qfai validate (verdict)' to be 'qfai validate (full profile, fail on …' // Object.is equality` at `tests/integration/shippedWorkflowCheckIndependence.test.ts:286:31`

- Round 1: Revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts -t "TC-0003-0057 \(TDD-0061\): keeps the existing external validation check as an always-run complete verdict"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 21 skipped (22)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 22 passed (22). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: 8264ee9066edb66e49848e1f385cc15431220c42
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the falsifiability mutation run, reviewed revision working-tree+ff2ac28815bfa059ac8825a2e1bde65db692dc2a4def0a2961a00422c7467883; qa-gatekeeper#2 PASS, build-phase GREEN + oracle proof, reviewed revision 6368454b0f56a50611aa309f82eb80e8cc35b758; qa-gatekeeper#3 PASS, RED phase gate on the falsifiability proof re-taken under the corrected test, reviewed revision working-tree+e0271491bba06aec582d11a8c8b0505964e639ac665cac4fa134773ab7850d81; qa-gatekeeper#4 PASS, build-phase GREEN + that proof, reviewed revision 8264ee9066edb66e49848e1f385cc15431220c42

- Round 1: reviewer verdict (attempt 1): REVISE — implementation-reviewer: the new shared helper tests/helpers/deliveredWorkflowTree.ts has two consumers; the acceptance test goes back to /qfai-atdd on the no-new-behaviour path
- Round 1: Review pack (attempt 1): .qfai/review/review-20260923040013000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): 35b864259d8d9dc1b00d4fd076235f9aaea86bb3eb5b040079b1ff35a0cc1de9

- Round 1: reviewer verdict (attempt 2): PASS
- Round 1: Review pack (attempt 2): .qfai/review/review-20260923040023000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 2): 2bd549a351ad86e4057ad38bbaab854667e3f3d2fb01d3e060b47a15e2525cc9
- Spec review: PASS
- Spec reviewed revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Spec audited evidence hash: 70cace0f4025a8951086705f8c866324bc6eca0c7acab4e6a06dcfd2d284f5ae
- Spec review pack: .qfai/review/review-20260923040023000 <!-- qfai:not-a-citation -->
- Spec review pack seal: 2bd549a351ad86e4057ad38bbaab854667e3f3d2fb01d3e060b47a15e2525cc9
- Code quality review: PASS
- Code quality reviewed revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Code quality audited evidence hash: 70cace0f4025a8951086705f8c866324bc6eca0c7acab4e6a06dcfd2d284f5ae
- Code quality review pack: .qfai/review/review-20260923040023000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 2bd549a351ad86e4057ad38bbaab854667e3f3d2fb01d3e060b47a15e2525cc9
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: 8264ee9066edb66e49848e1f385cc15431220c42
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts --reporter=verbose && pnpm -C packages/qfai exec vitest run --maxWorkers=7 --testTimeout=600000
- Checkpoint verification result: PASS — step 1, the Test file: Test Files 1 passed (1); Tests 22 passed (22), naming TC-0003-0057 (TDD-0061) as passed. Step 2, the full suite: Test Files 771 passed | 3 skipped (774); Tests 14542 passed | 82 skipped (14624), exit 0. The worker count and per-test timeout are raised because two slow suites time out at the default under a full parallel run on this host
- Checkpoint verification revision: b8b38f2bf640432111527922e83bad3939ab8a56
- Checkpoint verification seal: 0c57eca84fd2f8cb4124cf8a84eebf7dfc92c67bad9b87e2930f3009e94b194f

### TDD-0062

- TDD-ID: TDD-0062
- Layer: Integration
- Test file: packages/qfai/tests/integration/shippedWorkflowPortability.test.ts
- Selector: TC-0003-0058 (TDD-0062): rejects a planted green aggregate while accepting its unmodified body
- TC-ref: TC-0003-0058
- Branch: falsifiability — the test and the behaviour it checks shipped in the same change, so no natural RED can be observed
- Predicate to break: packages/qfai/assets/init/root/.github/workflows/qfai-docs.yml, job `docs`, the aggregate body's `exit 1` on a non-success result
- Mutation: the aggregate body's `exit 1` to `exit 0`

#### Round 1

- Round 1: Satisfied-by: packages/qfai/assets/init/root/.github/workflows/qfai-docs.yml, job `docs`, the aggregate body's `exit 1` on a non-success result
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "TC-0003-0058 \(TDD-0062\): rejects a planted green aggregate while accepting its unmodified body"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 20 skipped (21). The row's case fails on `AssertionError: expected [ …(6) ] to deeply equal []` at `tests/integration/shippedWorkflowPortability.test.ts:269:63`, the case's first assertion, on the unmodified shipped body. The six violations it received are `job "docs" reports exit 0 for checks: <result>` for `failure`, `cancelled`, `timed_out`, `skipped`, `unknown` and `missing`

The edit:

```diff
-            exit 1
+            exit 0
```

- Round 1: Falsifiability revision: working-tree+962fce2d7e7531c1d33451fd345b9aab5f295b89a4267dbe544537fd50a123c1
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: fbbe35780e4e91d9f530ef48f21033ba17c7326fa1f8825b102050585ee57f01
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/shippedWorkflowFixtures.ts
packages/qfai/tests/integration/shippedWorkflowPortability.test.ts
```

- Round 1: Revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "TC-0003-0058 \(TDD-0062\): rejects a planted green aggregate while accepting its unmodified body"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 20 skipped (21)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 21 passed (21). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the falsifiability mutation run, reviewed revision working-tree+962fce2d7e7531c1d33451fd345b9aab5f295b89a4267dbe544537fd50a123c1; qa-gatekeeper#2 PASS, build-phase GREEN + oracle proof, reviewed revision 6368454b0f56a50611aa309f82eb80e8cc35b758

- Spec review: PASS
- Spec reviewed revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Spec audited evidence hash: 65d44c966a5222ea8bb342c6e4294e8e62dfa10122da08cc9ead1e5065bd1d02
- Spec review pack: .qfai/review/review-20260923040014000 <!-- qfai:not-a-citation -->
- Spec review pack seal: 555a3ebaa92d2fdaa8a039ab5b903215871962c185f3e2ee8500cd01ee73fb57
- Code quality review: PASS
- Code quality reviewed revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Code quality audited evidence hash: 65d44c966a5222ea8bb342c6e4294e8e62dfa10122da08cc9ead1e5065bd1d02
- Code quality review pack: .qfai/review/review-20260923040014000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 555a3ebaa92d2fdaa8a039ab5b903215871962c185f3e2ee8500cd01ee73fb57
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 21 passed (21). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Checkpoint verification seal: ecd5b72e49e725620486d0370fe1c18deab941ccc61d2159b62402b80904256f

### TDD-0063

- TDD-ID: TDD-0063
- Layer: Integration
- Test file: packages/qfai/tests/integration/shippedWorkflowPortability.test.ts
- Selector: TC-0003-0058 (TDD-0063): rejects a result binding removed from the shipped aggregate
- TC-ref: TC-0003-0058
- Branch: falsifiability — the test and the behaviour it checks shipped in the same change, so no natural RED can be observed
- Predicate to break: packages/qfai/tests/integration/shippedWorkflowPortability.test.ts, `aggregateFailureViolations`, the result-binding guard — the check this case exercises; the test plants its own copy of the aggregate, so no shipped file can make it fail
- Mutation: the guard's `if (!Object.values(bindings).includes(value))` to `if (false)`

#### Round 1

- Round 1: Satisfied-by: packages/qfai/tests/integration/shippedWorkflowPortability.test.ts, `aggregateFailureViolations`, the result-binding guard — the check this case exercises; the test plants its own copy of the aggregate, so no shipped file can make it fail
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "TC-0003-0058 \(TDD-0063\): rejects a result binding removed from the shipped aggregate"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 20 skipped (21). The row's case fails on `AssertionError: expected [] to deeply equal [ Array(1) ]` at `tests/integration/shippedWorkflowPortability.test.ts:285:63`: the checker returned no violation for the aggregate the case stripped of its result binding, where the case expects `qfai-docs.yml: job "docs" does not consume the result of install-bearing need checks`

The edit:

```diff
-    if (!Object.values(bindings).includes(value)) {
+    if (false) {
```

- Round 1: Falsifiability revision: working-tree+0c16e336d92d65224ec37609bd8d897cbb70d42c505d6c0d0adf6c102605203f
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: fbbe35780e4e91d9f530ef48f21033ba17c7326fa1f8825b102050585ee57f01
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/shippedWorkflowFixtures.ts
packages/qfai/tests/integration/shippedWorkflowPortability.test.ts
```

- Round 1: Revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "TC-0003-0058 \(TDD-0063\): rejects a result binding removed from the shipped aggregate"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 20 skipped (21)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 21 passed (21). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the falsifiability mutation run, reviewed revision working-tree+0c16e336d92d65224ec37609bd8d897cbb70d42c505d6c0d0adf6c102605203f; qa-gatekeeper#2 PASS, build-phase GREEN + oracle proof, reviewed revision 6368454b0f56a50611aa309f82eb80e8cc35b758

- Spec review: PASS
- Spec reviewed revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Spec audited evidence hash: 610d8cdec182fd50b2b4ea12c5202555527cd9ae4ac94f01a0b3595811412ba3
- Spec review pack: .qfai/review/review-20260923040015000 <!-- qfai:not-a-citation -->
- Spec review pack seal: b5e1c3e3a56e7acce9edfd8da0d2bb17d279575fa2da72907378e68b5dd675df
- Code quality review: PASS
- Code quality reviewed revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Code quality audited evidence hash: 610d8cdec182fd50b2b4ea12c5202555527cd9ae4ac94f01a0b3595811412ba3
- Code quality review pack: .qfai/review/review-20260923040015000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: b5e1c3e3a56e7acce9edfd8da0d2bb17d279575fa2da72907378e68b5dd675df
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 21 passed (21). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Checkpoint verification seal: ecd5b72e49e725620486d0370fe1c18deab941ccc61d2159b62402b80904256f

### TDD-0092

- TDD-ID: TDD-0092
- Layer: Integration
- Test file: packages/qfai/tests/integration/shippedWorkflowPortability.test.ts
- Selector: rejects an aggregate step that cannot preserve failure
- TC-ref: TC-0003-0058
- Branch: falsifiability — the test and the behaviour it checks shipped in the same change, so no natural RED can be observed
- Predicate to break: packages/qfai/tests/integration/shippedWorkflowPortability.test.ts, `aggregateFailureViolations`, the result-only aggregate check — the check this case exercises; the test plants each unpreservable step itself, so no shipped file can make it fail
- Mutation: the check's `return [`…is not a result-only aggregate`]` to `return []`

#### Round 1

- Round 1: Satisfied-by: packages/qfai/tests/integration/shippedWorkflowPortability.test.ts, `aggregateFailureViolations`, the result-only aggregate check — the check this case exercises; the test plants each unpreservable step itself, so no shipped file can make it fail
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "rejects an aggregate step that cannot preserve failure"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 7 failed | 14 skipped (21). Each of the seven parameterised cases of the row's `it.each` fails on `AssertionError: expected [] to deeply equal [ Array(1) ]` at `tests/integration/shippedWorkflowPortability.test.ts:304:63`: the checker returned no violation where each case expects `qfai-docs.yml: job "docs" survives a failed install but is not a result-only aggregate`. The seven are `{"if":"false"}`, `{"shell":"bash {0} || true"}`, `{"continue-on-error":true}`, `{"uses":"actions/checkout"}`, `{"run":"pnpm install"}`, `{"run":"npx qfai validate"}` and `{"run":false}`

The edit:

```diff
-    return [`${site} survives a failed install but is not a result-only aggregate`];
+    return [];
```

- Round 1: Falsifiability revision: working-tree+8694c6364628eb060cd00b073907fd026a6a8556fd0d034aaef784236ad15995
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: fbbe35780e4e91d9f530ef48f21033ba17c7326fa1f8825b102050585ee57f01
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/shippedWorkflowFixtures.ts
packages/qfai/tests/integration/shippedWorkflowPortability.test.ts
```

- Round 1: Revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "rejects an aggregate step that cannot preserve failure"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 7 passed | 14 skipped (21)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 21 passed (21). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the falsifiability mutation run, reviewed revision working-tree+8694c6364628eb060cd00b073907fd026a6a8556fd0d034aaef784236ad15995; qa-gatekeeper#2 PASS, build-phase GREEN + oracle proof, reviewed revision 6368454b0f56a50611aa309f82eb80e8cc35b758

- Spec review: PASS
- Spec reviewed revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Spec audited evidence hash: 78c9f15fd9bad641b4b53d43cdbbfb4347410ca2161994d01dfabefeca04407b
- Spec review pack: .qfai/review/review-20260923040016000 <!-- qfai:not-a-citation -->
- Spec review pack seal: 700390442fcc729d37fd1eb6ccd3680b14ff5483567bb60423040db4a58fa596
- Code quality review: PASS
- Code quality reviewed revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Code quality audited evidence hash: 78c9f15fd9bad641b4b53d43cdbbfb4347410ca2161994d01dfabefeca04407b
- Code quality review pack: .qfai/review/review-20260923040016000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 700390442fcc729d37fd1eb6ccd3680b14ff5483567bb60423040db4a58fa596
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 21 passed (21). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: 6368454b0f56a50611aa309f82eb80e8cc35b758
- Checkpoint verification seal: ecd5b72e49e725620486d0370fe1c18deab941ccc61d2159b62402b80904256f

### TDD-0093

- TDD-ID: TDD-0093
- Layer: Integration
- Test file: packages/qfai/tests/integration/shippedWorkflowPortability.test.ts
- Selector: TC-0003-0058 (TDD-0093): rejects an aggregate job whose shape cannot preserve failure
- TC-ref: TC-0003-0058
- Branch: falsifiability — the check this case exercises already rejects both job shapes, so the test passes on its first run and no natural RED can be observed
- Predicate to break: packages/qfai/tests/integration/shippedWorkflowPortability.test.ts, `aggregateFailureViolations`, the job-shape clauses of the result-only aggregate check — `job.steps.length !== 1` and `job.job["continue-on-error"] !== undefined`; the test plants each unpreservable job shape itself, so no shipped file can make it fail
- Mutation: delete the clause `job.job["continue-on-error"] !== undefined ||` (line 221)

That mutation fails the `continue-on-error set on the job` case. The second
mutation, deleting `job.steps.length !== 1 ||` (line 214), fails the
`a second step that does work of its own` case. Each leaves the other case
passing, because the other clause still rejects it.

The selector contains `(` and `)`. Escape both when passing it to vitest `-t`.

#### Shared-artifact re-verify

The new case is in the Test file of the three rows below, so it moves their
`RED test hash`. Each row's selector was re-run against the edited file at the
revision given, and each passed. The mutation proofs are handed to
`/qfai-implement` as a mutation-only request.

##### spec-0003/TDD-0062

- Evidence file: .qfai/evidence/atdd-spec-0003.md
- Revision: 97e6fd6f69f77bd4f04144d9d85d8630b3730717
- Selector: TC-0003-0058 (TDD-0062): rejects a planted green aggregate while accepting its unmodified body
- Re-verify command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "TC-0003-0058 \(TDD-0062\): rejects a planted green aggregate while accepting its unmodified body"
- Re-verify result: PASS — Test Files 1 passed (1); Tests 1 passed | 22 skipped (23)
- Proof command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "TC-0003-0058 \(TDD-0062\): rejects a planted green aggregate while accepting its unmodified body", with `packages/qfai/assets/init/root/.github/workflows/qfai-docs.yml:611` changed from `exit 1` to `exit 0`
- Proof result: FAIL — Test Files 1 failed (1); Tests 1 failed | 22 skipped (23). The row's case fails on `AssertionError: expected [ …(6) ] to deeply equal []` at `tests/integration/shippedWorkflowPortability.test.ts:269:63`
- Restored GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "TC-0003-0058 \(TDD-0062\): rejects a planted green aggregate while accepting its unmodified body", after `git checkout -- packages/qfai/assets/init/root/.github/workflows/qfai-docs.yml`
- Restored GREEN result: PASS — Test Files 1 passed (1); Tests 1 passed | 22 skipped (23)
- RED test manifest:

```text
packages/qfai/tests/helpers/shippedWorkflowFixtures.ts
packages/qfai/tests/integration/shippedWorkflowPortability.test.ts
```

- RED test hash: 7e167bba8c93e3d22ead8847a72628e0785aa6b43c994e142e2d2ecf396c7bc2

##### spec-0003/TDD-0063

- Evidence file: .qfai/evidence/atdd-spec-0003.md
- Revision: 97e6fd6f69f77bd4f04144d9d85d8630b3730717
- Selector: TC-0003-0058 (TDD-0063): rejects a result binding removed from the shipped aggregate
- Re-verify command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "TC-0003-0058 \(TDD-0063\): rejects a result binding removed from the shipped aggregate"
- Re-verify result: PASS — Test Files 1 passed (1); Tests 1 passed | 22 skipped (23)
- Proof command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "TC-0003-0058 \(TDD-0063\): rejects a result binding removed from the shipped aggregate", with `packages/qfai/tests/integration/shippedWorkflowPortability.test.ts:230` changed from `if (!Object.values(bindings).includes(value)) {` to `if (false) {`
- Proof result: FAIL — Test Files 1 failed (1); Tests 1 failed | 22 skipped (23). The row's case fails on `AssertionError: expected [] to deeply equal [ Array(1) ]` at `tests/integration/shippedWorkflowPortability.test.ts:285:63`
- Restored GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "TC-0003-0058 \(TDD-0063\): rejects a result binding removed from the shipped aggregate", after `git checkout -- packages/qfai/tests/integration/shippedWorkflowPortability.test.ts`
- Restored GREEN result: PASS — Test Files 1 passed (1); Tests 1 passed | 22 skipped (23)
- RED test manifest:

```text
packages/qfai/tests/helpers/shippedWorkflowFixtures.ts
packages/qfai/tests/integration/shippedWorkflowPortability.test.ts
```

- RED test hash: 7e167bba8c93e3d22ead8847a72628e0785aa6b43c994e142e2d2ecf396c7bc2

##### spec-0003/TDD-0092

- Evidence file: .qfai/evidence/atdd-spec-0003.md
- Revision: 97e6fd6f69f77bd4f04144d9d85d8630b3730717
- Selector: rejects an aggregate step that cannot preserve failure
- Re-verify command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "rejects an aggregate step that cannot preserve failure"
- Re-verify result: PASS — Test Files 1 passed (1); Tests 7 passed | 16 skipped (23)
- Proof command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "rejects an aggregate step that cannot preserve failure", with `packages/qfai/tests/integration/shippedWorkflowPortability.test.ts:225` changed from `return [`${site} survives a failed install but is not a result-only aggregate`];` to `return [];`
- Proof result: FAIL — Test Files 1 failed (1); Tests 7 failed | 16 skipped (23). The row's case fails on `AssertionError: expected [] to deeply equal [ Array(1) ]` at `tests/integration/shippedWorkflowPortability.test.ts:304:63`
- Restored GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "rejects an aggregate step that cannot preserve failure", after `git checkout -- packages/qfai/tests/integration/shippedWorkflowPortability.test.ts`
- Restored GREEN result: PASS — Test Files 1 passed (1); Tests 7 passed | 16 skipped (23)
- RED test manifest:

```text
packages/qfai/tests/helpers/shippedWorkflowFixtures.ts
packages/qfai/tests/integration/shippedWorkflowPortability.test.ts
```

- RED test hash: 7e167bba8c93e3d22ead8847a72628e0785aa6b43c994e142e2d2ecf396c7bc2

#### Round 1

An earlier run of this gate, superseded:

- Command: the same command, with only line 221 (`job.job["continue-on-error"] !== undefined ||`) replaced by an empty line
- Result: Test Files 1 failed (1); Tests 1 failed | 1 passed | 21 skipped (23). The row's case fails on `AssertionError: expected [] to deeply equal [ Array(1) ]` at `tests/integration/shippedWorkflowPortability.test.ts:328:65`; the second-step case passed
- Verdict: qa-gatekeeper#1 REVISE — the second-step case had no run showing it fails, so the proof now removes both job-shape clauses in one edit

- Round 1: Satisfied-by: packages/qfai/tests/integration/shippedWorkflowPortability.test.ts, `aggregateFailureViolations`, the job-shape clauses of the result-only aggregate check — `job.steps.length !== 1` and `job.job["continue-on-error"] !== undefined`; the test plants each job shape itself, so no shipped file can make it fail
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "TC-0003-0058 \(TDD-0093\): rejects an aggregate job whose shape cannot preserve failure"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 2 failed | 21 skipped (23). Both cases fail on `AssertionError: expected [] to deeply equal [ Array(1) ]` at `tests/integration/shippedWorkflowPortability.test.ts:328:65`: `a second step that does work of its own` and `continue-on-error set on the job`

The edit:

```diff
-    job.steps.length !== 1 ||
+
-    job.job["continue-on-error"] !== undefined ||
+
```

- Round 1: Falsifiability revision: working-tree+7ec5e5259f299517c369d9c15d0142af4d1bc0a620e4b360b50300fefdbd6cd1
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 7e167bba8c93e3d22ead8847a72628e0785aa6b43c994e142e2d2ecf396c7bc2
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/shippedWorkflowFixtures.ts
packages/qfai/tests/integration/shippedWorkflowPortability.test.ts
```

- Round 1: Revision: e4da9886fe30f7ae41827a6f5ac26c9a443ac851
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts -t "TC-0003-0058 \(TDD-0093\): rejects an aggregate job whose shape cannot preserve failure"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 2 passed | 21 skipped (23)

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 23 passed (23). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: e4da9886fe30f7ae41827a6f5ac26c9a443ac851
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 REVISE, RED phase gate: the second-step case had no run showing it fails; qa-gatekeeper#2 PASS, RED phase gate on the two-clause mutation run and the three shared-artifact re-verify subsections, reviewed revision working-tree+7ec5e5259f299517c369d9c15d0142af4d1bc0a620e4b360b50300fefdbd6cd1; qa-gatekeeper#3 PASS, build-phase GREEN + oracle proof, reviewed revision e4da9886fe30f7ae41827a6f5ac26c9a443ac851

- Spec review: PASS
- Spec reviewed revision: e4da9886fe30f7ae41827a6f5ac26c9a443ac851
- Spec audited evidence hash: b3b911c58f50d7ba0c2fb6432904658d7048d4a476b523619c81bf7908643db5
- Spec review pack: .qfai/review/review-20260923080017000 <!-- qfai:not-a-citation -->
- Spec review pack seal: b20406bd395435082a5599f8ba88d4cd081e865df5f2bdd7d3b6020cb96c240e
- Code quality review: PASS
- Code quality reviewed revision: e4da9886fe30f7ae41827a6f5ac26c9a443ac851
- Code quality audited evidence hash: b3b911c58f50d7ba0c2fb6432904658d7048d4a476b523619c81bf7908643db5
- Code quality review pack: .qfai/review/review-20260923080017000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: b20406bd395435082a5599f8ba88d4cd081e865df5f2bdd7d3b6020cb96c240e
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: e4da9886fe30f7ae41827a6f5ac26c9a443ac851
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowPortability.test.ts --reporter=verbose && pnpm -C packages/qfai exec vitest run --maxWorkers=7 --testTimeout=600000
- Checkpoint verification result: PASS — step 1, the Test file: Test Files 1 passed (1); Tests 23 passed (23), naming both TDD-0093 cases as passed. Step 2, the full suite: Test Files 771 passed | 3 skipped (774); Tests 14555 passed | 82 skipped (14637), exit 0. The worker count and per-test timeout are raised because two slow suites time out at the default under a full parallel run on this host
- Checkpoint verification revision: b20dbe4bc5c90581a030cdda8656107b85415a2c
- Checkpoint verification seal: de5d644d1a9f3d0f6fdaf6d29e977a36a542e4d23303e0df85ae3006efd73032

### TDD-0001

- TDD-ID: TDD-0001
- Layer: integration
- Test file: packages/qfai/tests/integration/initSpec0003.test.ts
- Selector: TC-0003-0001: Empty directory initialization
- TC-ref: TC-0003-0001
- Branch: falsifiability — init already writes no artifact directory, so the case passes on its first run and no natural RED can be observed
- Predicate to break: packages/qfai/src/cli/commands/init.ts:509, `copyTemplateTree(qfaiAssets, destQfai, …)` — it writes under `.qfai/` what `packages/qfai/assets/init/.qfai/` ships, and that tree holds `assistant/` and `waivers.yml` and no artifact directory
- Mutation: add an empty file `packages/qfai/assets/init/.qfai/specs/.gitkeep`
- Why it fails: init copies the new `specs/` directory into `.qfai/`, and the bullet 1 assertion at line 75 finds `specs` among the six artifact directories
- Other rows: the same mutation fails `tests/e2e/initE2E.test.ts` "creates .qfai/ with assistant assets and no artifact scaffold", the test `TDD-0069` (`US-0003-0001`, `todo`) is expected to take, and `tests/cli/init.test.ts` "does not create artifact scaffold outside assistant assets", which no ledger row names. Both were run under the mutation and failed on an assertion. `TDD-0002` to `TDD-0015` share the Test file and are `exception`; `TDD-0025` shares it and is `done` (see the re-verify below)

The case replaces the backfill test that only read `init.ts` for the string
`runInit`. It runs `runInit` into an empty temporary directory and asserts all
three verify bullets of `TC-0003-0001`. No other ledger row cites the case.

| Verify bullet | Assertion | Line |
| ------------- | --------- | ---- |
| 1 | `.qfai/assistant/` is a directory, and none of `specs`, `contracts`, `discussion`, `evidence`, `review` and `report` exists under `.qfai/` | 70, 75 |
| 2 | `qfai.config.yaml` is a file | 78 |
| 3 | every `qfai-*` skill directory under `.qfai/assistant/skills/` is a symlink in each of `.claude/skills`, `.agents/skills`, `.codex/skills` and `.github/skills`, and its target ends in `.qfai/assistant/skills/<skill>`; a guard first requires at least one such skill | 87, 98 |

Bullet 3 is checked the way `tests/cli/init.test.ts` "creates template additions
with symlinks" checks one skill: `lstat` reports a symbolic link and `readlink`
names the canonical directory. That file's two helpers are local to it, so the
check is written inline. It requires a real symlink on every platform, as that
test does: init has no fallback for a link it cannot create, and on Windows
without Developer Mode it stops with an error instead.

The describe title is unchanged, so the ledger's `Test file` and `Selector`
already name the case. The mutation below breaks bullet 1, the obligation the
change request moved, and it stays the row's predicate.

The two tests the change request names assert the same clause and cannot be this
row's test. `TC-0003-0001` declares `Level: integration`, so its home is
`tests/integration/**`. `initE2E.test.ts` is under `tests/e2e/**`, where
`QFAI-ATDD-122` refuses a `TC-0003-0001` annotation and the row's `integration`
Layer would not match the path. `tests/cli/init.test.ts` is in no layer directory,
and it asserts only that no file is written under the six directories. The Layer
is right for the Test file. The file's header already carries
`// QFAI:SPEC-0003:TC-0003-0001` (line 11), so no annotation was added.

- First-run command: pnpm -C packages/qfai exec vitest run tests/integration/initSpec0003.test.ts -t "TC-0003-0001: Empty directory initialization"
- First-run result: PASS — Test Files 1 passed (1); Tests 1 passed | 23 skipped (24)
- Mutation trial command: the same command, with the empty file `packages/qfai/assets/init/.qfai/specs/.gitkeep` added
- Mutation trial result: FAIL — Test Files 1 failed (1); Tests 1 failed | 23 skipped (24). The row's case fails on `AssertionError: init wrote an artifact directory under .qfai/: expected [ 'specs' ] to deeply equal []` at `tests/integration/initSpec0003.test.ts:75:72`
- Mutation trial revision: working-tree+9ba92159e7f398085ba887d31a27152e3353cb5b9f171bea46d6793ab3716d2f
- Restored GREEN command: the same command, after `rm -rf packages/qfai/assets/init/.qfai/specs`
- Restored GREEN result: PASS — Test Files 1 passed (1); Tests 1 passed | 23 skipped (24)
- Test file command: pnpm -C packages/qfai exec vitest run tests/integration/initSpec0003.test.ts
- Test file result: PASS — Test Files 1 passed (1); Tests 24 passed (24)
- Test file revision: working-tree+7e98884c7e3c2ab9aa28703507d9661672229d1a78219c693a823672c1bb78b0

The trial shows the mutation discriminates. It is not the row's falsifiability
trio: `/qfai-implement` Phase Red step 3c applies the mutation, records the
`Round 1:` fields and routes `qa-gatekeeper` while it is in the tree.

- RED test hash: 5944d673da0c6056d3cb765a2a2bb103efe8ab8595e2f0b3d11715a7bb56ecb3
- RED test manifest:

```text
packages/qfai/tests/helpers/stdout.ts
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/initSpec0003.test.ts
```

#### Shared-artifact re-verify

No RED test manifest in any evidence file names
`packages/qfai/tests/integration/initSpec0003.test.ts`, so no recorded hash moves and
no `spec-NNNN/TDD-NNNN` subsection is owed. The one other `done` row whose Test file
this is, `spec-0003/TDD-0025`, carries no manifest and no recorded mutation, and its
describe is unchanged. Its selector was re-run against the edited file:

- Re-verify command: pnpm -C packages/qfai exec vitest run tests/integration/initSpec0003.test.ts -t "TC-0003-0025: assistantPaths.ts SSOT module"
- Re-verify result: PASS — Test Files 1 passed (1); Tests 1 passed | 23 skipped (24)
- Re-verify revision: working-tree+7e98884c7e3c2ab9aa28703507d9661672229d1a78219c693a823672c1bb78b0

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/cli/commands/init.ts, `runInit`, `copyTemplateTree(qfaiAssets, destQfai, …)` at line 509 — it writes under `.qfai/` exactly the tree `packages/qfai/assets/init/.qfai/` ships, which holds `assistant/` and `waivers.yml` and no artifact directory
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/initSpec0003.test.ts -t "TC-0003-0001: Empty directory initialization"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 23 skipped (24). The row's case fails on `AssertionError: init wrote an artifact directory under .qfai/: expected [ 'specs' ] to deeply equal []` at `tests/integration/initSpec0003.test.ts:75:72`

The edit, an empty file added to the shipped tree:

```diff
diff --git a/packages/qfai/assets/init/.qfai/specs/.gitkeep b/packages/qfai/assets/init/.qfai/specs/.gitkeep
new file mode 100644
index 000000000..e69de29bb
```

- Round 1: Falsifiability revision: working-tree+66d3dc33e57a53cc76dcc281e6545ef8d68d826d2555de7de7dd3a97f8ee6fbc
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 5944d673da0c6056d3cb765a2a2bb103efe8ab8595e2f0b3d11715a7bb56ecb3
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/stdout.ts
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/initSpec0003.test.ts
```

- Round 1: Revision: 0d2064bd1dd3e976ae8e39ea31b9c04f6e180209
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/initSpec0003.test.ts -t "TC-0003-0001: Empty directory initialization"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 23 skipped (24). Run after `rm -rf packages/qfai/assets/init/.qfai/specs`, which leaves the shipped tree as it is at that revision

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/initSpec0003.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 24 passed (24). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite. Re-run on the tree the reviews read
- Refactor verify revision: e4e818d9bd641e56c55f4d074280a636687f008b
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the rebuilt falsifiability run (specs/.gitkeep, bullet 1 assertion at :75:72), reviewed revision working-tree+66d3dc33e57a53cc76dcc281e6545ef8d68d826d2555de7de7dd3a97f8ee6fbc; build-phase GREEN + oracle proof, reviewed revision e4e818d9bd641e56c55f4d074280a636687f008b

- Spec review: PASS
- Spec reviewed revision: e4e818d9bd641e56c55f4d074280a636687f008b
- Spec audited evidence hash: c9e4fa914bfecb2b1c0ec1abebbfc19acb167e656ef5c45077a0af023afa4076
- Spec review pack: .qfai/review/review-20260923130000000 <!-- qfai:not-a-citation -->
- Spec review pack seal: 888b53a0d9cfa5c89fd4ea9ac62938512b5980f0b823e07af34320a79ada6dc5
- Code quality review: PASS
- Code quality reviewed revision: e4e818d9bd641e56c55f4d074280a636687f008b
- Code quality audited evidence hash: c9e4fa914bfecb2b1c0ec1abebbfc19acb167e656ef5c45077a0af023afa4076
- Code quality review pack: .qfai/review/review-20260923130000000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 888b53a0d9cfa5c89fd4ea9ac62938512b5980f0b823e07af34320a79ada6dc5
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: e4e818d9bd641e56c55f4d074280a636687f008b
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/initSpec0003.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 24 passed (24). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: e4e818d9bd641e56c55f4d074280a636687f008b
- Checkpoint verification seal: fa5e87e093c231ba3b1b8725963c7774c8321994ac37406340a3650286aeacb4

### TDD-0037

- TDD-ID: TDD-0037
- Layer: Integration
- Test file: packages/qfai/tests/integration/shippedWorkflowInertness.test.ts
- Selector: TC-0003-0037 (TDD-0037): three installing job declarations, nine and eight executing instances, zero secret references
- TC-ref: TC-0003-0037
- Branch: falsifiability — recorded where the row closed, `.qfai/evidence/implement-spec-0003.md#tdd-0037`. This entry records a test-only replacement and changes no branch

`CR-20260923-0011` asked for the row's test names to state the counts the case
asserts. Two title strings changed and no assertion did:

| Title | Before | After |
| ----- | ------ | ----- |
| `describe`, line 360 | `TC-0003-0037 (TDD-0037): two installing job declarations, four and three executing instances, zero secret references` | `TC-0003-0037 (TDD-0037): three installing job declarations, nine and eight executing instances, zero secret references` |
| `it`, line 469 | `the init-written jobs that install dependencies are exactly the docs and validate lanes, four instances on a pull request and three on a push` | `the init-written jobs that install dependencies are exactly the docs, test and validate lanes, nine instances on a pull request and eight on a push` |

The `Selector` above names the renamed describe, which holds the row's three cases
and nothing else. The ledger still holds the old describe title. `/qfai-implement`
writes the value above to the ledger and to its own entry's copy; until it does,
`TDDLIST_SELECTOR_UNRESOLVED` is reported on row 37. No other ledger row's
`Selector` named either old title.

- Selector run command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowInertness.test.ts -t "TC-0003-0037 \(TDD-0037\): three installing job declarations, nine and eight executing instances, zero secret references"
- Selector run result: PASS — Test Files 1 passed (1); Tests 3 passed | 3 skipped (6)
- Selector run revision: working-tree+b6717d99336497714758bb9eafe114d2ddc4f4c194e332da052432f02b99161f
- Proof to re-take: the two mutations the earlier entry names — a `secrets.QFAI_LEAKED` reference planted in the verdict step's `env:` of `packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml`, and a `run: npm ci` step appended to its `detection` job

#### Shared-artifact re-verify

No RED test manifest in `.qfai/evidence/atdd-spec-0003.md`, or in any other evidence
file, names `packages/qfai/tests/integration/shippedWorkflowInertness.test.ts`, so no
recorded hash moves and no `spec-NNNN/TDD-NNNN` subsection is owed. The one other
`done` row whose Test file this is, `spec-0003/TDD-0036`, has its evidence at
`.qfai/evidence/implement-spec-0003.md#tdd-0036`, which records no manifest. Its
describe is byte-identical after the rename, and its selector was re-run:

- Re-verify command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowInertness.test.ts -t "TC-0003-0036 \(TDD-0036\): no declared layer script means zero executing test lanes"
- Re-verify result: PASS — Test Files 1 passed (1); Tests 3 passed | 3 skipped (6)
- Re-verify revision: working-tree+b6717d99336497714758bb9eafe114d2ddc4f4c194e332da052432f02b99161f

#### Round 1

- Round 1: Satisfied-by: packages/qfai/assets/init/root/.github/workflows/, every workflow file init writes — none carries a `secrets` reference, a secret declaration or `secrets: inherit`, and only `qfai-docs.yml#checks`, `qfai-tests.yml#tests` and `qfai-validate.yml#validate` install dependencies. The lanes were built by TDD-0035, TDD-0038 to TDD-0040, TDD-0027 and TDD-0055; the zero-secret property has held since the set shipped
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowInertness.test.ts -t "TC-0003-0037 \(TDD-0037\): three installing job declarations, nine and eight executing instances, zero secret references"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 2 passed | 3 skipped (6). The secret case fails on `AssertionError: expected [ Array(1) ] to deeply equal []` at `tests/integration/shippedWorkflowInertness.test.ts:549:24`, naming `qfai-tests.yml:677: secret context reference`

The edit, a secret reference planted in the verdict step's `env:` of `packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml`:

```diff
           QFAI_SELECTED: ${{ needs.detection.outputs.selected }}
+          QFAI_LEAKED: ${{ secrets.QFAI_LEAKED }}
```

- Round 1: Falsifiability revision: working-tree+27a64a572f3b9dde75c9f714c23c1cfd41db2d7888b293654d82671f282d412b
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 30ebc3cb08f888b4c46df68667a8b4c82e538837b44ed2d96193fb60a897e236
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/shippedWorkflowFixtures.ts
packages/qfai/tests/helpers/stdout.ts
packages/qfai/tests/integration/shippedWorkflowInertness.test.ts
```

The earlier entry records no `RED test hash`, so none is overwritten. Over the same
manifest the file hashed to
`64780749016ea65cecf5f8e5ccb7233deb631be8257daf9f9680091f63b67450` before the rename.

- Round 1: RED test replacement: test-only replacement — CR-20260923-0011 asked for the describe and the count case to be renamed; the proof at .qfai/evidence/implement-spec-0003.md#tdd-0037 is stale — test replaced, and /qfai-implement re-takes it under the corrected test
- Round 1: Replacement proof revision: working-tree+27a64a572f3b9dde75c9f714c23c1cfd41db2d7888b293654d82671f282d412b
- Round 1: Replacement proof command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowInertness.test.ts -t "TC-0003-0037 \(TDD-0037\): three installing job declarations, nine and eight executing instances, zero secret references"
- Round 1: Replacement proof result: Test Files 1 failed (1); Tests 1 failed | 2 passed | 3 skipped (6). The planted secret the proof at .qfai/evidence/implement-spec-0003.md#tdd-0037 names, re-run under the renamed test, fails the secret case on `AssertionError: expected [ Array(1) ] to deeply equal []` at `tests/integration/shippedWorkflowInertness.test.ts:549:24`. Over the whole test file the same edit fails that case alone: Tests 1 failed | 5 passed (6)

A second mutation, the one the earlier entry ran beyond the proof, exercises the other two cases. It is not the row's proof:

- Command: the same command, with a `run: npm ci` step appended to the `detection` job of the same file
- Result: Test Files 1 failed (1); Tests 2 failed | 1 passed | 3 skipped (6). The count case fails on `AssertionError: expected [ …(4) ] to deeply equal [ …(3) ]` at `tests/integration/shippedWorkflowInertness.test.ts:499:68`, with `detection` as the extra entry, and the detection case fails on `AssertionError: expected [ Array(1) ] to deeply equal []` at `:574:24`, naming `detection job installs dependencies`
- Revision: working-tree+ceced760cb9f30ce532c18e001c8b48dbbc5cc5ab4806957a499b90b2fbd4e07

```diff
           echo "qfai tests: lanes to run ${selected}"
+      - name: Install dependencies
+        run: npm ci
   tests:
```

- Round 1: Revision: e4e818d9bd641e56c55f4d074280a636687f008b
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowInertness.test.ts -t "TC-0003-0037 \(TDD-0037\): three installing job declarations, nine and eight executing instances, zero secret references"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 3 passed | 3 skipped (6). Run after `git checkout -- packages/qfai/assets/init/root/.github/workflows/qfai-tests.yml`, which restored the file after each mutation

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowInertness.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 6 passed (6). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: e4e818d9bd641e56c55f4d074280a636687f008b
- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the rebuilt falsifiability run (planted secrets.QFAI_LEAKED in the verdict step, secret case at :549:24) and the TDD-0036 shared-artifact re-verify, reviewed revision working-tree+27a64a572f3b9dde75c9f714c23c1cfd41db2d7888b293654d82671f282d412b; build-phase GREEN + oracle proof, reviewed revision e4e818d9bd641e56c55f4d074280a636687f008b

- Spec review: PASS
- Spec reviewed revision: e4e818d9bd641e56c55f4d074280a636687f008b
- Spec audited evidence hash: b1eedd2b472ea8a6c5b8e3814205694077a4c345f1bf07c83309f858d1ae9af1
- Spec review pack: .qfai/review/review-20260923130001000 <!-- qfai:not-a-citation -->
- Spec review pack seal: 19c315faa2751606c83ee1e5e877c1053aff72c126ce80e3fa0e3d16ea95ce1e
- Code quality review: PASS
- Code quality reviewed revision: e4e818d9bd641e56c55f4d074280a636687f008b
- Code quality audited evidence hash: b1eedd2b472ea8a6c5b8e3814205694077a4c345f1bf07c83309f858d1ae9af1
- Code quality review pack: .qfai/review/review-20260923130001000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 19c315faa2751606c83ee1e5e877c1053aff72c126ce80e3fa0e3d16ea95ce1e
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: e4e818d9bd641e56c55f4d074280a636687f008b
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run --maxWorkers=7 --testTimeout=600000
- Checkpoint verification result: PASS — the last row of this run, so the full suite ran: Test Files 771 passed | 3 skipped (774); Tests 14565 passed | 82 skipped (14647)
- Checkpoint verification revision: e4e818d9bd641e56c55f4d074280a636687f008b
- Checkpoint verification seal: 645095fba21747e6dc9b7be0b1a48e5dd514dd440649e88e89a443576ba712a4

### TDD-0094

- TDD-ID: TDD-0094
- Layer: Integration
- Test file: packages/qfai/tests/integration/initCopilotLegacyWindow.test.ts
- Selector: TC-0003-0059 (TDD-0094): generated Copilot instructions state the closed legacy window
- TC-ref: TC-0003-0059
- Branch: observed-red — the surface existed and was wrong. `buildCopilotInstructions` in `packages/qfai/src/cli/commands/init.ts` wrote a legacy-layout item that called the layout read-compatible and the finding a warning, so the case failed on its first run against the tree before the fix
- Oracle proof plan: delete the legacy-layout item from `buildCopilotInstructions`. The three cases that read the item then fail on an assertion

`CR-20260925-0011` seeded the row for `TC-0003-0059`. The case runs `runInit`
into an empty temporary directory, reads the `.github/copilot-instructions.md`
it wrote, and takes the top-level list item that mentions `D-DEPRECATED-PATH`,
with its continuation lines joined.

| Verify bullet | Assertion                                                                                                                 | Line   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1             | the item names `.qfai/assistant/steering/` and `.qfai/assistant/instructions/`, and says `past its compatibility window` | 41-43  |
| 2             | the item says `` `qfai init` reports it on stderr as a `D-DEPRECATED-PATH` error ``                                       | 47     |
| 3             | the item names `` `qfai init --upgrade-assistant-tree` ``                                                                 | 51     |
| 4             | the file does not match `/read-compatible/i`, and the item does not match `/warning/i`                                    | 55, 56 |

The file header carries `// QFAI:SPEC-0003:TC-0003-0059`, and
`tests/integration/qfai-traceability.md` carries the case. The file is listed in
`packages/qfai/tsconfig.tests.json`. `delivery-planner` approved the selector as
one boundary before the RED was taken. On `test-design-analyst`'s advice the
bullet 4 check reads any `warning` in the item rather than one phrasing of it.

The selector contains `(` and `)`. Escape both when passing it to vitest `-t`.

#### Shared-artifact re-verify

The Test file is new, and the manifest's two helpers are unchanged, so no
recorded `RED test hash` moves and no `spec-NNNN/TDD-NNNN` subsection is owed.

#### Round 1

- Round 1: RED command: pnpm -C packages/qfai exec vitest run tests/integration/initCopilotLegacyWindow.test.ts -t "TC-0003-0059 \(TDD-0094\): generated Copilot instructions state the closed legacy window"
- Round 1: RED result: FAIL — Test Files 1 failed (1); Tests 3 failed | 1 passed (4). Bullet 1 fails on `AssertionError: expected '- Legacy .qfai/assistant/steering/ …' to contain '.qfai/assistant/instructions/'` at `tests/integration/initCopilotLegacyWindow.test.ts:42:24`; bullet 2 on `expected '- Legacy .qfai/assistant/steering/ …' to contain 'qfai init reports it on stderr as a…'` at `:47:24`; bullet 4 on `expected '# QFAI repository instructions (Copil…' not to match /read-compatible/i` at `:55:22`. Bullet 3 passes: the old item already named the migration command
- Round 1: RED failure mode: assertion
- Round 1: RED revision: cb835cbff1313257292d405fa4b39d0f703b59a5
- Round 1: RED assertion-stripped result:

```text
diff --git a/packages/qfai/tests/integration/initCopilotLegacyWindow.test.ts b/packages/qfai/tests/integration/initCopilotLegacyWindow.test.ts
@@ -38,21 +38,21 @@
   it("names both legacy surfaces and says their compatibility window has closed", () => {
-    expect(legacyItem).toContain("`.qfai/assistant/steering/`");
-    expect(legacyItem).toContain("`.qfai/assistant/instructions/`");
-    expect(legacyItem).toContain("past its compatibility window");
+    void expect(legacyItem); void "`.qfai/assistant/steering/`";
+    void expect(legacyItem); void "`.qfai/assistant/instructions/`";
+    void expect(legacyItem); void "past its compatibility window";
   });
   it("says qfai init reports the layout on stderr as a D-DEPRECATED-PATH error", () => {
-    expect(legacyItem).toContain("`qfai init` reports it on stderr as a `D-DEPRECATED-PATH` error");
+    void expect(legacyItem); void "`qfai init` reports it on stderr as a `D-DEPRECATED-PATH` error";
   });
   it("names the migration command", () => {
-    expect(legacyItem).toContain("`qfai init --upgrade-assistant-tree`");
+    void expect(legacyItem); void "`qfai init --upgrade-assistant-tree`";
   });
   it("calls the layout neither read-compatible nor the finding a warning", () => {
-    expect(text).not.toMatch(/read-compatible/i);
-    expect(legacyItem).not.toMatch(/warning/i);
+    void expect(text); void /read-compatible/i;
+    void expect(legacyItem); void /warning/i;
   });

$ pnpm -C packages/qfai exec vitest run tests/integration/initCopilotLegacyWindow.test.ts -t "TC-0003-0059 \(TDD-0094\): generated Copilot instructions state the closed legacy window"
 Test Files  1 passed (1)
      Tests  4 passed (4)
exit 0. The file holds only this describe, so the four passing tests are the selector's four cases, none skipped. The test was restored with git checkout right after the run
```

- Round 1: RED test hash: 3a275edc43b270cfc60e2a298e42da2d829fd64507a9ceaf9bd95fc0fba18baa
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/stdout.ts
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/initCopilotLegacyWindow.test.ts
```

- Round 1: Revision: 65dc89241e8066d966498df056757471880ea433
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/initCopilotLegacyWindow.test.ts -t "TC-0003-0059 \(TDD-0094\): generated Copilot instructions state the closed legacy window"
- Round 1: GREEN result: PASS — Test Files 1 passed (1); Tests 4 passed (4)
- Round 1: Oracle proof: mutation — the three lines of the legacy-layout item deleted from `buildCopilotInstructions` in `packages/qfai/src/cli/commands/init.ts`, whose blob is 94c2c242053742f9a45c10e6d8b823390b8749e1 before and after. Command: pnpm -C packages/qfai exec vitest run tests/integration/initCopilotLegacyWindow.test.ts -t "TC-0003-0059 \(TDD-0094\): generated Copilot instructions state the closed legacy window", which selects TC-0003-0059 (TDD-0094): generated Copilot instructions state the closed legacy window. Result: FAIL — Test Files 1 failed (1); Tests 3 failed | 1 passed (4): `AssertionError: expected '' to contain '.qfai/assistant/steering/'` at `tests/integration/initCopilotLegacyWindow.test.ts:41:24`, `expected '' to contain 'qfai init reports it on stderr as a…'` at `:47:24`, `expected '' to contain 'qfai init --upgrade-assistant-tree'` at `:51:24`. Reverted by restoring the file, whose blob is again 94c2c242053742f9a45c10e6d8b823390b8749e1; the same command then passes: Test Files 1 passed (1); Tests 4 passed (4)

The RED showed bullets 1, 2 and 4 failing against the wrong text, and the
Oracle proof showed bullets 1 to 3 failing without the item, so every case in
the selector has been seen to fail.

The Refactor verify fields taken after Round 1, superseded by the ones after Round 2:

```text
- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/initCopilotLegacyWindow.test.ts tests/cli/init.test.ts tests/cli/initAgentEntryPointRules.test.ts tests/e2e/initE2E.test.ts tests/integration/agentsRulesSurface.test.ts tests/integration/distributedSurfaceLeakage.test.ts tests/assets/outputLanguageSingleSource.test.ts tests/cli/main.test.ts tests/integration/shippedWorkflowDetection.test.ts
- Refactor verify result: PASS — Test Files 9 passed (9); Tests 783 passed (783). No production or test file changed in this phase. The suite is the row's Test file, every test that reads the generated or the repository's Copilot instructions, and the detection file whose case title this change renamed
- Refactor verify revision: 1ebcbe0ee2d7578f3cbad0d004cb6e540afb8de3
```

- qa-gatekeeper: PASS x2 (qa-gatekeeper#2 — RED phase gate at routing phase red on the Round 2 observed RED against the pre-fix item (bullets 1, 2, 4 at :42:24, :47:24, :55:22) and its assertion-stripped run, reviewed revision working-tree+10211e58331aa55965284d65840388a810a5cdac73312e4634f5d957ea196a94; qa-gatekeeper#3 — build-phase GREEN (4 of 4) + oracle proof (legacy-layout item deleted, bullets 1-3 at :41:24, :47:24, :51:24; restored to blob 94c2c242053742f9a45c10e6d8b823390b8749e1), reviewed revision 1365bf908d90c90ec068a24eeb5c0852de9a3ec1)
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, Round 1, stale — RED gate and build gate both taken after GREEN and refactor, on the kept RED commit cb835cbff1313257292d405fa4b39d0f703b59a5 and build revision b639815a9f23e6de8f2e59baf28c62f3935814f0; superseded by Round 2. qa-gatekeeper#2 PASS, Round 2 RED phase gate at routing phase red, reviewed revision working-tree+10211e58331aa55965284d65840388a810a5cdac73312e4634f5d957ea196a94. qa-gatekeeper#3 PASS, Round 2 build-phase GREEN + oracle proof, reviewed revision 1365bf908d90c90ec068a24eeb5c0852de9a3ec1

- Round 1: reviewer verdict (attempt 1): REVISE — completion-reviewer: the observed RED was not gated before GREEN, the test and fix name no sub-agent, and the coverage matrix lacks TC-0003-0059; the row goes back for a fresh observation as Round 2
- Round 1: Review pack (attempt 1): .qfai/review/review-20260925140000000 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): 732b7ea573b06e1ec2e303ecada1c24fc8becfcb98fe9232de59bac6b60b8f25

#### Round 2

A fresh observation, taken because the attempt-1 completion review found the
Round 1 RED was not gated before GREEN. The legacy-layout item in
`buildCopilotInstructions` in `packages/qfai/src/cli/commands/init.ts` was put
back to its text at cb835cbff1313257292d405fa4b39d0f703b59a5, and nothing else
in the tree was changed: the file's blob is again
22b6941ccebc1cf46ea8a787c53102290e793598, the blob it had there. The change is
left uncommitted so the RED gate reviews the tree the RED ran on.

- Round 2: RED command: pnpm -C packages/qfai exec vitest run tests/integration/initCopilotLegacyWindow.test.ts -t "TC-0003-0059 \(TDD-0094\): generated Copilot instructions state the closed legacy window"
- Round 2: RED result: FAIL — Test Files 1 failed (1); Tests 3 failed | 1 passed (4), exit 1. Bullet 1 fails on `AssertionError: expected '- Legacy .qfai/assistant/steering/ …' to contain '.qfai/assistant/instructions/'` at `tests/integration/initCopilotLegacyWindow.test.ts:42:24`; bullet 2 on `expected '- Legacy .qfai/assistant/steering/ …' to contain 'qfai init reports it on stderr as a…'` at `:47:24`; bullet 4 on `expected '# QFAI repository instructions (Copil…' not to match /read-compatible/i` at `:55:22`. Bullet 3, `names the migration command`, passes: the old item already named the migration command
- Round 2: RED failure mode: assertion
- Round 2: RED revision: working-tree+10211e58331aa55965284d65840388a810a5cdac73312e4634f5d957ea196a94
- Round 2: RED assertion-stripped result:

```text
diff --git a/packages/qfai/tests/integration/initCopilotLegacyWindow.test.ts b/packages/qfai/tests/integration/initCopilotLegacyWindow.test.ts
@@ -40,5 +40,5 @@
   it("names both legacy surfaces and says their compatibility window has closed", () => {
-    expect(legacyItem).toContain("`.qfai/assistant/steering/`");
-    expect(legacyItem).toContain("`.qfai/assistant/instructions/`");
-    expect(legacyItem).toContain("past its compatibility window");
+    void expect(legacyItem); void "`.qfai/assistant/steering/`";
+    void expect(legacyItem); void "`.qfai/assistant/instructions/`";
+    void expect(legacyItem); void "past its compatibility window";
   });
@@ -46,3 +46,3 @@
   it("says qfai init reports the layout on stderr as a D-DEPRECATED-PATH error", () => {
-    expect(legacyItem).toContain("`qfai init` reports it on stderr as a `D-DEPRECATED-PATH` error");
+    void expect(legacyItem); void "`qfai init` reports it on stderr as a `D-DEPRECATED-PATH` error";
   });
@@ -50,3 +50,3 @@
   it("names the migration command", () => {
-    expect(legacyItem).toContain("`qfai init --upgrade-assistant-tree`");
+    void expect(legacyItem); void "`qfai init --upgrade-assistant-tree`";
   });
@@ -54,4 +54,4 @@
   it("calls the layout neither read-compatible nor the finding a warning", () => {
-    expect(text).not.toMatch(/read-compatible/i);
-    expect(legacyItem).not.toMatch(/warning/i);
+    void expect(text); void /read-compatible/i;
+    void expect(legacyItem); void /warning/i;
   });

$ pnpm -C packages/qfai exec vitest run tests/integration/initCopilotLegacyWindow.test.ts -t "TC-0003-0059 \(TDD-0094\): generated Copilot instructions state the closed legacy window"
 Test Files  1 passed (1)
      Tests  4 passed (4)
exit 0. Run on the same tree as the RED, with init.ts still at its pre-fix text. The file holds only this describe, so the four passing tests are the selector's four cases, none skipped. The test was restored with git checkout right after the run; its blob is again 6aa0cdfaf3f2eec7a8aedbff9590b9c7f4359682
```

- Round 2: RED test hash: 3a275edc43b270cfc60e2a298e42da2d829fd64507a9ceaf9bd95fc0fba18baa
- Round 2: RED test manifest:

```text
packages/qfai/tests/helpers/stdout.ts
packages/qfai/tests/helpers/tempTree.ts
packages/qfai/tests/integration/initCopilotLegacyWindow.test.ts
```

- Round 2: Revision: 1365bf908d90c90ec068a24eeb5c0852de9a3ec1
- Round 2: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/initCopilotLegacyWindow.test.ts -t "TC-0003-0059 \(TDD-0094\): generated Copilot instructions state the closed legacy window"
- Round 2: GREEN result: PASS — Test Files 1 passed (1); Tests 4 passed (4), exit 0. Taken after `packages/qfai/src/cli/commands/init.ts` was restored to its committed fixed text, whose blob is 94c2c242053742f9a45c10e6d8b823390b8749e1
- Round 2: Oracle proof: mutation — the three lines of the legacy-layout item deleted from `buildCopilotInstructions` in `packages/qfai/src/cli/commands/init.ts`, whose blob is 94c2c242053742f9a45c10e6d8b823390b8749e1 before and after. Command: pnpm -C packages/qfai exec vitest run tests/integration/initCopilotLegacyWindow.test.ts -t "TC-0003-0059 \(TDD-0094\): generated Copilot instructions state the closed legacy window", which selects TC-0003-0059 (TDD-0094): generated Copilot instructions state the closed legacy window. Result: FAIL — Test Files 1 failed (1); Tests 3 failed | 1 passed (4), exit 1: `AssertionError: expected '' to contain '.qfai/assistant/steering/'` at `tests/integration/initCopilotLegacyWindow.test.ts:41:24`, `expected '' to contain 'qfai init reports it on stderr as a…'` at `:47:24`, `expected '' to contain 'qfai init --upgrade-assistant-tree'` at `:51:24`. Reverted with git checkout, after which the blob is again 94c2c242053742f9a45c10e6d8b823390b8749e1; the same command then passes: Test Files 1 passed (1); Tests 4 passed (4)

Round 2's RED showed bullets 1, 2 and 4 failing against the pre-fix text, and its
Oracle proof showed bullets 1 to 3 failing without the item, so every case in
the selector has again been seen to fail.

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/initCopilotLegacyWindow.test.ts tests/cli/init.test.ts tests/cli/initAgentEntryPointRules.test.ts tests/e2e/initE2E.test.ts tests/integration/agentsRulesSurface.test.ts tests/integration/distributedSurfaceLeakage.test.ts tests/assets/outputLanguageSingleSource.test.ts tests/cli/main.test.ts tests/integration/shippedWorkflowDetection.test.ts
- Refactor verify result: PASS — Test Files 9 passed (9); Tests 783 passed (783), exit 0. No production or test file changed in this phase. The suite is the one recorded after Round 1: the row's Test file, every test that reads the generated or the repository's Copilot instructions, and the detection file whose case title this change renamed
- Refactor verify revision: 1365bf908d90c90ec068a24eeb5c0852de9a3ec1

- Round 2: reviewer verdict (attempt 1): PASS
- Round 2: Review pack (attempt 1): .qfai/review/review-20260925140010000 <!-- qfai:not-a-citation -->
- Round 2: Review pack seal (attempt 1): 67a950093ce5e5dbb5f76e4c7cbd1c7ea598bdeb7be388099d0acaffa360a089
- Spec review: PASS
- Spec reviewed revision: 1365bf908d90c90ec068a24eeb5c0852de9a3ec1
- Spec audited evidence hash: 0146a231cf9d4607e9ca825b176d4a8494b141b8eeee7f631cd5f44870b7b201
- Spec review pack: .qfai/review/review-20260925140010000 <!-- qfai:not-a-citation -->
- Spec review pack seal: 67a950093ce5e5dbb5f76e4c7cbd1c7ea598bdeb7be388099d0acaffa360a089
- Code quality review: PASS
- Code quality reviewed revision: 1365bf908d90c90ec068a24eeb5c0852de9a3ec1
- Code quality audited evidence hash: 0146a231cf9d4607e9ca825b176d4a8494b141b8eeee7f631cd5f44870b7b201
- Code quality review pack: .qfai/review/review-20260925140010000 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 67a950093ce5e5dbb5f76e4c7cbd1c7ea598bdeb7be388099d0acaffa360a089
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: 1365bf908d90c90ec068a24eeb5c0852de9a3ec1
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/initCopilotLegacyWindow.test.ts tests/cli/init.test.ts tests/cli/initAgentEntryPointRules.test.ts tests/e2e/initE2E.test.ts tests/integration/agentsRulesSurface.test.ts tests/integration/distributedSurfaceLeakage.test.ts tests/assets/outputLanguageSingleSource.test.ts tests/cli/main.test.ts tests/integration/shippedWorkflowDetection.test.ts
- Checkpoint verification result: PASS — PASS — Test Files 9 passed (9); Tests 783 passed (783). Off a checkpoint boundary, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: 1ebcbe0ee2d7578f3cbad0d004cb6e540afb8de3
- Checkpoint verification seal: e355f7b07a46e63150a7980e9035766f2e37b4c3dd9a99a056ddc79f7581cc15

### TDD-0126

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/init/managedGitignoreBlock.test.ts`
- Selector: `TC-0003-0090: Fresh init ignores run state and keeps run evidence tracked`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/init/managedGitignoreBlock.test.ts --testNamePattern='TC-0003-0090: Fresh init ignores run state and keeps run evidence tracked' --reporter=verbose`
- RED result: exit 1; `AssertionError: .qfai/runs/x: expected false to be true // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/src/core/gitignore.ts`, `packages/qfai/src/cli/commands/init.ts`, `packages/qfai/tests/integration/init/managedGitignoreBlock.test.ts`, `packages/qfai/tests/integration/init/upgradeStates.ts`

### TDD-0095

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/init/managedGitignoreBlock.test.ts`
- Selector: `TC-0003-0060: Upgrade over the previous managed block, then a rerun`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/init/managedGitignoreBlock.test.ts --testNamePattern='TC-0003-0060: Upgrade over the previous managed block, then a rerun' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected +0 to be 1 // Object.is equality` (the upgraded block carried no `.qfai/runs/`)
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/src/core/gitignore.ts`, `packages/qfai/src/cli/commands/init.ts`, `packages/qfai/tests/integration/init/managedGitignoreBlock.test.ts`, `packages/qfai/tests/integration/init/upgradeStates.ts`
- An upgrade adds `.qfai/runs/` to an existing block that lacks it; every other ignore line keeps the rule that init never re-adds one the block does not have.

### TDD-0096

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/init/windowsParity.test.ts`
- Selector: `TC-0003-0061: The previous managed block in a CRLF .gitignore`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/init/windowsParity.test.ts --testNamePattern='TC-0003-0061: The previous managed block in a CRLF .gitignore' --reporter=verbose`
- RED result: exit 1; `AssertionError: no block line is duplicated: expected [ Array(22) ] to deeply equal []` (every governance negation written twice: the block's end was found by comparing lines that still carried their carriage return)
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/src/cli/commands/init.ts`, `packages/qfai/tests/integration/init/windowsParity.test.ts`

### TDD-0097

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/init/entryInstallSet.test.ts`
- Selector: `TC-0003-0062: Fresh init installs the entry skills, plans and references`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/init/entryInstallSet.test.ts --testNamePattern='TC-0003-0062: Fresh init installs the entry skills, plans and references' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (Tests 1 passed); the plans landed in the asset commit of this chunk and the entry skills and references in earlier batch commits, and the existing asset copy installs them
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/process/workflows/`, `packages/qfai/tests/integration/init/entryInstallSet.test.ts`

### TDD-0098

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/init/entryInstallSet.test.ts`
- Selector: `TC-0003-0063: Four host skill dirs resolve both entry skills to one source`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/init/entryInstallSet.test.ts --testNamePattern='TC-0003-0063: Four host skill dirs resolve both entry skills to one source' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (Tests 1 passed); the existing wrapper sync links every shipped skill
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/tests/integration/init/entryInstallSet.test.ts`
- The test carries only this spec's annotation. The spec-0018 host-adapter case it also discharges is an open row of that spec, whose ledger this change does not edit.

### TDD-0099

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/init/entryInstallSet.test.ts`
- Selector: `TC-0003-0064: Upgrade over an install without the workflow entry`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/init/entryInstallSet.test.ts --testNamePattern='TC-0003-0064: Upgrade over an install without the workflow entry' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (Tests 1 passed); a plain init creates a missing shipped file
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/tests/integration/init/entryInstallSet.test.ts`, `packages/qfai/tests/integration/init/upgradeStates.ts`

### TDD-0100

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/init/noOpenaiYaml.test.ts`
- Selector: `TC-0003-0065: No agents/openai.yaml after init and after --force`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/init/noOpenaiYaml.test.ts --testNamePattern='TC-0003-0065: No agents/openai.yaml after init and after --force' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (Tests 1 passed); no shipped skill carries the file
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/tests/integration/init/noOpenaiYaml.test.ts`

### TDD-0109

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/init/governedPlans.test.ts`
- Selector: `TC-0003-0074: Fresh init records every plan in the lock, and no memo`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/init/governedPlans.test.ts --testNamePattern='TC-0003-0074: Fresh init records every plan in the lock, and no memo' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ …(5) ]` (the lock held no `process/workflows/` key)
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/src/core/assistantAssetProvenance.ts` (`process/workflows` in `GOVERNED_ASSISTANT_LAYERS`, the `governedLayerOf` helper, the lock-key parse through it, the layer-root boundary for a two-segment layer), `packages/qfai/src/core/governedAssistantManifest.ts` and `packages/qfai/scripts/generate-governed-assistant-manifest.mjs` (the build-time list of shipped governed files), `packages/qfai/src/core/paths/assistantPaths.ts` (`joinAssistantLayer` takes a two-segment layer), `packages/qfai/src/cli/commands/init.ts` (the copy exclusion now routes the plans to the governed writer), `packages/qfai/tests/integration/init/governedPlans.test.ts`, `packages/qfai/tests/core/assistantAssetProvenance.test.ts` (its fixture copies every governed layer)

### TDD-0110

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/init/governedPlans.test.ts`
- Selector: `TC-0003-0075: Upgrade refreshes an older plan, keeps edited plan and memo`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/init/governedPlans.test.ts --testNamePattern='TC-0003-0075: Upgrade refreshes an older plan, keeps edited plan and memo' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected Buffer[ 35, 32, 65, 110, 32, 101, …(-50) ] to deeply equal Buffer[ 114, 111, 117, 116, 101, …(193) ]` (the older plan kept its earlier body)
- GREEN result: exit 0; 1 passed (1)
- Changed files: as TDD-0109, plus `packages/qfai/src/cli/commands/init.ts` (an unmodified plan is refreshed on a plain run, not only under `--force`) and `packages/qfai/tests/integration/init/upgradeStates.ts` (overlays `older-plan`, `edited-plan`, `edited-memo`)
- Design choice: the plain-run refresh applies to the plans layer only. `constitution/` and `catalog/` keep refreshing under `--force` alone, which is the behaviour BR-0003-0053 leaves untouched.

### TDD-0112

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/init/governedPlans.test.ts`
- Selector: `TC-0003-0077: A rerun writes nothing and leaves the tree byte-identical`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/init/governedPlans.test.ts --testNamePattern='TC-0003-0077: A rerun writes nothing and leaves the tree byte-identical' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (Tests 1 passed); a rerun over a current install already wrote nothing
- GREEN result: exit 0; 1 passed (1), with the plans governed and the lock carrying the package version
- Changed files: `packages/qfai/tests/integration/init/governedPlans.test.ts`, `packages/qfai/tests/integration/init/upgradeStates.ts` (`initQuietly` now captures the report written to stdout, and the case asserts the summary was captured)

### TDD-0113

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/init/upgradeRecord.test.ts`
- Selector: `TC-0003-0078: The lock records the running package version`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/init/upgradeRecord.test.ts --testNamePattern='TC-0003-0078: The lock records the running package version' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected undefined to be '1.12.2' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/src/core/assistantAssetProvenance.ts` (`packageVersion` in the lock), `packages/qfai/src/cli/commands/init.ts` (the governed sync writes the running version), `packages/qfai/tests/integration/init/upgradeRecord.test.ts`, `packages/qfai/tests/integration/init/upgradeStates.ts` (overlay `older-lock`)
- The conflict list BR-0003-0054 also records is TDD-0114, which waits for the correspondence check.

### TDD-0115

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/init/windowsParity.test.ts`
- Selector: `TC-0003-0080: Every provenance lock key is a slash-separated path`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/init/windowsParity.test.ts --testNamePattern='TC-0003-0080: Every provenance lock key is a slash-separated path' --reporter=verbose`
- RED result: already satisfied: exit 0 against the sources before this chunk (Tests 1 passed); the lock keys were already POSIX paths
- GREEN result: exit 0; 1 passed (1), with the two-segment `process/workflows/…` keys
- Changed files: `packages/qfai/tests/integration/init/windowsParity.test.ts`

### TDD-0120

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/init/plainRunManifest.test.ts`
- Selector: `TC-0003-0085: Plain upgrade leaves a customized agent-routing.yml untouched`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/init/plainRunManifest.test.ts --testNamePattern='TC-0003-0085: Plain upgrade leaves a customized agent-routing.yml untouched' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (Tests 1 passed); the routing merge runs under `--force` only
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/tests/integration/init/plainRunManifest.test.ts`, `packages/qfai/tests/integration/init/upgradeStates.ts` (overlay `absent-route`)

### TDD-0124

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/init/skippedSkillCount.test.ts`
- Selector: `TC-0003-0089: Plain upgrade counts skipped skills; a CRLF-only copy is not one`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/init/skippedSkillCount.test.ts --testNamePattern='TC-0003-0089: Plain upgrade counts skipped skills; a CRLF-only copy is not one' --reporter=verbose`
- RED result: exit 1; `AssertionError: one line counts the skipped skills: expected [] to have a length of 1 but got +0`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/src/cli/commands/init.ts` (`countDifferingSkills` and the summary line), `packages/qfai/tests/integration/init/skippedSkillCount.test.ts`, `packages/qfai/tests/integration/init/upgradeStates.ts` (`initQuietly` captures stdout)

### TDD-0101

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/init/entryDirective.test.ts`
- Selector: `TC-0003-0066: Fresh init: directive in AGENTS.md and CLAUDE.md, not Copilot`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/init/entryDirective.test.ts --testNamePattern='TC-0003-0066: Fresh init: directive in AGENTS.md and CLAUDE.md, not Copilot' --reporter=verbose`
- RED result: exit 1; `AssertionError: AGENTS.md begins with the directive: expected false to be true // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/root/AGENTS.md` and `packages/qfai/assets/init/root/CLAUDE.md` (the entry directive as their first line), `packages/qfai/src/core/agentEntryPoints.ts` (`addEntryPointDirectives`; the operative-copy scan reads the code spans the directive itself holds as visible text), `packages/qfai/src/cli/commands/init.ts` (the directives go through the entry-point writer, and its report names each directive it added), `packages/qfai/tests/integration/init/entryDirective.test.ts`
- Correction (2026-09-25): the entry directive now names the command through the canonical launcher, `npx qfai workflow`, as every shipped mention of the workflow command must (spec-0018 TDD-0449). These tests read the directive from the shipped template, so their oracle is unchanged; `packages/qfai/tests/cli/initAgentEntryPointRules.test.ts`, which holds the directive as a literal, was updated to the new wording.

### TDD-0102

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/init/entryDirective.test.ts`
- Selector: `TC-0003-0067: Directive prepended to existing CRLF entry points, bytes kept`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/init/entryDirective.test.ts --testNamePattern='TC-0003-0067: Directive prepended to existing CRLF entry points, bytes kept' --reporter=verbose`
- RED result: exit 1; `AssertionError: AGENTS.md begins with the directive: expected false to be true // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: as TDD-0101
- The entry directive is followed by the line break alone, so the project's bytes start on the next line. The review directive keeps its blank line.
- Correction (2026-09-25): the entry directive now names the command through the canonical launcher, `npx qfai workflow`, as every shipped mention of the workflow command must (spec-0018 TDD-0449). These tests read the directive from the shipped template, so their oracle is unchanged; `packages/qfai/tests/cli/initAgentEntryPointRules.test.ts`, which holds the directive as a literal, was updated to the new wording.

### TDD-0103

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/init/entryDirective.test.ts`
- Selector: `TC-0003-0068: Entry directive with and without REVIEW.md`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/init/entryDirective.test.ts --testNamePattern='TC-0003-0068: Entry directive with and without REVIEW.md' --reporter=verbose`
- RED result: exit 1; `AssertionError: AGENTS.md carries the entry directive: expected [] to have a length of 1 but got +0`
- GREEN result: exit 0; 1 passed (1)
- Changed files: as TDD-0101, plus the existing entry-point tests in `packages/qfai/tests/cli/initAgentEntryPointRules.test.ts`, whose projects now keep a `REVIEW.md` where they expect the review directive
- Design choice: follows TC-0003-0068 over the previous unconditional behaviour. Init adds the review directive to an existing entry point only when the project has `REVIEW.md`. A fresh copy of the template still carries it, as the template's own sentence is conditional on the file.
- Correction (2026-09-25): the entry directive now names the command through the canonical launcher, `npx qfai workflow`, as every shipped mention of the workflow command must (spec-0018 TDD-0449). These tests read the directive from the shipped template, so their oracle is unchanged; `packages/qfai/tests/cli/initAgentEntryPointRules.test.ts`, which holds the directive as a literal, was updated to the new wording.

### TDD-0104

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/init/entryDirective.test.ts`
- Selector: `TC-0003-0069: Operative copy on a rerun, and a copy only inside a fence`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/init/entryDirective.test.ts --testNamePattern='TC-0003-0069: Operative copy on a rerun, and a copy only inside a fence' --reporter=verbose`
- RED result: exit 1; `AssertionError: the shipped AGENTS.md carries the entry directive: expected undefined to be defined`
- GREEN result: exit 0; 1 passed (1)
- Changed files: as TDD-0101
- Correction (2026-09-25): the entry directive now names the command through the canonical launcher, `npx qfai workflow`, as every shipped mention of the workflow command must (spec-0018 TDD-0449). These tests read the directive from the shipped template, so their oracle is unchanged; `packages/qfai/tests/cli/initAgentEntryPointRules.test.ts`, which holds the directive as a literal, was updated to the new wording.

### TDD-0105

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/init/entryDirective.test.ts`
- Selector: `TC-0003-0070: A symlinked AGENTS.md is refused`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/init/entryDirective.test.ts --testNamePattern='TC-0003-0070: A symlinked AGENTS.md is refused' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (Tests 1 passed); the entry-point writer already refuses a symbolic link and names it
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/tests/integration/init/entryDirective.test.ts`, `packages/qfai/tests/integration/init/upgradeStates.ts` (`initQuietly` captures stderr, where the refusal is written)
- Correction (2026-09-25): the entry directive now names the command through the canonical launcher, `npx qfai workflow`, as every shipped mention of the workflow command must (spec-0018 TDD-0449). These tests read the directive from the shipped template, so their oracle is unchanged; `packages/qfai/tests/cli/initAgentEntryPointRules.test.ts`, which holds the directive as a literal, was updated to the new wording.

### TDD-0106

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/init/modeLine.test.ts`
- Selector: `TC-0003-0071: Fresh non-interactive init: no mode key, mode line active`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/init/modeLine.test.ts --reporter=verbose`
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ 'Workflow mode: active' ]` (the config and no-prompt assertions before it passed)
- GREEN result: exit 0; 3 passed (3)
- Changed files: `packages/qfai/src/cli/commands/init.ts` (`workflowModeLine` after the run report), `packages/qfai/tests/integration/init/modeLine.test.ts`, `packages/qfai/tests/integration/init/upgradeStates.ts` (`initQuietly` takes `yes`)

### TDD-0107

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/init/modeLine.test.ts`
- Selector: `TC-0003-0072: Upgrade with no mode key: config unchanged, mode active`
- RED command (cwd `packages/qfai`): as TDD-0106
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ 'Workflow mode: active' ]` (the config was already byte-identical)
- GREEN result: exit 0; 3 passed (3)
- Changed files: as TDD-0106

### TDD-0108

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/init/modeLine.test.ts`
- Selector: `TC-0003-0073: Mode line for active, shadow, off and an invalid value`
- RED command (cwd `packages/qfai`): as TDD-0106
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ 'Workflow mode: active' ]` on the first of the four installs
- GREEN result: exit 0; 3 passed (3); the invalid value prints `Workflow mode: "bogus" is invalid; expected active, shadow or off`
- Changed files: as TDD-0106

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0003.md` (committed). Totals: ✅ 243 / ⚠️ 130 / ❌ 176, with 372 not applicable, across 921 scored cells.

## Work Orders Summary

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | acceptance-test-engineer | acceptance-test-engineer | Move the four cases and annotate the three test cases | CR-20260923-0003 | the files under Work performed | PASS |
| 2 | test-design-analyst | test-design-analyst | Score every obligation of the pack | 02_User-stories.md, 06_Test-Cases.md, 04_Business-Rules.md | .qfai/evidence/coverage-depth-spec-0003.md | PASS |
| 3 | acceptance-test-engineer | acceptance-test-engineer | grilling(S1@2026-09-23T03:14:36.552Z/agents): the four cases move into one integration module with a shared helper | test-layers.md | the new module and helper; the alternative, a copy of the set-up in each file, would drift | PASS |
| 4 | qa-gatekeeper | qa-gatekeeper#1 | /qfai-implement: TDD-0058 RED phase gate on the falsifiability mutation run | #tdd-0058 | RED test manifest listed the Test file alone; list its test-owned import closure | REVISE |
| 5 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0058 RED phase gate on the falsifiability mutation run | #tdd-0058 | #tdd-0058 Round 1 | PASS |
| 6 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0058 build-phase GREEN + oracle proof | #tdd-0058 | #tdd-0058 Round 1 | PASS |
| 7 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0059 RED phase gate on the falsifiability mutation run | #tdd-0059 | #tdd-0059 Round 1 | PASS |
| 8 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0059 build-phase GREEN + oracle proof | #tdd-0059 | #tdd-0059 Round 1 | PASS |
| 9 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0060 RED phase gate on the falsifiability mutation run | #tdd-0060 | #tdd-0060 Round 1 | PASS |
| 10 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0060 build-phase GREEN + oracle proof | #tdd-0060 | #tdd-0060 Round 1 | PASS |
| 11 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0061 RED phase gate on the falsifiability mutation run | #tdd-0061 | #tdd-0061 Round 1 | PASS |
| 12 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0061 build-phase GREEN + oracle proof | #tdd-0061 | #tdd-0061 Round 1 | PASS |
| 13 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0062 RED phase gate on the falsifiability mutation run | #tdd-0062 | #tdd-0062 Round 1 | PASS |
| 14 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0062 build-phase GREEN + oracle proof | #tdd-0062 | #tdd-0062 Round 1 | PASS |
| 15 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0063 RED phase gate on the falsifiability mutation run | #tdd-0063 | #tdd-0063 Round 1 | PASS |
| 16 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0063 build-phase GREEN + oracle proof | #tdd-0063 | #tdd-0063 Round 1 | PASS |
| 17 | qa-gatekeeper | qa-gatekeeper | grilling(S1@2026-09-23T03:29:00.000Z/agents): a predicate in the row's own Test file is broken by a temporary, reverted mutation of that checker, with the RED test hash taken over the unmutated manifest | #tdd-0063, #tdd-0092 | the case plants its own broken copy, so no shipped file can fail it; the alternative, the test's owner taking the run, was not adopted because the owner named this mutation in its handover. The skill gap is filed as an issue | PASS |
| 18 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0092 RED phase gate on the falsifiability mutation run | #tdd-0092 | #tdd-0092 Round 1 | PASS |
| 19 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0092 build-phase GREEN + oracle proof | #tdd-0092 | #tdd-0092 Round 1 | PASS |
| 20 | completion-reviewer | completion-reviewer | /qfai-implement: completion review of TDD-0058 to TDD-0063 and TDD-0092, attempt 1 | #tdd-0058 … #tdd-0092 | one response per row in that row's review pack | PASS |
| 21 | implementation-reviewer | implementation-reviewer | /qfai-implement: code quality review of TDD-0058 to TDD-0063 and TDD-0092, attempt 1 | #tdd-0058 … #tdd-0092 | PASS on TDD-0062, TDD-0063 and TDD-0092; REVISE on TDD-0058 to TDD-0061: the shared helper tests/helpers/deliveredWorkflowTree.ts has two consumers | REVISE |
| 22 | implementation-reviewer | implementation-reviewer | grilling(S2@2026-09-23T03:29:00.000Z/agents): answer the REVISE by keeping the set-up local to each of the two files and deleting the helper | #tdd-0058 … #tdd-0061 | the alternative, a third consumer in spec0017LayeredCiScaffoldE2E.test.ts, was not adopted: it edits another spec's test file and reopens its completed rows | PASS |
| 23 | acceptance-test-engineer | acceptance-test-engineer | /qfai-atdd review-fix handback: inline the helper, replace the RED test hash and manifest, mark the proof stale | #tdd-0058 … #tdd-0061 | the two test files; Round 1 RED test replacement lines | PASS |
| 24 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0058 re-taken falsifiability proof under the corrected test | #tdd-0058 | Round 1 Replacement proof fields | PASS |
| 25 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0059 re-taken falsifiability proof under the corrected test | #tdd-0059 | Round 1 Replacement proof fields | PASS |
| 26 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0060 re-taken falsifiability proof under the corrected test | #tdd-0060 | Round 1 Replacement proof fields | PASS |
| 27 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0061 re-taken falsifiability proof under the corrected test | #tdd-0061 | Round 1 Replacement proof fields | PASS |
| 28 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: build-phase GREEN on the restored tree for TDD-0058 to TDD-0061 | #tdd-0058 … #tdd-0061 | Round 1 Revision, GREEN and Refactor verify fields | PASS |
| 29 | completion-reviewer | completion-reviewer | /qfai-implement: completion review of TDD-0058 to TDD-0061, attempt 2 | #tdd-0058 … #tdd-0061 | one response per row in that row's attempt-2 review pack | PASS |
| 30 | implementation-reviewer | implementation-reviewer | /qfai-implement: code quality review of TDD-0058 to TDD-0061, attempt 2 | #tdd-0058 … #tdd-0061 | one response per row in that row's attempt-2 review pack | PASS |
| 31 | orchestrator | orchestrator | /qfai-implement: checkpoint verification of TDD-0061, the row's Test file and the full suite | #tdd-0061 | Checkpoint verification fields | PASS |
| 32 | acceptance-test-engineer | acceptance-test-engineer | /qfai-atdd: write the TDD-0093 case for TC-0003-0058 verify bullet 5 and hand the row over on the falsifiability path | CR-20260923-0007 | packages/qfai/tests/integration/shippedWorkflowPortability.test.ts; #tdd-0093 | PASS |
| 33 | acceptance-test-engineer | acceptance-test-engineer | /qfai-atdd: shared-artifact re-verify of TDD-0062, TDD-0063 and TDD-0092 under the edited Test file | #tdd-0062, #tdd-0063, #tdd-0092 | #tdd-0093 Shared-artifact re-verify; each selector passes | PASS |
| 34 | acceptance-test-engineer | acceptance-test-engineer | /qfai-atdd: mutation-only request to /qfai-implement for the proofs of TDD-0062, TDD-0063 and TDD-0092, and the falsifiability run of TDD-0093 | #tdd-0093 | the Proof and Restored GREEN fields of #tdd-0093 and its Round 1 block, filled by the /qfai-implement run | PASS |
| 35 | - | n/a | grilling(-@2026-09-23T08:31:57.000Z/none): none | - | - | PASS |
| 36 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: shared-artifact proofs of TDD-0062, TDD-0063 and TDD-0092 under the edited test file | #tdd-0093 | the three re-verify subsections | PASS |
| 37 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0093 RED phase gate on the falsifiability mutation run | #tdd-0093 | the second-step case had no run showing it fails | REVISE |
| 38 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0093 RED phase gate on the two-clause mutation run | #tdd-0093 | Round 1 | PASS |
| 39 | qa-gatekeeper | qa-gatekeeper | /qfai-implement: TDD-0093 build-phase GREEN + oracle proof | #tdd-0093 | Round 1 | PASS |
| 40 | completion-reviewer | completion-reviewer | /qfai-implement: completion review of TDD-0093, attempt 1 | #tdd-0093 | one response in the row's pack | PASS |
| 41 | implementation-reviewer | implementation-reviewer | /qfai-implement: code quality review of TDD-0093, attempt 1 | #tdd-0093 | one response in the row's pack | PASS |
| 42 | orchestrator | orchestrator | /qfai-implement: checkpoint verification of TDD-0093, its Test file and the full suite | #tdd-0093 | Checkpoint verification fields | PASS |
| 43 | acceptance-test-engineer | acceptance-test-engineer | /qfai-atdd: rename the TDD-0037 describe and count case to the counts the case asserts, record the new RED test hash and mark the proof stale | CR-20260923-0011 | packages/qfai/tests/integration/shippedWorkflowInertness.test.ts; #tdd-0037 | PASS |
| 44 | acceptance-test-engineer | acceptance-test-engineer | /qfai-atdd: shared-artifact re-verify under the renamed titles | #tdd-0037 | #tdd-0037 Shared-artifact re-verify: no RED test manifest names the file; the TDD-0036 selector passes | PASS |
| 45 | acceptance-test-engineer | acceptance-test-engineer | grilling(S1@2026-09-23T11:24:46.722Z/agents): TDD-0001's test is the row's own case in tests/integration/initSpec0003.test.ts, rewritten to run init and assert the clause, not either test CR-20260923-0011 names | CR-20260923-0011; 06_Test-Cases.md TC-0003-0001; .qfai/assistant/catalog/test-layers.md | #tdd-0001; TC-0003-0001 declares Level integration, so its home is tests/integration/**, where initE2E.test.ts is not and where QFAI-ATDD-122 keeps its annotation out of tests/e2e/**; tests/cli/init.test.ts is in no layer directory and asserts only that no file is written. Disagreeing position: the work order asked for one of the two named tests to be picked | PASS |
| 46 | acceptance-test-engineer | acceptance-test-engineer | /qfai-atdd: write the TDD-0001 case and hand the row over on the falsifiability path, with a reverted trial of the mutation | CR-20260923-0011 | packages/qfai/tests/integration/initSpec0003.test.ts; #tdd-0001 | PASS |
| 47 | acceptance-test-engineer | acceptance-test-engineer | /qfai-atdd: shared-artifact re-verify of TDD-0025 under the edited Test file | #tdd-0001 | #tdd-0001 Shared-artifact re-verify; the selector passes | PASS |
| 48 | completion-reviewer | - | /qfai-atdd: completion review of TDD-0001 and TDD-0037 | #tdd-0001, #tdd-0037 | not run in this invocation; the /qfai-implement run took it at row 61 | PASS |
| 49 | acceptance-test-engineer | acceptance-test-engineer | /qfai-atdd: add the TC-0003-0001 verify bullet 3 assertion to the TDD-0001 case, re-take the mutation trial and the RED test hash | #tdd-0001 | packages/qfai/tests/integration/initSpec0003.test.ts; #tdd-0001 | PASS |
| 50 | backend-engineer | backend-engineer | /qfai-implement: TDD-0001 falsifiability run with an empty `specs/.gitkeep` added to the shipped `.qfai/` tree | #tdd-0001 | #tdd-0001 Round 1 falsifiability fields | PASS |
| 51 | backend-engineer | backend-engineer | /qfai-implement: TDD-0001 restored GREEN and whole-file Refactor verify | #tdd-0001 | #tdd-0001 Round 1 GREEN and Refactor verify fields | PASS |
| 52 | backend-engineer | backend-engineer | grilling(S1@2026-09-23T11:42:45.972Z/agents): TDD-0037 stays at done, and re-taking its proof waits for a Change Request that names the row | execution-ledger.md allowed transitions; change-request-reset.md; CR-20260923-0011 approved action 2 | done leaves only by the upstream reset, which change-request-reset.md refuses for a row the CR's approved actions do not name, and CR-20260923-0011 names TDD-0001 and says no other row. Disagreeing position: the work order asked to bring the row to refactor | PASS |
| 53 | backend-engineer | backend-engineer | /qfai-implement: TDD-0037 Selector copied from the handback into the ledger | #tdd-0037; CR-20260923-0011 | test-list.md row 37 Selector, which CR-20260923-0011 says follows the rename | PASS |
| 54 | orchestrator | orchestrator | /qfai-implement: raise CR-20260923-0013 so TDD-0037 is reset and its proof re-taken on the renamed test; this replaces the outcome of row 52 | #tdd-0037; change-request-reset.md | CR-20260923-0013; test-list.md row 37 at todo with the record in DR-ID | PASS |
| 55 | backend-engineer | backend-engineer | /qfai-implement: TDD-0037 falsifiability run with a secret reference planted in the shipped `qfai-tests.yml`, and a second run with an install step on its detection job | #tdd-0037 | #tdd-0037 Round 1 falsifiability fields | PASS |
| 56 | qa-gatekeeper | qa-gatekeeper#1 | /qfai-implement: TDD-0001 RED phase gate on the falsifiability mutation run | #tdd-0001 | #tdd-0001 Round 1 | PASS |
| 57 | qa-gatekeeper | qa-gatekeeper#1 | /qfai-implement: TDD-0037 RED phase gate on the falsifiability mutation run and the TDD-0036 re-verify | #tdd-0037 | #tdd-0037 Round 1 | PASS |
| 58 | backend-engineer | backend-engineer | /qfai-implement: TDD-0037 restored GREEN and whole-file Refactor verify, and the TDD-0001 Refactor verify re-run on the reviewed tree | #tdd-0001, #tdd-0037 | the GREEN and Refactor verify fields of both entries | PASS |
| 59 | qa-gatekeeper | qa-gatekeeper#1 | /qfai-implement: TDD-0001 build-phase GREEN + oracle proof | #tdd-0001 | #tdd-0001 Round 1 | PASS |
| 60 | qa-gatekeeper | qa-gatekeeper#1 | /qfai-implement: TDD-0037 build-phase GREEN + oracle proof | #tdd-0037 | #tdd-0037 Round 1 | PASS |
| 61 | completion-reviewer | completion-reviewer | /qfai-implement: completion review of TDD-0001 and TDD-0037, attempt 1 | #tdd-0001, #tdd-0037 | one response per row in that row's review pack; its record advisories are queued in implement-spec-0003.md `## Record defects` | PASS |
| 62 | implementation-reviewer | implementation-reviewer | /qfai-implement: code quality review of TDD-0001 and TDD-0037, attempt 1 | #tdd-0001, #tdd-0037 | one response per row in that row's review pack | PASS |
| 63 | orchestrator | orchestrator | /qfai-implement: checkpoint verification of TDD-0001 on its Test file and of TDD-0037 on the full suite | #tdd-0001, #tdd-0037 | Checkpoint verification fields | PASS |
| 64 | - | n/a | grilling(-@2026-09-25T03:20:00.000Z/none): none | - | - | PASS |
| 65 | delivery-planner | delivery-planner | /qfai-atdd: scope approval of the TDD-0094 selector before its RED | CR-20260925-0011; 06_Test-Cases.md TC-0003-0059; the proposed test | one boundary, not a matrix; write the Selector as the bare describe name | PASS |
| 66 | acceptance-test-engineer | general-purpose sub-agent (not the routed role); the RED is re-observed in Round 2 at row 77 | /qfai-atdd: write the TC-0003-0059 case, take its RED and assertion-stripped run, and hand TDD-0094 over on the observed-red path | CR-20260925-0011 | packages/qfai/tests/integration/initCopilotLegacyWindow.test.ts; #tdd-0094 | PASS |
| 67 | qa-gatekeeper | - | /qfai-atdd: TDD-0094 RED phase gate on the observed RED | #tdd-0094 | not run in this invocation; taken in the /qfai-implement review-fix as row 78 (qa-gatekeeper#2, Round 2) | PENDING |
| 68 | - | n/a | grilling(-@2026-09-25T03:24:00.000Z/none): none | - | - | PASS |
| 69 | delivery-planner | delivery-planner | /qfai-implement plan phase: tier, groups, dispatch and order for TDD-0094 | spec-0003 ledger; CR-20260925-0011 | T2, no T1 group, serial, TDD-0094 alone; TDD-0038 is not moved | PASS |
| 70 | test-design-analyst | test-design-analyst | /qfai-implement plan phase: coverage and layer ownership for TDD-0094 | spec-0003 ledger; 06_Test-Cases.md; 02_User-stories.md; test-layers.md | Integration is right for the Level and the directory; every verify bullet has an assertion; no obligation of the CR lacks a row; advisory to read any `warning` in the item, adopted | PASS |
| 71 | backend-engineer | general-purpose sub-agent (not the routed role); redone in Round 2 | /qfai-implement: TDD-0094 GREEN, correcting the legacy-layout item in `buildCopilotInstructions`, and the Oracle proof | #tdd-0094 | packages/qfai/src/cli/commands/init.ts; #tdd-0094 Round 1 | PASS |
| 72 | backend-engineer | general-purpose sub-agent (not the routed role); redone in Round 2 | /qfai-implement: TDD-0094 Refactor verify | #tdd-0094 | Refactor verify fields | PASS |
| 73 | qa-gatekeeper | qa-gatekeeper#1 | /qfai-implement: TDD-0094 build-phase GREEN + oracle proof | #tdd-0094 | qa-gatekeeper fields | PASS |
| 74 | completion-reviewer | completion-reviewer | /qfai-implement: completion review of TDD-0094, attempt 1 | #tdd-0094 | review-20260925140000000 <!-- qfai:not-a-citation --> | REVISE |
| 75 | implementation-reviewer | implementation-reviewer | /qfai-implement: code quality review of TDD-0094, attempt 1 | #tdd-0094 | review-20260925140000000 <!-- qfai:not-a-citation --> | PASS |
| 76 | orchestrator | - | /qfai-implement: checkpoint verification of TDD-0094 | #tdd-0094 | not run in this invocation; taken in the review-fix as row 85 | PENDING |
| 77 | acceptance-test-engineer | acceptance-test-engineer#1 | /qfai-implement review-fix: TDD-0094 Round 2 RED, taken on the tree with the legacy-layout item in `buildCopilotInstructions` put back to its pre-fix text, and its assertion-stripped run | #tdd-0094; review-20260925140000000 <!-- qfai:not-a-citation --> | #tdd-0094 Round 2 RED fields; packages/qfai/src/cli/commands/init.ts left at its pre-fix text, uncommitted, for the RED gate | PASS |
| 78 | qa-gatekeeper | qa-gatekeeper#2 | /qfai-implement review-fix: TDD-0094 Round 2 RED phase gate at routing phase red, on the live tree before the fix was restored | #tdd-0094 Round 2 | reviewed revision working-tree+10211e58331aa55965284d65840388a810a5cdac73312e4634f5d957ea196a94 | PASS |
| 79 | backend-engineer | backend-engineer#1 | /qfai-implement review-fix: TDD-0094 Round 2 GREEN on the restored fix, and its Oracle proof | #tdd-0094 Round 2 | packages/qfai/src/cli/commands/init.ts restored to blob 94c2c242053742f9a45c10e6d8b823390b8749e1; #tdd-0094 Round 2 Revision, GREEN and Oracle proof fields | PASS |
| 80 | backend-engineer | backend-engineer#1 | /qfai-implement review-fix: TDD-0094 Refactor verify after Round 2 | #tdd-0094 | Refactor verify fields, the Round 1 copies fenced as superseded; the REV of the TDD-0094 ledger row | PASS |
| 81 | backend-engineer | backend-engineer#1 | /qfai-implement review-fix: correct the matrix totals and the TDD-0094 status lines of this file | coverage-depth-spec-0003.md; #tdd-0094 | Coverage Depth Matrix, Gaps / Open risks and Final status | PASS |
| 82 | qa-gatekeeper | qa-gatekeeper#3 | /qfai-implement review-fix: TDD-0094 Round 2 build-phase GREEN + oracle proof | #tdd-0094 Round 2 | reviewed revision 1365bf908d90c90ec068a24eeb5c0852de9a3ec1 | PASS |
| 83 | completion-reviewer | completion-reviewer | /qfai-implement review-fix: completion review of TDD-0094, attempt 2 | #tdd-0094 | review-20260925140010000 <!-- qfai:not-a-citation --> | PASS |
| 84 | implementation-reviewer | implementation-reviewer | /qfai-implement review-fix: code quality review of TDD-0094, attempt 2 | #tdd-0094 | review-20260925140010000 <!-- qfai:not-a-citation --> | PASS |
| 85 | orchestrator | orchestrator | /qfai-implement review-fix: checkpoint verification of TDD-0094, off a checkpoint boundary | #tdd-0094 | Checkpoint verification fields | PASS |

## Cross-spec obligations

None.

## Execution logs

Recorded per row under `## Ledger rows advanced`.

## Gaps / Open risks

- The matrix records 176 `❌` cells across the pack, each with its reason in
  `.qfai/evidence/coverage-depth-spec-0003.md`. This run took up only the rows
  `CR-20260923-0003` names.
- Five obligations are asserted in the opposite direction by the tests, because the
  product changed on purpose after the pack was written. They need a change request,
  not a test.
- The step runner, job reader and delivered tree are copied into several shipped-workflow
  test files, including the two this run touched. Extracting them edits test files other
  specs' completed rows name, so it is a separate change.
- The `TDD-0093` entry's `Mutation:` line names the single-clause edit its handover
  planned. The run it closed on removes both job-shape clauses, and Round 1 records both
  runs.
- The `TDD-0001` case asserts all three verify bullets of `TC-0003-0001`. Its one
  mutation breaks bullet 1; no mutation has been run against the bullet 2 and bullet 3
  assertions.
- No mutation has shown the `TDD-0037` count case's nine and eight instance counts
  fail. The planted secret fails the secret case, and the install step on the
  detection job fails the declaration list and the detection case.
- The `TDD-0037` entry's `Branch:` line, its paragraph on the ledger's `Selector` and
  its Round 1 `RED test replacement` and `Replacement proof` fields describe the row
  as it was before `CR-20260923-0013` reset it. The repair is queued in
  `.qfai/evidence/implement-spec-0003.md` under `## Record defects`.
- The comments inside the `TDD-0037` count case still speak of four and three installs.
  Only the titles were in scope.

- `TDD-0094` stands at `review-fix`, in Round 2. `qa-gatekeeper#2` passed the
  Round 2 RED. Its GREEN, Oracle proof and Refactor verify are recorded; the
  build-phase gate on them, both reviews and the checkpoint are owed.

## Final status (PASS / PASS with cross-spec obligations / FAIL) + who confirmed

FAIL — the pack's other ATDD-owned rows are still owed, as the matrix records.

The ten rows these runs took up are `done`: `TDD-0058` to `TDD-0063`, `TDD-0092`,
`TDD-0093`, `TDD-0001` and `TDD-0037`. `/qfai-implement` took each through the
falsifiability path, and `qa-gatekeeper`, `completion-reviewer` and
`implementation-reviewer` passed each one. `TDD-0061`, `TDD-0093` and `TDD-0037`
closed on the full suite.

`TDD-0094` stands at `review-fix`, in Round 2: `qa-gatekeeper#2` passed its
Round 2 RED, and its GREEN, Oracle proof and Refactor verify are recorded. The
build-phase gate on the GREEN, both reviews and the checkpoint are owed.
