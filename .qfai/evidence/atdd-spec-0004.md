# ATDD Evidence: spec-0004

## Objective

Take `TDD-0083`, `TDD-0084`, `TDD-0085` and `TDD-0086` through the reviewed
cycle. They were closed at `exception` under `DR-0298`, which waived their
per-row reviews. They cover `BR-0004-0038`: the installed workflow plans are a
governed layer.

## Inputs reviewed (files/paths)

- `.qfai/specs/spec-0004/02_User-stories.md`
- `.qfai/specs/spec-0004/03_Acceptance-Criteria.md`
- `.qfai/specs/spec-0004/04_Business-Rules.md`
- `.qfai/specs/spec-0004/05_Examples.md`
- `.qfai/specs/spec-0004/06_Test-Cases.md`
- `.qfai/specs/spec-0004/tdd/test-list.md`
- `.qfai/decisions/DR-0298-intent-driven-rows-close-without-per-row-review.md`
- `packages/qfai/tests/integration/validators/workflowPlanProvenance.test.ts`
- `packages/qfai/tests/integration/init/upgradeStates.ts`
- `packages/qfai/src/core/assistantAssetProvenance.ts`
- `packages/qfai/src/core/governedAssistantManifest.ts`
- `packages/qfai/src/core/validators/assistantAssets.ts`

## Decisions made (with rationale)

- Every row takes the falsifiability branch. The test and the production code
  both exist, and each case passed on its first run.
- Each row names its own predicate and mutation. Where the code allows it, the
  mutation fails that row alone.
- `TDD-0086` cannot fail alone. `TC-0004-0080` expects exactly one finding
  under `process/workflows`, so any mutation that puts a finding on a fresh
  tree also fails `TDD-0083`.

## Grilling Session

### /qfai-atdd — run started 2026-09-25T10:19:31.967Z

Preflight: confidence high

No session opened. The four rows, their test cases and their business rule are
settled, and the test and the code already exist. Nothing surfaced during the
run that the spec leaves open.

### /qfai-implement — run started 2026-09-25T10:21:29.000Z

Preflight: confidence high

No session opened. The handover names each predicate and its mutation, and each
named line holds the named text at this revision.

## Work performed (what changed, where)

- No production or test file changed. The four cases and the code that
  satisfies them already exist.
- `.qfai/evidence/coverage-depth-spec-0004.md` is new: the Coverage Depth Matrix
  over every user story, test case and business rule of spec-0004.
- Each row's mutation was applied, run and reverted. The records are in the
  row's entry below.

## Commands executed + key outputs

| Command                                                                                                                         | Result                                          |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/workflowPlanProvenance.test.ts` | Test Files 1 passed (1); Tests 4 passed (4) |
| Each row's selector under its mutation                                                                                          | Recorded in the row's `Round 1`                 |

## Test volume estimate

Four existing cases in one test file. No case is added.

## Coverage obligations checklist

- `TC-0004-0080` to `TC-0004-0083`: one annotated case each, in
  `workflowPlanProvenance.test.ts`.
- `BR-0004-0038`: the fork, the missing layer and the migrations exclusion are
  covered. The stale-copy clause (`QFAI-ASSETS-004` for a plan that still holds
  what an earlier release wrote) has no test case. See `## Gaps / Open risks`.

## Ledger rows advanced

The four rows were reopened `exception` -> `todo`. Every case passed on its
first run, so every row takes branch 2. `/qfai-implement` Phase Red step 3c
applies each mutation and writes the falsifiability record into the row's
entry.

| TDD-ID     | Obligation     | Layer       | RED provenance | Entry                 |
| ---------- | -------------- | ----------- | -------------- | --------------------- |
| `TDD-0083` | `TC-0004-0080` | Integration | falsifiability | [TDD-0083](#tdd-0083) |
| `TDD-0084` | `TC-0004-0081` | Integration | falsifiability | [TDD-0084](#tdd-0084) |
| `TDD-0085` | `TC-0004-0082` | Integration | falsifiability | [TDD-0085](#tdd-0085) |
| `TDD-0086` | `TC-0004-0083` | Integration | falsifiability | [TDD-0086](#tdd-0086) |

### TDD-0083

- TDD-ID: TDD-0083
- Layer: Integration
- Test file: packages/qfai/tests/integration/validators/workflowPlanProvenance.test.ts
- Selector: TC-0004-0080: An edited plan is reported as a differing governed file
- TC-ref: TC-0004-0080
- Branch: falsifiability — the check that reports a diverged governed file already covers `process/workflows`, so the case passed on its first run
- Predicate to break: packages/qfai/src/core/assistantAssetProvenance.ts:810, `classifyAssistantAsset` — `return "forked";`, which classifies a file that matches neither the shipped bytes nor the lock record as a fork (`QFAI-ASSETS-005`)
- Mutation: `return "forked";` to `return "stale";`
- Why it fails: the edited plan is classified as a stale copy, so the finding names the right file with `QFAI-ASSETS-004` instead of `QFAI-ASSETS-005`, and the `toEqual` on `[code, severity, file]` fails
- Type check: `"stale"` is a member of `AssistantAssetStatus`; `tsc --noEmit -p packages/qfai/tsconfig.json` exits 0 on the mutated tree
- Other rows: `TDD-0084`, `TDD-0085` and `TDD-0086` still pass
- Classification command: cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/workflowPlanProvenance.test.ts -t "TC-0004-0080: An edited plan is reported as a differing governed file"
- Classification result: Test Files 1 passed (1); Tests 1 passed | 3 skipped (4), at 2facbb04e2e0898946280327267f46ce1299aab7

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/core/assistantAssetProvenance.ts, `classifyAssistantAsset` — a governed file that matches neither the shipped bytes nor the lock record is `forked`
- Round 1: Falsifiability command: cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/workflowPlanProvenance.test.ts -t "TC-0004-0080: An edited plan is reported as a differing governed file"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 3 skipped (4). The row's case fails on `AssertionError: expected [ Array(1) ] to deeply equal [ Array(1) ]` at `tests/integration/validators/workflowPlanProvenance.test.ts:37:81`; the received code is `QFAI-ASSETS-004` where `QFAI-ASSETS-005` is expected

The edit, at line 810:

```diff
-  return "forked";
+  return "stale";
```

- Round 1: Falsifiability revision: working-tree+b18458ea82b5f590c7c54c08d16a36fdd038149938536a5db93231dcb843127b
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: bac507f593ee446f4236620ce52dbe3a607a1ca41222d0d3a8549c7b2ac8cf10
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/validators/workflowPlanProvenance.test.ts
```

- Round 1: Revision: 2facbb04e2e0898946280327267f46ce1299aab7
- Round 1: GREEN command: cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/workflowPlanProvenance.test.ts -t "TC-0004-0080: An edited plan is reported as a differing governed file"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 3 skipped (4). Run after `git checkout -- packages/qfai/src/core/assistantAssetProvenance.ts`, which restores the file as it is at that revision

### TDD-0084

- TDD-ID: TDD-0084
- Layer: Integration
- Test file: packages/qfai/tests/integration/validators/workflowPlanProvenance.test.ts
- Selector: TC-0004-0081: A deleted plans layer is reported once, against the layer
- TC-ref: TC-0004-0081
- Branch: falsifiability — the missing-layer check already reads each recorded layer through `governedLayerOf`, so the case passed on its first run
- Predicate to break: packages/qfai/src/core/validators/assistantAssets.ts:617, `validateAssistantAssets` — `const layer = governedLayerOf(key);`, which maps each lock key to its governed layer, so a recorded `process/workflows/*.yml` marks `process/workflows` as a layer the project once had
- Mutation: `const layer = governedLayerOf(key);` to `const layer = key.split("/")[0] ?? null;`
- Why it fails: the first path segment records the layer as `process`, which never equals `process/workflows`, so no missing-layer finding is raised. The per-file loop then skips each missing plan because its layer is absent, and nothing is reported
- Type check: the value is still `string | null`; `tsc --noEmit -p packages/qfai/tsconfig.json` exits 0 on the mutated tree
- Other rows: `TDD-0083`, `TDD-0085` and `TDD-0086` still pass
- Classification command: cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/workflowPlanProvenance.test.ts -t "TC-0004-0081: A deleted plans layer is reported once, against the layer"
- Classification result: Test Files 1 passed (1); Tests 1 passed | 3 skipped (4), at 2facbb04e2e0898946280327267f46ce1299aab7

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/core/validators/assistantAssets.ts, `validateAssistantAssets` — the recorded-layer read through `governedLayerOf`, which raises one `QFAI-ASSETS-007` per recorded layer the tree no longer has
- Round 1: Falsifiability command: cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/workflowPlanProvenance.test.ts -t "TC-0004-0081: A deleted plans layer is reported once, against the layer"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 3 skipped (4). The row's case fails on `AssertionError: expected [] to deeply equal [ [ 'QFAI-ASSETS-007', …(1) ] ]` at `tests/integration/validators/workflowPlanProvenance.test.ts:48:65`

The edit, at line 617:

```diff
-    const layer = governedLayerOf(key);
+    const layer = key.split("/")[0] ?? null;
```

- Round 1: Falsifiability revision: working-tree+925efd1f8c3f19aaf690b79c9b28ce516599d7d11bf21dd5c7019e0186c36948
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: bac507f593ee446f4236620ce52dbe3a607a1ca41222d0d3a8549c7b2ac8cf10
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/validators/workflowPlanProvenance.test.ts
```

- Round 1: Revision: 2facbb04e2e0898946280327267f46ce1299aab7
- Round 1: GREEN command: cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/workflowPlanProvenance.test.ts -t "TC-0004-0081: A deleted plans layer is reported once, against the layer"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 3 skipped (4). Run after `git checkout -- packages/qfai/src/core/validators/assistantAssets.ts`, which restores the file as it is at that revision

### TDD-0085

- TDD-ID: TDD-0085
- Layer: Integration
- Test file: packages/qfai/tests/integration/validators/workflowPlanProvenance.test.ts
- Selector: TC-0004-0082: Nothing under process/migrations is reported
- TC-ref: TC-0004-0082
- Branch: falsifiability — the governed walk is rooted at the full layer path `process/workflows`, so nothing under `process/migrations` was ever collected, and the case passed on its first run
- Predicate to break: packages/qfai/src/core/assistantAssetProvenance.ts:515, `collectGovernedAssistantFiles` — `await collectGovernedFilesUnder(path.join(assistantRoot, layer), layer, found, true);`, which walks each governed layer at its full path
- Mutation: `await collectGovernedFilesUnder(path.join(assistantRoot, layer), layer, found, true);` to `await collectGovernedFilesUnder(path.join(assistantRoot, layer.split("/")[0] ?? layer), layer.split("/")[0] ?? layer, found, true);`
- Why it fails: the walk starts at `process/`, so the migration memos are collected as governed files the release does not ship. The added file and the edited memo each draw `QFAI-ASSETS-006`, and the empty-array assertion fails
- Type check: the arguments keep their `string` type; `tsc --noEmit -p packages/qfai/tsconfig.json` exits 0 on the mutated tree
- Other rows: `TDD-0083`, `TDD-0084` and `TDD-0086` still pass
- Classification command: cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/workflowPlanProvenance.test.ts -t "TC-0004-0082: Nothing under process/migrations is reported"
- Classification result: Test Files 1 passed (1); Tests 1 passed | 3 skipped (4), at 2facbb04e2e0898946280327267f46ce1299aab7

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/core/assistantAssetProvenance.ts, `collectGovernedAssistantFiles` — the governed walk rooted at each layer's full path, which leaves `process/migrations` outside it
- Round 1: Falsifiability command: cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/workflowPlanProvenance.test.ts -t "TC-0004-0082: Nothing under process/migrations is reported"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 3 skipped (4). The row's case fails on `AssertionError: expected [ …(2) ] to deeply equal []` at `tests/integration/validators/workflowPlanProvenance.test.ts:61:68`; the two findings are `QFAI-ASSETS-006` on `process/migrations/added.md` and on the edited memo

The edit, at line 515:

```diff
-    await collectGovernedFilesUnder(path.join(assistantRoot, layer), layer, found, true);
+    await collectGovernedFilesUnder(path.join(assistantRoot, layer.split("/")[0] ?? layer), layer.split("/")[0] ?? layer, found, true);
```

- Round 1: Falsifiability revision: working-tree+65c64dc7c446d67f50477988bbcdb225ab4d766ad7fe5aa82be115f2dbf144b4
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: bac507f593ee446f4236620ce52dbe3a607a1ca41222d0d3a8549c7b2ac8cf10
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/validators/workflowPlanProvenance.test.ts
```

- Round 1: Revision: 2facbb04e2e0898946280327267f46ce1299aab7
- Round 1: GREEN command: cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/workflowPlanProvenance.test.ts -t "TC-0004-0082: Nothing under process/migrations is reported"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 3 skipped (4). Run after `git checkout -- packages/qfai/src/core/assistantAssetProvenance.ts`, which restores the file as it is at that revision

### TDD-0086

- TDD-ID: TDD-0086
- Layer: Integration
- Test file: packages/qfai/tests/integration/validators/workflowPlanProvenance.test.ts
- Selector: TC-0004-0083: A fresh init tree has no finding under process/workflows
- TC-ref: TC-0004-0083
- Branch: falsifiability — `qfai init` installs each plan with the shipped bytes and the classifier treats those bytes as clean, so the case passed on its first run
- Predicate to break: packages/qfai/src/core/assistantAssetProvenance.ts:804, `classifyAssistantAsset` — `if (currentHash === shippedHash) {`, which classifies a file holding exactly the shipped bytes as `shipped`, for which no finding is raised
- Mutation: `if (currentHash === shippedHash) {` to `if (currentHash !== shippedHash) {`
- Why it fails: a freshly installed plan no longer counts as matching the release. It matches its lock record instead, so it is classified as stale, each of the five plans draws `QFAI-ASSETS-004`, and the empty-array assertion fails
- Type check: only the comparison operator changes; `tsc --noEmit -p packages/qfai/tsconfig.json` exits 0 on the mutated tree
- Other rows: `TDD-0083` also fails, because it expects exactly one finding under `process/workflows`; no mutation can put a finding on a fresh tree without failing it. `TDD-0084` and `TDD-0085` still pass
- Classification command: cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/workflowPlanProvenance.test.ts -t "TC-0004-0083: A fresh init tree has no finding under process/workflows"
- Classification result: Test Files 1 passed (1); Tests 1 passed | 3 skipped (4), at 2facbb04e2e0898946280327267f46ce1299aab7

#### Round 1

- Round 1: Satisfied-by: packages/qfai/src/core/assistantAssetProvenance.ts, `classifyAssistantAsset` — a governed file holding the shipped bytes is `shipped` and draws no finding
- Round 1: Falsifiability command: cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/workflowPlanProvenance.test.ts -t "TC-0004-0083: A fresh init tree has no finding under process/workflows"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed | 3 skipped (4). The row's case fails on `AssertionError: expected [ …(5) ] to deeply equal []` at `tests/integration/validators/workflowPlanProvenance.test.ts:67:67`; the five findings are `QFAI-ASSETS-004`, one per installed plan

The edit, at line 804:

```diff
-  if (currentHash === shippedHash) {
+  if (currentHash !== shippedHash) {
```

- Round 1: Falsifiability revision: working-tree+f29c69a51f4003256f0cb36e30e084030676dd3754560c3fe13a7e2a9415defb
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: bac507f593ee446f4236620ce52dbe3a607a1ca41222d0d3a8549c7b2ac8cf10
- Round 1: RED test manifest:

```text
packages/qfai/tests/integration/validators/workflowPlanProvenance.test.ts
```

- Round 1: Revision: 2facbb04e2e0898946280327267f46ce1299aab7
- Round 1: GREEN command: cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/workflowPlanProvenance.test.ts -t "TC-0004-0083: A fresh init tree has no finding under process/workflows"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed | 3 skipped (4). Run after `git checkout -- packages/qfai/src/core/assistantAssetProvenance.ts`, which restores the file as it is at that revision

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0004.md` (committed). Totals: ✅ 132 / ⚠️ 43 / ❌ 196.

These are the matrix depth cells (77 rows × 9 columns), with 322 not
applicable. The business rule table adds ✅ 36 / ⚠️ 8 / ❌ 45, with 25 not
applicable. `Status` is a row verdict and is outside every total.

## Work Orders Summary

| Step | Role (sub-agent)         | Agent instance             | Task title                                                                                       | Input (refs)                                              | Output (refs)                     | Status (PASS/REVISE/PENDING) |
| ---- | ------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------- | --------------------------------- | ---------------------------- |
| 1    | test-design-analyst      | test-design-analyst#1      | /qfai-atdd coverage: score every obligation of spec-0004 and write the matrix                     | 02_User-stories.md, 04_Business-Rules.md, 06_Test-Cases.md | coverage-depth-spec-0004.md       | REVISE                       |
| 2    | acceptance-test-engineer | acceptance-test-engineer#1 | Hand over `TDD-0083` to `TDD-0086` on the falsifiability branch                                  | the test file, `assistantAssetProvenance.ts`, `assistantAssets.ts` | #tdd-0083 to #tdd-0086            | PASS                         |
| 3    | -                        | n/a                        | grilling(-@2026-09-25T10:19:31.967Z/none): none                                                  | -                                                         | -                                 | PASS                         |
| 4    | -                        | n/a                        | grilling(-@2026-09-25T10:21:29.000Z/none): none                                                  | -                                                         | -                                 | PASS                         |
| 5    | backend-engineer         | backend-engineer#1         | /qfai-implement: falsifiability runs for `TDD-0083` to `TDD-0086`, each reverted to its GREEN     | #tdd-0083 to #tdd-0086                                    | Round 1                           | PASS                         |

The coverage REVISE names one gap, and it is outside these four rows: see
`## Gaps / Open risks`.

## Cross-spec obligations

None.

## Execution logs

Recorded per row above.

## Gaps / Open risks

- `BR-0004-0038` and `AC-0004-0044` require a plan that still holds what an
  earlier release wrote to be reported as stale (`QFAI-ASSETS-004`). No test
  case covers it. The fixture exists: the `older-plan` overlay in
  `packages/qfai/tests/integration/init/upgradeStates.ts`. Adding the case is a
  `/qfai-sdd` change to `06_Test-Cases.md` and a new ledger row.
- Each case calls `validateAssistantAssets` rather than the built
  `qfai validate`. `qfai validate` calls the same function.
- The matrix lists further findings for `/qfai-sdd` under `## Findings`.

## Final status

PENDING — the row reviews have not run yet.
