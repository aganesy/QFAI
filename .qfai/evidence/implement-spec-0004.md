# Implement Evidence: spec-0004

Rows closed under DR-0298, one entry per row.

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

### TDD-0068

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`
- Selector: `TC-0004-0075 create-row: two CAPs cited and one bound raise no QFAI-TRIAGE-011 or QFAI-TRIAGE-005`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageAuthorizationRef.test.ts --testNamePattern='TC-0004-0075 create-row: two CAPs cited and one bound raise no QFAI-TRIAGE-011 or QFAI-TRIAGE-005' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (1 passed); nothing read the column yet, and the case holds that a passing reference raises nothing once it is read
- GREEN result: exit 0; the selector passed (1 passed)
- Changed files: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`

### TDD-0069

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`
- Selector: `TC-0004-0075 column-position: the column after Depends-On raises no QFAI-TRIAGE-011 or QFAI-TRIAGE-005`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageAuthorizationRef.test.ts --testNamePattern='TC-0004-0075 column-position: the column after Depends-On raises no QFAI-TRIAGE-011 or QFAI-TRIAGE-005' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (1 passed); nothing read the column yet, and the case holds that a passing reference raises nothing once it is read
- GREEN result: exit 0; the selector passed (1 passed)
- Changed files: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`

### TDD-0070

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`
- Selector: `TC-0004-0076 resolves-malformed: a value outside the two-segment grammar names the Resolves check`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageAuthorizationRef.test.ts --testNamePattern='TC-0004-0076 resolves-malformed: a value outside the two-segment grammar names the Resolves check' --reporter=verbose`
- RED result: exit 1; `AssertionError: run-2026092404571299/create-0001: expected [] to deeply equal [ { severity: 'error', …(2) } ]`
- GREEN result: exit 0; the selector passed (1 passed)
- Changed files: `packages/qfai/src/core/validators/triageAuthorizationRef.ts` (new: the five checks), `packages/qfai/src/core/validators/specPack.ts` (`validateTriageAuthorizationRefs` over every Triage table), `packages/qfai/src/cli/commands/validate.ts` (expected state for QFAI-TRIAGE-011), `packages/qfai/src/core/emittedRuleCodes.ts` (regenerated), `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`

### TDD-0071

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`
- Selector: `TC-0004-0076 resolves-outside: a run directory linked outside the workflow directory names the Resolves check`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageAuthorizationRef.test.ts --testNamePattern='TC-0004-0076 resolves-outside: a run directory linked outside the workflow directory names the Resolves check' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { severity: 'error', …(2) } ]` (no QFAI-TRIAGE-011 was raised); the outside record is a complete passing record, so only a refusal before it is read yields Resolves
- GREEN result: exit 0; the selector passed (1 passed)
- Changed files: `packages/qfai/src/core/validators/triageAuthorizationRef.ts` (new: the five checks), `packages/qfai/src/core/validators/specPack.ts` (`validateTriageAuthorizationRefs` over every Triage table), `packages/qfai/src/cli/commands/validate.ts` (expected state for QFAI-TRIAGE-011), `packages/qfai/src/core/emittedRuleCodes.ts` (regenerated), `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`

### TDD-0072

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`
- Selector: `TC-0004-0076 resolves-missing: a well-formed value with no record file names the Resolves check`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageAuthorizationRef.test.ts --testNamePattern='TC-0004-0076 resolves-missing: a well-formed value with no record file names the Resolves check' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { severity: 'error', …(2) } ]` (no QFAI-TRIAGE-011 was raised)
- GREEN result: exit 0; the selector passed (1 passed)
- Changed files: `packages/qfai/src/core/validators/triageAuthorizationRef.ts` (new: the five checks), `packages/qfai/src/core/validators/specPack.ts` (`validateTriageAuthorizationRefs` over every Triage table), `packages/qfai/src/cli/commands/validate.ts` (expected state for QFAI-TRIAGE-011), `packages/qfai/src/core/emittedRuleCodes.ts` (regenerated), `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`

### TDD-0073

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`
- Selector: `TC-0004-0076 resolves-unparsable: a record that is not JSON names the Resolves check`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageAuthorizationRef.test.ts --testNamePattern='TC-0004-0076 resolves-unparsable: a record that is not JSON names the Resolves check' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { severity: 'error', …(2) } ]` (no QFAI-TRIAGE-011 was raised)
- GREEN result: exit 0; the selector passed (1 passed)
- Changed files: `packages/qfai/src/core/validators/triageAuthorizationRef.ts` (new: the five checks), `packages/qfai/src/core/validators/specPack.ts` (`validateTriageAuthorizationRefs` over every Triage table), `packages/qfai/src/cli/commands/validate.ts` (expected state for QFAI-TRIAGE-011), `packages/qfai/src/core/emittedRuleCodes.ts` (regenerated), `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`

### TDD-0074

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`
- Selector: `TC-0004-0076 kind: a request_scope record names the Kind check`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageAuthorizationRef.test.ts --testNamePattern='TC-0004-0076 kind: a request_scope record names the Kind check' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { severity: 'error', …(2) } ]` (no QFAI-TRIAGE-011 was raised)
- GREEN result: exit 0; the selector passed (1 passed)
- Changed files: `packages/qfai/src/core/validators/triageAuthorizationRef.ts` (new: the five checks), `packages/qfai/src/core/validators/specPack.ts` (`validateTriageAuthorizationRefs` over every Triage table), `packages/qfai/src/cli/commands/validate.ts` (expected state for QFAI-TRIAGE-011), `packages/qfai/src/core/emittedRuleCodes.ts` (regenerated), `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`

### TDD-0075

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`
- Selector: `TC-0004-0076 operation: a record whose operation is null names the Operation check`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageAuthorizationRef.test.ts --testNamePattern='TC-0004-0076 operation: a record whose operation is null names the Operation check' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { severity: 'error', …(2) } ]` (no QFAI-TRIAGE-011 was raised)
- GREEN result: exit 0; the selector passed (1 passed)
- Changed files: `packages/qfai/src/core/validators/triageAuthorizationRef.ts` (new: the five checks), `packages/qfai/src/core/validators/specPack.ts` (`validateTriageAuthorizationRefs` over every Triage table), `packages/qfai/src/cli/commands/validate.ts` (expected state for QFAI-TRIAGE-011), `packages/qfai/src/core/emittedRuleCodes.ts` (regenerated), `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`

### TDD-0076

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`
- Selector: `TC-0004-0076 binding-create: a slot bound to a CAP the Rationale does not cite names the Binding check`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageAuthorizationRef.test.ts --testNamePattern='TC-0004-0076 binding-create: a slot bound to a CAP the Rationale does not cite names the Binding check' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { severity: 'error', …(2) } ]` (no QFAI-TRIAGE-011 was raised)
- GREEN result: exit 0; the selector passed (1 passed)
- Changed files: `packages/qfai/src/core/validators/triageAuthorizationRef.ts` (new: the five checks), `packages/qfai/src/core/validators/specPack.ts` (`validateTriageAuthorizationRefs` over every Triage table), `packages/qfai/src/cli/commands/validate.ts` (expected state for QFAI-TRIAGE-011), `packages/qfai/src/core/emittedRuleCodes.ts` (regenerated), `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`

### TDD-0077

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`
- Selector: `TC-0004-0076 answerer: an answeredBy differing only in case names the Answerer check`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageAuthorizationRef.test.ts --testNamePattern='TC-0004-0076 answerer: an answeredBy differing only in case names the Answerer check' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { severity: 'error', …(2) } ]` (no QFAI-TRIAGE-011 was raised)
- GREEN result: exit 0; the selector passed (1 passed)
- Changed files: `packages/qfai/src/core/validators/triageAuthorizationRef.ts` (new: the five checks), `packages/qfai/src/core/validators/specPack.ts` (`validateTriageAuthorizationRefs` over every Triage table), `packages/qfai/src/cli/commands/validate.ts` (expected state for QFAI-TRIAGE-011), `packages/qfai/src/core/emittedRuleCodes.ts` (regenerated), `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`

### TDD-0078

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`
- Selector: `TC-0004-0077: a year-old record whose capability text differs from today's raises no QFAI-TRIAGE-011`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageAuthorizationRef.test.ts --testNamePattern='TC-0004-0077: a year-old record whose capability text differs from today'\''s raises no QFAI-TRIAGE-011' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (1 passed); after the change the case still passes because no check compares the record with the catalog or its date
- GREEN result: exit 0; the selector passed (1 passed)
- Changed files: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`

### TDD-0082

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`
- Selector: `TC-0004-0076 operation-non-create: a DELETE row carrying a reference names the Operation check`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageAuthorizationRef.test.ts --testNamePattern='TC-0004-0076 operation-non-create: a DELETE row carrying a reference names the Operation check' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { severity: 'error', …(2) } ]` (no QFAI-TRIAGE-011 was raised)
- GREEN result: exit 0; the selector passed (1 passed)
- Changed files: `packages/qfai/src/core/validators/triageAuthorizationRef.ts` (new: the five checks), `packages/qfai/src/core/validators/specPack.ts` (`validateTriageAuthorizationRefs` over every Triage table), `packages/qfai/src/cli/commands/validate.ts` (expected state for QFAI-TRIAGE-011), `packages/qfai/src/core/emittedRuleCodes.ts` (regenerated), `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`

