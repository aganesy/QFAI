# Implement Evidence: spec-0010

Rows closed under DR-0298, one entry per row. Each entry is superseded by the
reviewed entry in `atdd-spec-0010.md`, which the row's Evidence cell now
points at, and is kept as the record of the earlier close.

## Ledger rows advanced

### TDD-0030

- Superseded by: `.qfai/evidence/atdd-spec-0010.md#tdd-0030`, after the row was reopened and closed with its reviews
- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/discussionSettledInputsSpec0010.test.ts`
- Selector: `TC-0010-0014: settled inputs are not asked again, and only the unresolved scope is covered`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/discussionSettledInputsSpec0010.test.ts --testNamePattern='TC-0010-0014: settled inputs are not asked again, and only the unresolved scope is covered' --reporter=verbose`
- RED result: exit 1; `AssertionError: skills/qfai-discussion/references/orchestrated-mode.md has ## What is already settled: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/references/orchestrated-mode.md`, `packages/qfai/tests/integration/discussionSettledInputsSpec0010.test.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0031

- Superseded by: `.qfai/evidence/atdd-spec-0010.md#tdd-0031`, after the row was reopened and closed with its reviews
- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/discussionEntryCheckSpec0010.test.ts`
- Selector: `TC-0010-0015: SKILL.md cites references/orchestrated-mode.md on one line, and the reference cites the entry check`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/discussionEntryCheckSpec0010.test.ts --testNamePattern='TC-0010-0015: SKILL\.md cites references/orchestrated-mode\.md on one line, and the reference cites the entry check' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (Tests 1 passed (1)); the citation line and the reference's entry-check pointer were written before this test existed
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/tests/integration/discussionEntryCheckSpec0010.test.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0032

- Superseded by: `.qfai/evidence/atdd-spec-0010.md#tdd-0032`, after the row was reopened and closed with its reviews
- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/discussionOperationsSpec0010.test.ts`
- Selector: `TC-0010-0016: the Operations table lists exactly resolve-unsettled-product-scope`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/discussionOperationsSpec0010.test.ts --testNamePattern='TC-0010-0016: the Operations table lists exactly resolve-unsettled-product-scope' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (Tests 1 passed (1)); the Operations table was written before this test existed
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/tests/integration/discussionOperationsSpec0010.test.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.
