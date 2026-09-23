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

## Commands executed + key outputs

```text
pnpm -C packages/qfai exec vitest run tests/integration/shippedWorkflowCheckIndependence.test.ts tests/e2e/spec0003ShippedWorkflowSetE2E.test.ts tests/integration/shippedWorkflowPortability.test.ts
  Test Files 3 passed (3); Tests 66 passed (66)
npx tsc --noEmit -p packages/qfai/tsconfig.tests.json   -> exit 0
```

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

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0003.md` (committed). Totals: ✅ 238 / ⚠️ 130 / ❌ 176, with 365 not applicable, across 909 scored cells.

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
- Two clauses of the result-only aggregate check in `shippedWorkflowPortability.test.ts`,
  a second step and a job-level `continue-on-error`, have no case that fails when the
  clause is removed. `TDD-0092` pins the step-level clauses only.

## Final status (PASS / PASS with cross-spec obligations / FAIL) + who confirmed

FAIL — the pack's other ATDD-owned rows are still owed, as the matrix records.

The seven rows this run took up are `done`. `/qfai-implement` took each through the
falsifiability path, and `qa-gatekeeper`, `completion-reviewer` and
`implementation-reviewer` passed each one. `TDD-0061` closed on the full suite.
