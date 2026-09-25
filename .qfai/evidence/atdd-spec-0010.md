# ATDD Evidence: spec-0010

## Ledger rows advanced

### TDD-0006

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: integration
- Reset by: `CR-20260912-0003` (option 1; TC-0010-0006 re-derived). The row's earlier selector named no case in its file, so the case was written and the selector points at it.
- Test file: `packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts`
- Selector: `TC-0010-0006: the screen-contract template ranks no exploration and names only the user's brand direction`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/discussionSkillTemplateIntegration.test.ts tests/e2e/discussionHardeningE2E.test.ts --testNamePattern='TC-0010-000' --reporter=verbose`
- RED result: exit 1; `AssertionError: a direction other than the user's brand direction: - Design direction (product intent, brand signals, anti-goals): `../04_Sources.md` ...: expected ... to match /01_Context\.md#Design Direction/`
- GREEN result: exit 0; 26 passed (26) across both files
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/templates/uiux/40_screen_contracts.md` (the cross-reference names the user's brand direction in `01_Context.md` and calls `04_Sources.md` the reference registries), `packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts`

### TDD-0007

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: integration
- Reset by: `CR-20260912-0003` (option 1; TC-0010-0006 re-derived). The earlier selector named no case in its file.
- Test file: `packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts`
- Selector: `TC-0010-0006: the completion conditions keep explorations unranked and finalize no design system`
- RED command (cwd `packages/qfai`): as TDD-0006
- RED result: already satisfied. The first run failed on the test itself (it read a wrapped condition line by line); once it read each numbered condition whole it passed with the matrix unchanged.
- GREEN result: exit 0; 26 passed (26)
- Changed files: `packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts`

### TDD-0008

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: integration
- Reset by: `CR-20260912-0003` (option 1; TC-0010-0006 re-derived). The earlier selector named no case in its file.
- Test file: `packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts`
- Selector: `TC-0010-0006: the skill's planner-first guidance ranks no exploration and keeps the brand direction the user's`
- RED command (cwd `packages/qfai`): as TDD-0006
- RED result: already satisfied: exit 0 for this case on the first run
- GREEN result: exit 0; 26 passed (26)
- Changed files: `packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts`

### TDD-0010

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: integration
- Reset by: `CR-20260912-0003` (option 1; TC-0010-0006 re-derived). The row had no test file.
- Test file: `packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts`
- Selector: `TC-0010-0006: the tree qfai init writes carries the same planner-first discussion guidance`
- RED command (cwd `packages/qfai`): as TDD-0006
- RED result: already satisfied: exit 0 for this case on the first run; init copies the skill, the matrix and the screen-contract template byte for byte
- GREEN result: exit 0; 26 passed (26)
- Changed files: `packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts`

### TDD-0011

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: integration
- Reset by: `CR-20260912-0003` (option 1; TC-0010-0007 re-derived to `/qfai-sdd` Phase 0 as the producer). The row had no test file.
- Test file: `packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts`
- Selector: `TC-0010-0007: the brand direction is recorded in 01_Context.md and Phase 0 authors DESIGN.md`
- RED command (cwd `packages/qfai`): as TDD-0006
- RED result: already satisfied: exit 0 for this case on the first run
- GREEN result: exit 0; 26 passed (26)
- Changed files: `packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts`

### TDD-0025

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: E2E
- Reset by: `CR-20260912-0003` (US-0010-0008 re-derived). The spec's plan names no spec-0018 journey for this story.
- Test file: `packages/qfai/tests/e2e/spec0010DesignDirectionE2E.test.ts`
- Selector: `US-0010-0008: the installed discussion stage carries the screen explorations unranked`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0010DesignDirectionE2E.test.ts --testNamePattern=US-0010-0008 --reporter=verbose`
- RED result: exit 1, taken with the screen-contract template at its committed bytes; `AssertionError: expected '# Screen Contracts\n\n## Purpose\n\nD…' to match /^- Br…/01_Context\.md#Design Direction`
- GREEN result: exit 0; 2 passed (2)
- Changed files: `packages/qfai/tests/e2e/spec0010DesignDirectionE2E.test.ts`, and the template change TDD-0006 records

### TDD-0026

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: E2E
- Reset by: `CR-20260912-0003` (US-0010-0009 re-derived). The spec's plan names no spec-0018 journey for this story.
- Test file: `packages/qfai/tests/e2e/spec0010DesignDirectionE2E.test.ts`
- Selector: `US-0010-0009: the installed stage records the user's direction for /qfai-sdd Phase 0 to author DESIGN.md`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0010DesignDirectionE2E.test.ts --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run
- GREEN result: exit 0; 2 passed (2)
- Changed files: `packages/qfai/tests/e2e/spec0010DesignDirectionE2E.test.ts`
