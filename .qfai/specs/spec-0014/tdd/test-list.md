# TDD Execution Ledger

| TDD-ID   | TC-Refs      | Layer       | Test file                                                       | Selector                    | Status    | DR-ID        | Evidence                                 |
| -------- | ------------ | ----------- | --------------------------------------------------------------- | --------------------------- | --------- | ------------ | ---------------------------------------- |
| TDD-0009 | TC-0014-0009 | integration | packages/qfai/tests/integration/verifySemanticsSpec0014.test.ts | TC-0014-0009                | done      | DR-0014-0001 | current verify semantics suite pass      |
| TDD-0018 | TC-0014-0018 | integration | packages/qfai/tests/integration/verifySemanticsSpec0014.test.ts | TC-0014-0018                | done      | DR-0014-0001 | current verify semantics suite pass      |
| TDD-0019 | TC-0014-0019 | integration | packages/qfai/tests/integration/verifySemanticsSpec0014.test.ts | TC-0014-0019                | done      | DR-0014-0001 | current verify semantics suite pass      |
| TDD-0026 | TC-0014-0026 | unit        | packages/qfai/tests/validators/uix/designSystemPresence.test.ts | design system presence      | done      | DR-0014-0002 | current design-system validator pass     |
| TDD-0027 | TC-0014-0027 | unit        | packages/qfai/tests/validators/uix/designSystemPresence.test.ts | malformed design system     | done      | DR-0014-0002 | current design-system validator pass     |
| TDD-0028 | TC-0014-0028 | unit        | packages/qfai/tests/validators/prototypingDesignSystem.test.ts  | PROT-DS01 happy path        | exception | DR-0014-0002 | current prototyping validator pass       |
| TDD-0029 | TC-0014-0029 | unit        | packages/qfai/tests/validators/prototypingDesignSystem.test.ts  | PROT-DS01 failure path      | exception | DR-0014-0002 | current prototyping validator pass       |
| TDD-0032 | TC-0014-0032 | unit        | packages/qfai/tests/validators/uix/designSystemPresence.test.ts | read-only handling          | done      | DR-0014-0002 | current design-system validator pass     |
| TDD-0033 | TC-0014-0033 | unit        | packages/qfai/tests/cli/commands/prototypingIterate.test.ts     | iter-NN path layout         | done      | DR-0014-0001 | current iterate path-layout suite pass   |
| TDD-0034 | TC-0014-0034 | unit        | packages/qfai/tests/cli/commands/prototypingIterate.test.ts     | cycle 0 deletes fullHarness | done      | DR-0014-0001 | current iterate cycle-0 reset suite pass |

## CHG-006 v1.9.2 second-wave — certify --scope saas-package + --upgrade-scope (2026-05-31)

| TDD-ID   | TC-Refs      | Layer       | Test file                                                                            | Selector                                                                                | Status | DR-ID                              | Evidence                                                                |
| -------- | ------------ | ----------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ------ | ---------------------------------- | ----------------------------------------------------------------------- |
| TDD-0035 | TC-0014-0035 | integration | packages/qfai/tests/integration/cli/commands/prototypingCertify.saasPackage.test.ts  | TC-0014-0035: certify --scope saas-package seals certificate w/ scope + notes:          | done   | DR-0014-0004 (cites DR-0274)       | RED→GREEN 2026-06-01 (W5 c5f61e12); reviewers PASS×3; REQ-0166   |
| TDD-0036 | TC-0014-0036 | integration | packages/qfai/tests/integration/cli/commands/prototypingCertify.upgradeScope.test.ts | TC-0014-0036: --upgrade-scope full rejected while gates missing; accepted once they PASS | done   | DR-0014-0004 (cites DR-0274)       | RED→GREEN 2026-06-01 (W5 c5f61e12); reviewers PASS×3; REQ-0166   |

CHG-006 notes:

- TDD-0035..0036 cover REQ-0166 (certify side; validate-profile side `qfai validate --profile saas-package` owned by spec-0004). Certificate carries `scope: "saas-package"` + non-empty `notes:` naming each skipped ATDD / implement-class gate; never claims full DONE. `--upgrade-scope full` gated on missing gates landing. Cross-spec decisions cited from `_policies/08_Decisions.md` DR-0274; one-minor deprecation window per OC-63.
- Ledger sync follow-up: the spec-0014 CHG-006 SDD wave omitted `UPDATE:APPEND tdd/test-list.md` from its triage table. This section reconciles the ledger before `/qfai-implement` proceeds.
