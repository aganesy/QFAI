# Implement Evidence: spec-0004

Rows closed under DR-0298, one entry per row.

## /qfai-implement run started 2026-09-25T10:21:29.000Z

Rows `TDD-0083`, `TDD-0084`, `TDD-0085` and `TDD-0086`, reopened
`exception` -> `todo` to take the reviews their closure waived. They are
`Integration` rows, so their row-level evidence is in
`.qfai/evidence/atdd-spec-0004.md`, under each row's own heading. The entries
below keep the record of the waived closure.

### Plan phase

| Role                          | Instance                | Verdict | Summary                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------- | ----------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `delivery-planner` (blocking) | `delivery-planner#1`    | PASS    | The four rows exist at `todo` with no blocker. All four are T2: they carry the `QFAI-ASSETS-004/005/007` codes of `qfai validate` at their fixed `error` severity. T2 rows are reviewed alone, so there is no group. Parallel dispatch is denied: every row mutates the same module. Order: `TDD-0083`, `TDD-0084`, `TDD-0085`, `TDD-0086` |
| `test-design-analyst`         | `test-design-analyst#2` | PASS    | Each row's `Layer` owns its `L3` test case, and each `Selector` resolves to exactly one case and names one boundary. Every test case and user story of spec-0004 has a row, and no API obligation exists                                                                                                                                   |

Findings the plan phase hands on, none of which blocks these rows:

- `AC-0004-0044` and `BR-0004-0038` also require a plan that still holds an
  earlier release's content to be reported as stale (`QFAI-ASSETS-004`). No
  test case covers that clause. Adding one is a `/qfai-sdd` change.
- `TDD-0048` has `Layer = unit` while its test case declares `Level`
  `validators`. Twenty-six rows use `validators` and one uses `ssot-guard` as a
  `Layer`. Declaring a recognised `Level` in `06_Test-Cases.md` is a `/qfai-sdd`
  change.

### Record defects

Open entries from the reviews of the run started 2026-09-25T10:21:29.000Z. Each
is repaired, with a record re-attestation, before spec-0004 completion is
declared.

- `record:red-test-manifest`, `TDD-0083` to `TDD-0086`, Round 1: the manifest
  names only the test file. It also owes the helpers the file reads,
  `packages/qfai/tests/integration/init/upgradeStates.ts` and
  `packages/qfai/tests/helpers/stdout.ts`, and a `RED test hash` recomputed
  over all three.
- `record:falsifiability-evidence`, `TDD-0086`: `Other rows` and the matching
  decision in `atdd-spec-0004.md` say no mutation can put a finding on a fresh
  tree without failing `TDD-0083`. A mutation that reports only an unedited
  `bugfix.yml` would fail `TDD-0086` alone. The observed facts stand: the
  recorded mutation also fails `TDD-0083`.

### Handoff to /qfai-sdd

- `AC-0004-0044` and `BR-0004-0038`: add a test case for a plan that still
  holds an earlier release's bytes, drawing `QFAI-ASSETS-004` at `error`. The
  `older-plan` overlay in `upgradeStates.ts` already builds that tree. Seed its
  ledger row.
- `06_Test-Cases.md`, the workflow-plan provenance preamble and
  `EX-0004-0052` to `EX-0004-0055`: they name the built `qfai init` and
  `qfai validate`. The cases call `runInit` from source and
  `validateAssistantAssets`. Reword them, or move one case to the built CLI.
- The ledger's `Owning module` cell for these rows names
  `validators/assistantAssets.ts`. Three of the four predicates are in
  `assistantAssetProvenance.ts`.

Optional test hardening, for `/qfai-atdd`:

- The `TC-0004-0083` case asserts only an absence. An assertion that the plans
  are installed and recorded would stop it passing on a tree with none.
- The `TC-0004-0082` case asserts that the edited memo exists. The overlay
  already fails when the memo is missing, so the assertion can be removed.

## Ledger rows advanced

### TDD-0067

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageApprovalSet.test.ts`
- Selector: `TC-0004-0074: QFAI-TRIAGE-005 on exactly the rows requiresApproval() is true for`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageApprovalSet.test.ts --testNamePattern='TC-0004-0074: ' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (Tests 1 passed (1)); the validator's own approval set held the same five operations, and its separate branch the same `UPDATE:REMOVE`
- GREEN result: exit 0; 1 passed (1), after the validator dropped its own set
- Changed files: `packages/qfai/src/core/validators/specPack.ts` (`APPROVAL_REQUIRED_OPS` and the `UPDATE:REMOVE` condition replaced by `requiresApproval()`), `packages/qfai/tests/integration/validators/triageApprovalSet.test.ts`, `packages/qfai/tests/helpers/triageFixture.ts`
- Regression: `tests/validators/specPack/triageSection.test.ts`, `tests/integration/sddTriageSection.test.ts`, `tests/integration/sddSkillTriagePhase.test.ts` and `tests/unit/cliMessageLanguage.test.ts` pass unchanged.
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0079

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageLegacyApproval.test.ts`
- Selector: `TC-0004-0078: a DELETE row with - in Authorization-Ref raises QFAI-TRIAGE-005 as without the column`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageLegacyApproval.test.ts --testNamePattern='TC-0004-0078: ' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (Tests 1 passed (1)); the triage validator reads columns by header name, so an `Authorization-Ref` column holding `-` changes nothing
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/tests/integration/validators/triageLegacyApproval.test.ts`
- Note: the case holds once `QFAI-TRIAGE-011` lands: a `-` reference is never checked.
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0080

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageNoApprovalRow.test.ts`
- Selector: `TC-0004-0079: an UPDATE / APPEND row whose Authorization-Ref resolves to no file raises no triage finding`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageNoApprovalRow.test.ts --testNamePattern='TC-0004-0079: ' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (Tests 1 passed (1)); no reference is read today
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/tests/integration/validators/triageNoApprovalRow.test.ts`
- Note: the case holds once `QFAI-TRIAGE-011` lands: `requiresApproval()` is read before the reference, and is false for this row.
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0083

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/workflowPlanProvenance.test.ts`
- Selector: `TC-0004-0080: An edited plan is reported as a differing governed file`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/workflowPlanProvenance.test.ts --testNamePattern='TC-0004-0080: ' --reporter=verbose`
- RED result: exit 1 against the sources before the governed-layer change; `AssertionError: expected [] to deeply equal [ Array(1) ]`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/src/core/assistantAssetProvenance.ts` and `packages/qfai/src/core/governedAssistantManifest.ts` (spec-0003's U4 change: the plans are a governed layer and ship in the governed list), `packages/qfai/tests/integration/validators/workflowPlanProvenance.test.ts`
- Evidence file: recorded here for the reason the TDD-0067 entry gives.

### TDD-0084

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/workflowPlanProvenance.test.ts`
- Selector: `TC-0004-0081: A deleted plans layer is reported once, against the layer`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/workflowPlanProvenance.test.ts --testNamePattern='TC-0004-0081: ' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ [ 'QFAI-ASSETS-007', …(1) ] ]` (still red after the layer joined the list: the recorded layer was read as the key's first segment, `process`)
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/src/core/validators/assistantAssets.ts` (the recorded and present layer reads go through `governedLayerOf`), `packages/qfai/tests/integration/validators/workflowPlanProvenance.test.ts`
- Evidence file: recorded here for the reason the TDD-0067 entry gives.

### TDD-0085

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/workflowPlanProvenance.test.ts`
- Selector: `TC-0004-0082: Nothing under process/migrations is reported`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/workflowPlanProvenance.test.ts --testNamePattern='TC-0004-0082: ' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (Tests 1 passed); `process/migrations/` was never governed, and stays outside the list
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/tests/integration/validators/workflowPlanProvenance.test.ts`
- Evidence file: recorded here for the reason the TDD-0067 entry gives.

### TDD-0086

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/workflowPlanProvenance.test.ts`
- Selector: `TC-0004-0083: A fresh init tree has no finding under process/workflows`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/workflowPlanProvenance.test.ts --testNamePattern='TC-0004-0083: ' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (Tests 1 passed); it is the guard on the plan's risk row, and it stays green once the plans are governed
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/tests/integration/validators/workflowPlanProvenance.test.ts`
- Evidence file: recorded here for the reason the TDD-0067 entry gives.
