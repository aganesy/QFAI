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

### TDD-0030

- TDD-ID: TDD-0030
- Layer: Integration
- Test file: packages/qfai/tests/integration/discussionSettledInputsSpec0010.test.ts
- Selector: TC-0010-0014: settled inputs are not asked again, and only the unresolved scope is covered
- TC-ref: TC-0010-0014
- Reopened: `exception` -> `todo` at 4fb18000744e6cbc201bd34e7fcbb3f5ebe5f1e6, to take the qa-gatekeeper and reviewer turns the row closed without. `DR-0298` stays in `DR-ID` as the record of why it was parked.
- Branch: falsifiability — the reference already states that settled inputs are not asked again and that only the unresolved scope is covered, so the test passed on its first run
- Predicate to break: packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/references/orchestrated-mode.md, `## What is already settled`, the bullet that bounds the discussion to the scope `settled` leaves unresolved
- Mutation: `The discussion covers only the scope` to `The discussion covers the scope`, committed alone as f48fbfa6563e7a397f18866282fd623c8da47b51 and reverted by the commit after it
- Why it fails: without "only" the bullet no longer limits the discussion to the unresolved scope, and ``expect(text).toMatch(/the discussion covers only the scope `settled` leaves unresolved/i)`` fails

The test reads `## What is already settled` from the shipped reference and
observes the two clauses of the case:

| Clause | Observation |
| ------ | ----------- |
| settled inputs are not asked again | the section states that what `settled` records, the routing result and every answered question are taken as settled and not asked again |
| only the unresolved scope is covered | the section states that the discussion covers only the scope `settled` leaves unresolved |

First run, at 4fb18000744e6cbc201bd34e7fcbb3f5ebe5f1e6:

```text
pnpm -C packages/qfai exec vitest run tests/integration/discussionSettledInputsSpec0010.test.ts -t "TC-0010-0014: settled inputs are not asked again, and only the unresolved scope is covered"
  Test Files 1 passed (1); Tests 1 passed (1)
```

#### Round 1

- Round 1: Satisfied-by: packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/references/orchestrated-mode.md, `## What is already settled`, the bullet bounding the discussion to the scope `settled` leaves unresolved
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/discussionSettledInputsSpec0010.test.ts -t "TC-0010-0014: settled inputs are not asked again, and only the unresolved scope is covered"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed (1). The row's case fails on `AssertionError: expected '## What is already settled - What the…' to match /the discussion covers only the scope…/i` at `tests/integration/discussionSettledInputsSpec0010.test.ts:21:18`

The edit:

```diff
-- The discussion covers only the scope `settled` leaves unresolved.
+- The discussion covers the scope `settled` leaves unresolved.
```

- Round 1: Falsifiability revision: f48fbfa6563e7a397f18866282fd623c8da47b51
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: e6f037bc57539240f35ef3c26dd965b25712d78644268ec5cde74cf5767b3e17
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/recordProse.ts
packages/qfai/tests/helpers/shippedAssistant.ts
packages/qfai/tests/integration/discussionSettledInputsSpec0010.test.ts
```

- Round 1: Revision: 9a886a6921fe9097741948f19a669679895ae419
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/discussionSettledInputsSpec0010.test.ts -t "TC-0010-0014: settled inputs are not asked again, and only the unresolved scope is covered"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed (1). Taken after the mutation's revert, on a tree equal to 4fb18000744e6cbc201bd34e7fcbb3f5ebe5f1e6

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/discussionSettledInputsSpec0010.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 1 passed (1). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: 9a886a6921fe9097741948f19a669679895ae419

- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the falsifiability mutation run, reviewed revision f48fbfa6563e7a397f18866282fd623c8da47b51; qa-gatekeeper#2 PASS, GREEN, refactor verify and the mutation as oracle proof, reviewed revision 9a886a6921fe9097741948f19a669679895ae419

- Round 1: reviewer verdict (attempt 1): PASS
- Round 1: Review pack (attempt 1): .qfai/review/review-20260925110400001 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): fd2c0a4522e11e767f8b9a18fd7afc66986642a147df6d2ea89d1e746801accd
- Spec review: PASS
- Spec reviewed revision: 9a886a6921fe9097741948f19a669679895ae419
- Spec audited evidence hash: 7ffc02d2ae9fb720bad79e68da1ae8c007deca192727fd27424a25cb7121874a
- Spec review pack: .qfai/review/review-20260925110400001 <!-- qfai:not-a-citation -->
- Spec review pack seal: fd2c0a4522e11e767f8b9a18fd7afc66986642a147df6d2ea89d1e746801accd
- Code quality review: PASS
- Code quality reviewed revision: 9a886a6921fe9097741948f19a669679895ae419
- Code quality audited evidence hash: 7ffc02d2ae9fb720bad79e68da1ae8c007deca192727fd27424a25cb7121874a
- Code quality review pack: .qfai/review/review-20260925110400001 <!-- qfai:not-a-citation -->
- Code quality review pack seal: fd2c0a4522e11e767f8b9a18fd7afc66986642a147df6d2ea89d1e746801accd
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: 9a886a6921fe9097741948f19a669679895ae419
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/discussionSettledInputsSpec0010.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 1 passed (1). Off a checkpoint boundary, since other rows of spec-0010 are still at todo, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: 9a886a6921fe9097741948f19a669679895ae419
- Checkpoint verification seal: fa42a8b5dd5de223726ccd4a4462f1755d826603c2e9f884e360cfe20d9bb8b8

### TDD-0031

- TDD-ID: TDD-0031
- Layer: Integration
- Test file: packages/qfai/tests/integration/discussionEntryCheckSpec0010.test.ts
- Selector: TC-0010-0015: SKILL.md cites references/orchestrated-mode.md on one line, and the reference cites the entry check
- TC-ref: TC-0010-0015
- Reopened: `exception` -> `todo` at 4fb18000744e6cbc201bd34e7fcbb3f5ebe5f1e6, to take the qa-gatekeeper and reviewer turns the row closed without. `DR-0298` stays in `DR-ID` as the record of why it was parked.
- Branch: falsifiability — the skill already cites the reference on one line and the reference already cites the entry check, so the test passed on its first run
- Predicate to break: packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/references/orchestrated-mode.md, the opening line that points at the shared operating baseline's `#workflow-run-entry-check-mandatory` section
- Mutation: the pointer loses its `#workflow-run-entry-check-mandatory` anchor, committed alone as fdb7bcdc17e47583531f5b49009dad57aa0a174e and reverted by the commit after it
- Why it fails: the reference then names the baseline file but not the entry check in it, and `expect(reference).toContain(ENTRY_CHECK)` fails

The test observes the two clauses of the case:

| Clause | Observation |
| ------ | ----------- |
| `SKILL.md` cites the reference on one line | exactly one line of the shipped `qfai-discussion/SKILL.md` contains `references/orchestrated-mode.md` |
| the reference cites the entry check | the shipped reference contains `.qfai/assistant/constitution/shared-skill-operating-baseline.md#workflow-run-entry-check-mandatory` |

First run, at 4fb18000744e6cbc201bd34e7fcbb3f5ebe5f1e6:

```text
pnpm -C packages/qfai exec vitest run tests/integration/discussionEntryCheckSpec0010.test.ts -t "TC-0010-0015: SKILL.md cites references/orchestrated-mode.md on one line, and the reference cites the entry check"
  Test Files 1 passed (1); Tests 1 passed (1)
```

#### Round 1

- Round 1: Satisfied-by: packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/references/orchestrated-mode.md, the opening line citing `.qfai/assistant/constitution/shared-skill-operating-baseline.md#workflow-run-entry-check-mandatory`
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/discussionEntryCheckSpec0010.test.ts -t "TC-0010-0015: SKILL.md cites references/orchestrated-mode.md on one line, and the reference cites the entry check"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed (1). The row's case fails on `AssertionError: expected '# qfai-discussion in a workflow run\n…' to contain '.qfai/assistant/constitution/shared-s…'` at `tests/integration/discussionEntryCheckSpec0010.test.ts:21:23`

The edit:

```diff
-Run the entry check in `.qfai/assistant/constitution/shared-skill-operating-baseline.md#workflow-run-entry-check-mandatory` first.
+Run the entry check in `.qfai/assistant/constitution/shared-skill-operating-baseline.md` first.
```

- Round 1: Falsifiability revision: fdb7bcdc17e47583531f5b49009dad57aa0a174e
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 8e8a0a8f1bb4d7d7b3575531bd1c90d0a1bb470058ee2fa08c2d73f2212d46a8
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/recordProse.ts
packages/qfai/tests/helpers/shippedAssistant.ts
packages/qfai/tests/integration/discussionEntryCheckSpec0010.test.ts
```

- Round 1: Revision: 9a886a6921fe9097741948f19a669679895ae419
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/discussionEntryCheckSpec0010.test.ts -t "TC-0010-0015: SKILL.md cites references/orchestrated-mode.md on one line, and the reference cites the entry check"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed (1). Taken after the mutation's revert, on a tree equal to 4fb18000744e6cbc201bd34e7fcbb3f5ebe5f1e6

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/discussionEntryCheckSpec0010.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 1 passed (1). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: 9a886a6921fe9097741948f19a669679895ae419

- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the falsifiability mutation run, reviewed revision fdb7bcdc17e47583531f5b49009dad57aa0a174e; qa-gatekeeper#2 PASS, GREEN, refactor verify and the mutation as oracle proof, reviewed revision 9a886a6921fe9097741948f19a669679895ae419

- Round 1: reviewer verdict (attempt 1): PASS
- Round 1: Review pack (attempt 1): .qfai/review/review-20260925110400002 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): fd94ceaed27adad66699c88e031921fbfb11477c67bc6b7fd5f39a547b966768
- Spec review: PASS
- Spec reviewed revision: 9a886a6921fe9097741948f19a669679895ae419
- Spec audited evidence hash: aee840fdf7f0cddd79c2196c360fb5092e8710dab117a585a9c3396ff6f768e8
- Spec review pack: .qfai/review/review-20260925110400002 <!-- qfai:not-a-citation -->
- Spec review pack seal: fd94ceaed27adad66699c88e031921fbfb11477c67bc6b7fd5f39a547b966768
- Code quality review: PASS
- Code quality reviewed revision: 9a886a6921fe9097741948f19a669679895ae419
- Code quality audited evidence hash: aee840fdf7f0cddd79c2196c360fb5092e8710dab117a585a9c3396ff6f768e8
- Code quality review pack: .qfai/review/review-20260925110400002 <!-- qfai:not-a-citation -->
- Code quality review pack seal: fd94ceaed27adad66699c88e031921fbfb11477c67bc6b7fd5f39a547b966768
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: 9a886a6921fe9097741948f19a669679895ae419
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/discussionEntryCheckSpec0010.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 1 passed (1). Off a checkpoint boundary, since other rows of spec-0010 are still at todo, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: 9a886a6921fe9097741948f19a669679895ae419
- Checkpoint verification seal: d1f39d6c068d9ceee2c959a02b6705034aeba45eb8fc8c396529a4ee3164a881

### TDD-0032

- TDD-ID: TDD-0032
- Layer: Integration
- Test file: packages/qfai/tests/integration/discussionOperationsSpec0010.test.ts
- Selector: TC-0010-0016: the Operations table lists exactly resolve-unsettled-product-scope
- TC-ref: TC-0010-0016
- Reopened: `exception` -> `todo` at 4fb18000744e6cbc201bd34e7fcbb3f5ebe5f1e6, to take the qa-gatekeeper and reviewer turns the row closed without. `DR-0298` stays in `DR-ID` as the record of why it was parked.
- Branch: falsifiability — the reference's Operations table already lists exactly `resolve-unsettled-product-scope`, so the test passed on its first run
- Predicate to break: packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/references/orchestrated-mode.md, `## Operations`, the table row naming the one operation the skill serves
- Mutation: the operation `resolve-unsettled-product-scope` renamed to `resolve-product-scope`, committed alone as 59786c3d158de2d551a9a650bc9b6ece60477e7f and reverted by the commit after it
- Why it fails: the table then lists an operation the plan vocabulary does not give the skill, and `expect(ids).toEqual(["resolve-unsettled-product-scope"])` fails

The test takes the first table under `## Operations` and observes the two
clauses of the case:

| Clause | Observation |
| ------ | ----------- |
| the first column is headed `Operation` | the table's header cell is `Operation` |
| the backticked IDs are exactly the set the test holds | the IDs in the first column equal `["resolve-unsettled-product-scope"]` |

First run, at 4fb18000744e6cbc201bd34e7fcbb3f5ebe5f1e6:

```text
pnpm -C packages/qfai exec vitest run tests/integration/discussionOperationsSpec0010.test.ts -t "TC-0010-0016: the Operations table lists exactly resolve-unsettled-product-scope"
  Test Files 1 passed (1); Tests 1 passed (1)
```

#### Round 1

- Round 1: Satisfied-by: packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/references/orchestrated-mode.md, `## Operations`, the table row for `resolve-unsettled-product-scope`
- Round 1: Falsifiability command: pnpm -C packages/qfai exec vitest run tests/integration/discussionOperationsSpec0010.test.ts -t "TC-0010-0016: the Operations table lists exactly resolve-unsettled-product-scope"
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed (1). The row's case fails on `AssertionError: expected [ 'resolve-product-scope' ] to deeply equal [ 'resolve-unsettled-product-scope' ]` at `tests/integration/discussionOperationsSpec0010.test.ts:16:17`

The edit:

```diff
-| `resolve-unsettled-product-scope` | Settle the product scope the routing left open, and only that |
+| `resolve-product-scope`           | Settle the product scope the routing left open, and only that |
```

- Round 1: Falsifiability revision: 59786c3d158de2d551a9a650bc9b6ece60477e7f
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 65e22fff7f3ca01a0e2f618ad439910cff30f74be3a57efec80f61956badadb4
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/recordProse.ts
packages/qfai/tests/helpers/shippedAssistant.ts
packages/qfai/tests/integration/discussionOperationsSpec0010.test.ts
```

- Round 1: Revision: 9a886a6921fe9097741948f19a669679895ae419
- Round 1: GREEN command: pnpm -C packages/qfai exec vitest run tests/integration/discussionOperationsSpec0010.test.ts -t "TC-0010-0016: the Operations table lists exactly resolve-unsettled-product-scope"
- Round 1: GREEN result: Test Files 1 passed (1); Tests 1 passed (1). Taken after the mutation's revert, on a tree equal to 4fb18000744e6cbc201bd34e7fcbb3f5ebe5f1e6

- Refactor verify command: pnpm -C packages/qfai exec vitest run tests/integration/discussionOperationsSpec0010.test.ts
- Refactor verify result: Test Files 1 passed (1); Tests 1 passed (1). No production or test file changed in this phase: the row's predicate already existed, so there was nothing to refactor, and the whole test file is the relevant suite
- Refactor verify revision: 9a886a6921fe9097741948f19a669679895ae419

- qa-gatekeeper: PASS
- qa-gatekeeper attempts: qa-gatekeeper#1 PASS, RED phase gate on the falsifiability mutation run, reviewed revision 59786c3d158de2d551a9a650bc9b6ece60477e7f; qa-gatekeeper#2 PASS, GREEN, refactor verify and the mutation as oracle proof, reviewed revision 9a886a6921fe9097741948f19a669679895ae419

- Round 1: reviewer verdict (attempt 1): PASS
- Round 1: Review pack (attempt 1): .qfai/review/review-20260925110400003 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): 494bb2d224cd68f08e191df5c9684629bc39e8b5da7dfbff7bc0095f16a4cfe6
- Spec review: PASS
- Spec reviewed revision: 9a886a6921fe9097741948f19a669679895ae419
- Spec audited evidence hash: 022ac2ecb1d36aaefc07fb87bf91fb2616628b59d1a476bcf4bd0bcd0f5a8649
- Spec review pack: .qfai/review/review-20260925110400003 <!-- qfai:not-a-citation -->
- Spec review pack seal: 494bb2d224cd68f08e191df5c9684629bc39e8b5da7dfbff7bc0095f16a4cfe6
- Code quality review: PASS
- Code quality reviewed revision: 9a886a6921fe9097741948f19a669679895ae419
- Code quality audited evidence hash: 022ac2ecb1d36aaefc07fb87bf91fb2616628b59d1a476bcf4bd0bcd0f5a8649
- Code quality review pack: .qfai/review/review-20260925110400003 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 494bb2d224cd68f08e191df5c9684629bc39e8b5da7dfbff7bc0095f16a4cfe6
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: 9a886a6921fe9097741948f19a669679895ae419
- Checkpoint verification command: pnpm -C packages/qfai exec vitest run tests/integration/discussionOperationsSpec0010.test.ts
- Checkpoint verification result: PASS — Test Files 1 passed (1); Tests 1 passed (1). Off a checkpoint boundary, since other rows of spec-0010 are still at todo, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: 9a886a6921fe9097741948f19a669679895ae419
- Checkpoint verification seal: 752266afbe90cfa9635f0491cece3a91d1715bc366c328ab7082178d5878c9f7

### TDD-0033

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: E2E. Discharged by the spec-0018 US-0018-0004 journey, discussion variant, as spec-0018 `10_Plan.md` `### Which journey discharges which stage story` assigns it; the test also carries `QFAI:SPEC-0010:US-0010-0013`.
- Test file: `packages/qfai/tests/e2e/spec0018StopForMyDecisionE2E.test.ts`
- Selector: `US-0018-0004, discussion variant (spec-0010 TDD-0033)`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018StopForMyDecisionE2E.test.ts --testNamePattern='US-0018-0004, discussion variant \(spec-0010 TDD-0033\)' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run; already satisfied by spec-0018 TDD-0470, whose discussion work order carries `settled`, and by the discovery route returning the run to routing once its discussion stage is accepted
- GREEN result: exit 0; `✓ |e2e| tests/e2e/spec0018StopForMyDecisionE2E.test.ts > US-0018-0004, discussion variant (spec-0010 TDD-0033): the discussion stage gets what is settled and returns the run to routing`
- Production files: none

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0010.md` (committed).
Totals: ✅ 14 / ⚠️ 37 / ❌ 23, with 196 not applicable, across 270 scored cells — 234 matrix cells (26 rows × 9 columns) and 36 business rule cells (12 rows × 3 columns).
The marks are derived from the pack and the TDD ledger by the rules that file states;
`Status` is a row verdict and is outside every total.

## Grilling Session

### /qfai-implement — run started 2026-09-25T10:33:00.000Z

Preflight: confidence high

No session opened. The run reopens TDD-0030, TDD-0031 and TDD-0032 to take
the reviews their earlier close skipped. The spec, the ledger rows and their
tests are settled input, and each row's test already passes, which routes it to
the falsifiability branch without a decision to make.

## Work Orders Summary

### Rows for the /qfai-implement run started 2026-09-25T10:33:00.000Z

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | `qa-gatekeeper` | qa-gatekeeper#1 | RED gate, TDD-0030 falsifiability run | `#tdd-0030`, f48fbfa6563e7a397f18866282fd623c8da47b51 | `#tdd-0030` qa-gatekeeper attempts | PASS |
| 2 | `qa-gatekeeper` | qa-gatekeeper#1 | RED gate, TDD-0031 falsifiability run | `#tdd-0031`, fdb7bcdc17e47583531f5b49009dad57aa0a174e | `#tdd-0031` qa-gatekeeper attempts | PASS |
| 3 | `qa-gatekeeper` | qa-gatekeeper#1 | RED gate, TDD-0032 falsifiability run | `#tdd-0032`, 59786c3d158de2d551a9a650bc9b6ece60477e7f | `#tdd-0032` qa-gatekeeper attempts | PASS |
| 4 | `qa-gatekeeper` | qa-gatekeeper#2 | GREEN gate and oracle proof, TDD-0030 | `#tdd-0030`, 9a886a6921fe9097741948f19a669679895ae419 | `#tdd-0030` qa-gatekeeper attempts | PASS |
| 5 | `qa-gatekeeper` | qa-gatekeeper#2 | GREEN gate and oracle proof, TDD-0031 | `#tdd-0031`, 9a886a6921fe9097741948f19a669679895ae419 | `#tdd-0031` qa-gatekeeper attempts | PASS |
| 6 | `qa-gatekeeper` | qa-gatekeeper#2 | GREEN gate and oracle proof, TDD-0032 | `#tdd-0032`, 9a886a6921fe9097741948f19a669679895ae419 | `#tdd-0032` qa-gatekeeper attempts | PASS |
| 7 | - | n/a | grilling(-@2026-09-25T10:33:00.000Z/none): none | - | - | PASS |
| 8 | `completion-reviewer` | completion-reviewer#1 | Spec review, TDD-0030 | `#tdd-0030`, spec-0010, 9a886a6921fe9097741948f19a669679895ae419 | `review-20260925110400001` R01 | PASS |
| 9 | `implementation-reviewer` | implementation-reviewer#1 | Code quality review, TDD-0030 | `#tdd-0030`, test and shipped reference, 9a886a6921fe9097741948f19a669679895ae419 | `review-20260925110400001` R02 | PASS |
| 10 | `completion-reviewer` | completion-reviewer#1 | Spec review, TDD-0031 | `#tdd-0031`, spec-0010, 9a886a6921fe9097741948f19a669679895ae419 | `review-20260925110400002` R01 | PASS |
| 11 | `implementation-reviewer` | implementation-reviewer#1 | Code quality review, TDD-0031 | `#tdd-0031`, test and shipped reference, 9a886a6921fe9097741948f19a669679895ae419 | `review-20260925110400002` R02 | PASS |
| 12 | `completion-reviewer` | completion-reviewer#1 | Spec review, TDD-0032 | `#tdd-0032`, spec-0010, 9a886a6921fe9097741948f19a669679895ae419 | `review-20260925110400003` R01 | PASS |
| 13 | `implementation-reviewer` | implementation-reviewer#1 | Code quality review, TDD-0032 | `#tdd-0032`, test and shipped reference, 9a886a6921fe9097741948f19a669679895ae419 | `review-20260925110400003` R02 | PASS |
