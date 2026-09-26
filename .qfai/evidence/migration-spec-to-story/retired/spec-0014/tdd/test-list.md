# TDD Execution Ledger

| TDD-ID | TC-Refs | Layer | Tier | Test file | Selector | Status | DR-ID | Evidence | US-Refs | CON-API-Refs | Owning module | Blocked-By | BR-Ref | Boundary |
| -------- | ------------ | ----------- | --------------------------------------------------------------- | --------------------------- | --------- | ------------ | ---------------------------------------- |
| TDD-0009 | TC-0014-0009 | integration | - | packages/qfai/tests/integration/verifySemanticsSpec0014.test.ts | TC-0014-0009 | done | DR-0014-0001 | current verify semantics suite pass | - | - | - | - | - | - |
| TDD-0018 | TC-0014-0018 | integration | - | packages/qfai/tests/integration/verifySemanticsSpec0014.test.ts | TC-0014-0018 | done | DR-0014-0001 | current verify semantics suite pass | - | - | - | - | - | - |
| TDD-0019 | TC-0014-0019 | integration | - | packages/qfai/tests/integration/verifySemanticsSpec0014.test.ts | TC-0014-0019 | done | DR-0014-0001 | current verify semantics suite pass | - | - | - | - | - | - |
| TDD-0028 | TC-0014-0028 | unit | - | packages/qfai/tests/validators/prototypingDesignSystem.test.ts | PROT-DS01 happy path | exception | DR-0014-0002 | current prototyping validator pass | - | - | - | - | - | - |
| TDD-0029 | TC-0014-0029 | unit | - | packages/qfai/tests/validators/prototypingDesignSystem.test.ts | PROT-DS01 failure path | exception | DR-0014-0002 | current prototyping validator pass | - | - | - | - | - | - |
| TDD-0033 | TC-0014-0033 | unit | - | packages/qfai/tests/cli/commands/prototypingIterate.test.ts | iter-NN path layout | done | DR-0014-0001 | current iterate path-layout suite pass | - | - | - | - | - | - |
| TDD-0034 | TC-0014-0034 | unit | - | packages/qfai/tests/cli/commands/prototypingIterate.test.ts | cycle 0 deletes fullHarness | done | DR-0014-0001 | current iterate cycle-0 reset suite pass | - | - | - | - | - | - |

## CHG-006 v1.9.2 second-wave — certify --scope saas-package + --upgrade-scope (2026-05-31)

| TDD-ID | TC-Refs | Layer | Tier | Test file | Selector | Status | DR-ID | Evidence | US-Refs | CON-API-Refs | Owning module | Blocked-By | BR-Ref | Boundary |
| -------- | ------------ | ----------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ------ | ---------------------------- | -------------------------------------------------------------- |
| TDD-0035 | TC-0014-0035 | integration | - | packages/qfai/tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts | certify --scope saas-package seals a scope-limited certificate | done | DR-0014-0004 (cites DR-0274) | RED→GREEN 2026-06-01 (W5 c5f61e12); reviewers PASS×3; REQ-0166 | - | - | - | - | - | - |
| TDD-0036 | TC-0014-0036 | integration | - | packages/qfai/tests/integration/cli/commands/prototypingCertify.upgradeScope.test.ts | certify --upgrade-scope full upgrades a saas-package cert to full DONE | done | DR-0014-0004 (cites DR-0274) | RED→GREEN 2026-06-01 (W5 c5f61e12); reviewers PASS×3; REQ-0166 | - | - | - | - | - | - |
| TDD-0037 | - | E2E | T2 | - | - | todo | - | - | US-0014-0013 | - | - | - | - | - |
| TDD-0038 | - | E2E | T2 | - | - | todo | - | - | US-0014-0014 | - | - | - | - | - |
| TDD-0039 | - | E2E | T2 | - | - | todo | - | - | US-0014-0018 | - | - | - | - | - |
| TDD-0040 | - | E2E | T2 | - | - | todo | - | - | US-0014-0019 | - | - | - | - | - |
| TDD-0041 | - | E2E | T2 | - | - | todo | - | - | US-0014-0020 | - | - | - | - | - |

CHG-006 notes:

- TDD-0035..0036 cover REQ-0166 (certify side; validate-profile side `qfai validate --profile saas-package` owned by spec-0004). Certificate carries `scope: "saas-package"` + non-empty `notes:` naming each skipped ATDD / implement-class gate; never claims full DONE. `--upgrade-scope full` gated on missing gates landing. Cross-spec decisions cited from `_policies/08_Decisions.md` DR-0274; one-minor deprecation window per OC-63.
- Ledger sync follow-up: the spec-0014 CHG-006 SDD wave omitted `UPDATE:APPEND tdd/test-list.md` from its triage table. This section reconciles the ledger before `/qfai-implement` proceeds.

## Spec-to-story restructure — verify references and the recut assistant tree (2026-09-23)

| TDD-ID   | TC-Refs      | Layer       | Tier | Test file | Selector | Status | DR-ID | Evidence | US-Refs | CON-API-Refs | Owning module                                                                           | Blocked-By | BR-Ref       | Boundary |
| -------- | ------------ | ----------- | ---- | --------- | -------- | ------ | ----- | -------- | ------- | ------------ | --------------------------------------------------------------------------------------- | ---------- | ------------ | -------- |
| TDD-0042 | TC-0014-0037 | Integration | T1   | -         | -        | todo   | -     | -        | -       | -            | packages/qfai/assets/init/.qfai/assistant/skills/qfai-verify/references/articles.md     | -          | BR-0014-0026 | -        |
| TDD-0043 | TC-0014-0038 | Integration | T1   | -         | -        | todo   | -     | -        | -       | -            | packages/qfai/assets/init/.qfai/assistant/skills/qfai-verify/references/context-load.md | -          | BR-0014-0027 | -        |
| TDD-0044 | TC-0014-0039 | Integration | T1   | -         | -        | todo   | -     | -        | -       | -            | packages/qfai/assets/init/.qfai/assistant/skills/qfai-verify/SKILL.md                   | -          | BR-0014-0028 | -        |
| TDD-0045 | TC-0014-0040 | Integration | T1   | -         | -        | todo   | -     | -        | -       | -            | packages/qfai/assets/init/.qfai/assistant/skill/qfai-verify/SKILL.md                    | -          | BR-0014-0029 | -        |
| TDD-0046 | TC-0014-0041 | Integration | T1   | -         | -        | todo   | -     | -        | -       | -            | packages/qfai/assets/init/.qfai/assistant/skill/qfai-verify/SKILL.md                    | -          | BR-0014-0030 | -        |

Notes:

- Seeded from the `## Triage (2026-09-23 spec-to-story)` rows in `09_delta.md`. Every TC is integration-level, so each row is ATDD-owned: `/qfai-atdd` writes the test, and `/qfai-implement` fills `Test file` and `Selector` when it advances the row.
- `/qfai-verify` names its constitution, routing and agent-entry sources in `SKILL.md`, and `references/context-load.md` follows it, so `SKILL.md` owns TC-0014-0040 and TC-0014-0041.
