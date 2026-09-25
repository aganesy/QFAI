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
