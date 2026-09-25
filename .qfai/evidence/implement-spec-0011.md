# Implement Evidence: spec-0011

Rows closed under DR-0298, one entry per row.

`TDD-0026` and `TDD-0039` were reopened from `exception` for the reviews
DR-0298 waived. Both are `Integration` rows, so their evidence is in
`.qfai/evidence/atdd-spec-0011.md`.

## Ledger rows advanced

### TDD-0021

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/implement/orchestrated/stageSkillHandover.test.ts`
- Selector: `TC-0011-0013 (TDD-0021): The Implement Stage Follows the Stage-Skill Handover`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/implement/orchestrated/stageSkillHandover.test.ts --testNamePattern='TC-0011-0013 \(TDD-0021\): The Implement Stage Follows the Stage-Skill Handover' --reporter=verbose`
- RED result: exit 1; `AssertionError: the ## Entry check section exists: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/orchestrated-mode.md`, `packages/qfai/tests/integration/implement/orchestrated/stageSkillHandover.test.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0022

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/implement/orchestrated/operationsTable.test.ts`
- Selector: `TC-0011-0014 (TDD-0022): The Operations Table Lists Exactly the Implement Operations`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/implement/orchestrated/operationsTable.test.ts --testNamePattern='TC-0011-0014 \(TDD-0022\): The Operations Table Lists Exactly the Implement Operations' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (Tests  1 passed (1)); the asset text landed before this test was written
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/orchestrated-mode.md`, `packages/qfai/tests/integration/implement/orchestrated/operationsTable.test.ts`
- Note: The Operations table this test reads was written for spec-0001 TDD-0039, before this test existed, so no RED was observed.
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0023

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/implement/orchestrated/runBinding.test.ts`
- Selector: `TC-0011-0015 (TDD-0023): A Valid Run Binding Supplies the Primary Spec Without a Question`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/implement/orchestrated/runBinding.test.ts --testNamePattern='TC-0011-0015 \(TDD-0023\): A Valid Run Binding Supplies the Primary Spec Without a Question' --reporter=verbose`
- RED result: exit 1; `AssertionError: the ## The bound spec section exists: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/orchestrated-mode.md`, `packages/qfai/tests/integration/implement/orchestrated/runBinding.test.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0024

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/implement/orchestrated/checkpointResume.test.ts`
- Selector: `TC-0011-0016 (TDD-0024): A Long Stage Resumes at a Ledger-Row Boundary`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/implement/orchestrated/checkpointResume.test.ts --testNamePattern='TC-0011-0016 \(TDD-0024\): A Long Stage Resumes at a Ledger-Row Boundary' --reporter=verbose`
- RED result: exit 1; `AssertionError: the ## Resuming a long stage section exists: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/orchestrated-mode.md`, `packages/qfai/tests/integration/implement/orchestrated/checkpointResume.test.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0025

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/implement/orchestrated/ledgerCheckNotCached.test.ts`
- Selector: `TC-0011-0017 (TDD-0025): The Ledger Check Is Made on the Current Ledger`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/implement/orchestrated/ledgerCheckNotCached.test.ts --testNamePattern='TC-0011-0017 \(TDD-0025\): The Ledger Check Is Made on the Current Ledger' --reporter=verbose`
- RED result: exit 1; `AssertionError: the ## The ledger check section exists: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/orchestrated-mode.md`, `packages/qfai/tests/integration/implement/orchestrated/ledgerCheckNotCached.test.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0035

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: E2E. Discharged by the spec-0018 US-0018-0001 journey, whose implement stage and seam-only order run from their work orders as `qfai-implement` for the bound spec; the test carries `QFAI:SPEC-0011:US-0011-0009`.
- Test file: `packages/qfai/tests/e2e/spec0018DeliverAFeatureE2E.test.ts`
- Selector: `US-0018-0001 (TDD-0455): one create question`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018DeliverAFeatureE2E.test.ts --testNamePattern='US-0018-0001 \(TDD-0455\): one create question' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1, shared with spec-0018 TDD-0455: the journey stopped at the seam round trip, since `next` issued no seam-only work order after an acceptance result asking for a seam (the journal fold kept no seam request)
- GREEN result: exit 0; `✓ |e2e| tests/e2e/spec0018DeliverAFeatureE2E.test.ts > US-0018-0001 (TDD-0455): one create question, then every stage from its work order, and finish qfai_done`
- Production files: `packages/qfai/src/core/workflow/persistence.ts` (`foldSeam`), under spec-0018 TDD-0455

### TDD-0027

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/implement/orchestrated/diagnoseOnlyNoTrackedFile.test.ts`
- Selector: `TC-0011-0019 (TDD-0027): A Diagnose-Only Operation Changes No File`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/implement/orchestrated/diagnoseOnlyNoTrackedFile.test.ts --testNamePattern='TC-0011-0019 \(TDD-0027\): A Diagnose-Only Operation Changes No File' --reporter=verbose`
- RED result: exit 1; `AssertionError: the ## `diagnose-only` section exists: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/orchestrated-mode.md`, `packages/qfai/tests/integration/implement/orchestrated/diagnoseOnlyNoTrackedFile.test.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0028

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/implement/orchestrated/diagnosisVerdict.test.ts`
- Selector: `TC-0011-0020 (TDD-0028): A Diagnosis Returns One Verdict From the Closed Set`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/implement/orchestrated/diagnosisVerdict.test.ts --testNamePattern='TC-0011-0020 \(TDD-0028\): A Diagnosis Returns One Verdict From the Closed Set' --reporter=verbose`
- RED result: exit 1; `AssertionError: the ## `diagnose-only` section exists: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/orchestrated-mode.md`, `packages/qfai/tests/integration/implement/orchestrated/diagnosisVerdict.test.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0030

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/implement/orchestrated/regressionFixKeepsDone.test.ts`
- Selector: `TC-0011-0022 (TDD-0030): A Regression Fix Leaves the done Row done`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/implement/orchestrated/regressionFixKeepsDone.test.ts --testNamePattern='TC-0011-0022 \(TDD-0030\): A Regression Fix Leaves the done Row done' --reporter=verbose`
- RED result: exit 1; `AssertionError: the ## `regression-fix` section exists: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/orchestrated-mode.md`, `packages/qfai/tests/integration/implement/orchestrated/regressionFixKeepsDone.test.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0031

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/implement/orchestrated/regressionFixReceipt.test.ts`
- Selector: `TC-0011-0023 (TDD-0031): The Same Test Turning GREEN Confirms a Regression Fix`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/implement/orchestrated/regressionFixReceipt.test.ts --testNamePattern='TC-0011-0023 \(TDD-0031\): The Same Test Turning GREEN Confirms a Regression Fix' --reporter=verbose`
- RED result: exit 1; `AssertionError: the ## `regression-fix` section exists: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/orchestrated-mode.md`, `packages/qfai/tests/integration/implement/orchestrated/regressionFixReceipt.test.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0032

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/implement/orchestrated/testFixLedgerRow.test.ts`
- Selector: `TC-0011-0024 (TDD-0032): A Test Fix Leaves the Ledger Row's Status Alone`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/implement/orchestrated/testFixLedgerRow.test.ts --testNamePattern='TC-0011-0024 \(TDD-0032\): A Test Fix Leaves the Ledger Row's Status Alone' --reporter=verbose`
- RED result: exit 1; `AssertionError: the ## `test-fix` section exists: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/orchestrated-mode.md`, `packages/qfai/tests/integration/implement/orchestrated/testFixLedgerRow.test.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0033

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/implement/orchestrated/testFixMeaningChange.test.ts`
- Selector: `TC-0011-0025 (TDD-0033): A Change of Meaning Is Routed to SDD`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/implement/orchestrated/testFixMeaningChange.test.ts --testNamePattern='TC-0011-0025 \(TDD-0033\): A Change of Meaning Is Routed to SDD' --reporter=verbose`
- RED result: exit 1; `AssertionError: the ## `test-fix` section exists: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/orchestrated-mode.md`, `packages/qfai/tests/integration/implement/orchestrated/testFixMeaningChange.test.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0034

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/implement/orchestrated/testFixLayers.test.ts`
- Selector: `TC-0011-0026 (TDD-0034): Implement Takes a Test Fix Only for a Unit-Layer Row`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/implement/orchestrated/testFixLayers.test.ts --testNamePattern='TC-0011-0026 \(TDD-0034\): Implement Takes a Test Fix Only for a Unit-Layer Row' --reporter=verbose`
- RED result: exit 1; `AssertionError: the ## `test-fix` section exists: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/orchestrated-mode.md`, `packages/qfai/tests/integration/implement/orchestrated/testFixLayers.test.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0029

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/implement/orchestrated/missingTestCarveOut.test.ts`
- Selector: `TC-0011-0021 (TDD-0029): A Diagnosed Missing Test Raises No Change Request`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/implement/orchestrated/missingTestCarveOut.test.ts --testNamePattern='TC-0011-0021 \(TDD-0029\): A Diagnosed Missing Test Raises No Change Request' --reporter=verbose`
- RED result: exit 1; `AssertionError: skills/qfai-implement/SKILL.md states the carve-out on a scope-gap line: expected '' to match /scope gap/i`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/SKILL.md`, `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/change-request-reset.md`, `packages/qfai/tests/integration/implement/orchestrated/missingTestCarveOut.test.ts`
- Reopened by: CR-20260925-0006 part A; the case asserts that each scope-gap line names `/qfai-sdd` as the skill that appends the row, with no decision ID. The `SKILL.md` line is edited in place, so the file gains no line.
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.
