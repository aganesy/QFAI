# Implement Evidence: spec-0001

Rows closed under DR-0298, one entry per row.

## Ledger rows advanced

### TDD-0034

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/stage0ReuseSpec0001.test.ts`
- Selector: `TC-0001-0025: Stage 0 output is reused inside a run only on an equal recomputed key`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/stage0ReuseSpec0001.test.ts --testNamePattern='TC-0001-0025: Stage 0 output is reused inside a run only on an equal recomputed key' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected '## Stage 0 - Steering completion refr…' to match /inside an active workflow run, a sta…/i`
- GREEN result: exit 0; 1 passed
- Changed files: `packages/qfai/assets/init/.qfai/assistant/constitution/shared-skill-operating-baseline.md`, `packages/qfai/tests/integration/stage0ReuseSpec0001.test.ts`, `packages/qfai/tests/helpers/shippedAssistant.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0035

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/stageSkillEntryCheckSpec0001.test.ts`
- Selector: `TC-0001-0026: the entry check hands over, works the order, or is off`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/stageSkillEntryCheckSpec0001.test.ts --testNamePattern='TC-0001-0026: the entry check hands over, works the order, or is off' --reporter=verbose`
- RED result: exit 1; `AssertionError: the section exists: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed, 1 skipped
- Changed files: `packages/qfai/assets/init/.qfai/assistant/constitution/shared-skill-operating-baseline.md`, `packages/qfai/tests/integration/stageSkillEntryCheckSpec0001.test.ts`, `packages/qfai/tests/helpers/shippedAssistant.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0036

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/stageSkillEntryCheckSpec0001.test.ts`
- Selector: `TC-0001-0027: a work order that matches no issued one edits nothing and is refused`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/stageSkillEntryCheckSpec0001.test.ts --testNamePattern='TC-0001-0027: a work order that matches no issued one edits nothing and is refused' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected '' to match /matches no issued one/i`
- GREEN result: exit 0; 1 passed, 1 skipped
- Changed files: `packages/qfai/assets/init/.qfai/assistant/constitution/shared-skill-operating-baseline.md`, `packages/qfai/tests/integration/stageSkillEntryCheckSpec0001.test.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0038

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/stageSkillStandaloneSpec0001.test.ts`
- Selector: `TC-0001-0029: a stage invoked by name runs standalone and ends at that stage`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/stageSkillStandaloneSpec0001.test.ts --testNamePattern='TC-0001-0029: a stage invoked by name runs standalone and ends at that stage' --reporter=verbose`
- RED result: exit 1; `AssertionError: the by-name row exists: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed
- Changed files: `packages/qfai/assets/init/.qfai/assistant/constitution/shared-skill-operating-baseline.md`, `packages/qfai/tests/integration/stageSkillStandaloneSpec0001.test.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0041

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/governanceTextSpec0001.test.ts`
- Selector: `TC-0001-0032: the constitution states request authority and binding, and routes are not change types`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/governanceTextSpec0001.test.ts --testNamePattern='TC-0001-0032: the constitution states request authority and binding, and routes are not change types' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected '# QFAI Constitution (Non‑Negotiable) …' to match /the operator's first explicit reques…/i`
- GREEN result: exit 0; 1 passed
- Changed files: `packages/qfai/assets/init/.qfai/assistant/constitution/shared-skill-operating-baseline.md`, `packages/qfai/assets/init/.qfai/assistant/constitution/workflow.md`, `packages/qfai/tests/integration/governanceTextSpec0001.test.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.
