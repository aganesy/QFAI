# Implement Evidence: spec-0015

Rows closed under DR-0298, one entry per row.

## Ledger rows advanced

### TDD-0038

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/spec0015GovernanceAndHandoff.test.ts`
- Selector: `QFAI:SPEC-0015:TC-0015-0034`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/spec0015GovernanceAndHandoff.test.ts --testNamePattern='QFAI:SPEC-0015:TC-0015-0034' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (Tests 1 passed | 22 skipped (23)); the validator's partial-population branch and the test predate this row
- GREEN result: exit 0; 1 passed
- Changed files: none; `packages/qfai/tests/assets/openRowAlreadyTested.test.ts` drops this row from its open-but-tested backlog
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0039

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/agentDelegationSpec0015.test.ts`
- Selector: `preserves adopter profiles on both init paths while emitting the canonical target bound`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/agentDelegationSpec0015.test.ts --testNamePattern='preserves adopter profiles on both init paths while emitting the canonical target bound' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (Tests 1 passed | 16 skipped (17)); the case runs real init on both paths and existed before this row, bound to it in `.qfai/evidence/sdd-spec-0015.md`
- GREEN result: exit 0; 1 passed
- Changed files: none; the ledger row's `Test file` and `Selector` take the binding the SDD evidence records, and `packages/qfai/tests/assets/openRowAlreadyTested.test.ts` drops this row from its backlog
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0054

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/autopilotBindingExceptionSpec0015.test.ts`
- Selector: `TC-0015-0037: a run's valid binding supplies primarySpecId, and with no binding it stays hard-required`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/autopilotBindingExceptionSpec0015.test.ts --testNamePattern='TC-0015-0037: ' --reporter=verbose`
- RED result: exit 1; `AssertionError: constitution/shared-skill-operating-baseline.md has ## Default Autopilot Policy inside a run: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/constitution/shared-skill-operating-baseline.md` (`## Default Autopilot Policy inside a run`), `packages/qfai/tests/integration/autopilotBindingExceptionSpec0015.test.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0055

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/routingManifestEntrySkillsSpec0015.test.ts`
- Selector: `TC-0015-0038: qfai-run routes the orchestrator only, qfai-maintain an author and an independent reviewer on default`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/routingManifestEntrySkillsSpec0015.test.ts --testNamePattern='TC-0015-0038: ' --reporter=verbose`
- RED result: exit 1; `AssertionError: agent-routing.yml has a qfai-run entry: expected undefined to be defined`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/manifest/agent-routing.yml` (`qfai-run` entry), `packages/qfai/assets/init/.qfai/assistant/skills/qfai-run/**` (the entry skill the routing entry names), `packages/qfai/tests/integration/routingManifestEntrySkillsSpec0015.test.ts`
- Note: `qfai-run` routes one `route` phase naming only `orchestrator`, and names no `review_profile`: a profile would oblige the skill to declare that profile's reviewers, which the spec's "no authoring or reviewing role" excludes. The skill declares no `routing-profile:` either, so the two sides agree.
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0056

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/autopilotAuthorizationBucketsSpec0015.test.ts`
- Selector: `TC-0015-0039: ask-user by a human_decision, hard-required by request_scope or the binding, auto-decide by none, --auto by nothing`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/autopilotAuthorizationBucketsSpec0015.test.ts --testNamePattern='TC-0015-0039: ' --reporter=verbose`
- RED result: exit 1; `AssertionError: constitution/shared-skill-operating-baseline.md has ## Default Autopilot Policy inside a run: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/constitution/shared-skill-operating-baseline.md` (`## Default Autopilot Policy inside a run`), `packages/qfai/tests/integration/autopilotAuthorizationBucketsSpec0015.test.ts`
- Note: `packages/qfai/src/core/validators/autopilotPolicy.ts` is unchanged in its judgement; it gains the two new skills' own hard-required inputs (`change request`, `edit target`), which the shipped-bucket pin in `tests/assets/assets.test.ts` requires of every skill.
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0057

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/actorHistoryRunSpec0015.test.ts`
- Selector: `TC-0015-0040: the history travels with every work order, and an author or recommender is never its own independent reviewer`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/actorHistoryRunSpec0015.test.ts --testNamePattern='TC-0015-0040: ' --reporter=verbose`
- RED result: exit 1; `AssertionError: constitution/shared-skill-delegation-baseline.md has ### Actor history in a run: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/constitution/shared-skill-delegation-baseline.md` (`## Inside a workflow run`), `packages/qfai/tests/integration/actorHistoryRunSpec0015.test.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0058

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/grillingInRunSpec0015.test.ts`
- Selector: `TC-0015-0041: settled is taken as settled, only the remaining frontier is worked, and the session split stands`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/grillingInRunSpec0015.test.ts --testNamePattern='TC-0015-0041: ' --reporter=verbose`
- RED result: exit 1; `AssertionError: constitution/shared-skill-delegation-baseline.md has ### Grilling in a run: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/constitution/shared-skill-delegation-baseline.md` (`## Inside a workflow run`), `packages/qfai/tests/integration/grillingInRunSpec0015.test.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

## Shipped-skill shape

Adding `qfai-run` put it, and the earlier `qfai-maintain`, under the asset
guards every shipped skill answers to. Both now carry an Inputs Priority
section, the delegation guardrail subsections, a Work Orders Summary, a
smoke-check override, a hard-required entry, and a reviewer remit row in the
delegation baseline. The guards run for this: `tests/assets/assets.test.ts`,
`completionContractSmokeCheck.test.ts`, `reviewerRoundBudget.test.ts`,
`skillInputsPriority.test.ts`, all passing for both skills.
