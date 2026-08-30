# TDD Execution Ledger

| TDD-ID   | TC-Refs      | Layer       | Test file                                                 | Selector                                                  | Status    | DR-ID        | Evidence                                                                          |
| -------- | ------------ | ----------- | --------------------------------------------------------- | --------------------------------------------------------- | --------- | ------------ | --------------------------------------------------------------------------------- |
| TDD-0001 | TC-0008-0001 | integration | packages/qfai/tests/integration/atddSkillSpec0008.test.ts | TC-0008-0001: Volume Estimate Produces Signal Table       | exception | DR-0008-0001 | one-shot GREEN 2026-04-14 14 pass                                                 |
| TDD-0002 | TC-0008-0002 | integration | packages/qfai/tests/integration/atddSkillSpec0008.test.ts | TC-0008-0002: E2E Tests Cover All Required US             | exception | DR-0008-0001 | one-shot GREEN 2026-04-14 + existing atddCodeTraceability.test.ts                 |
| TDD-0003 | TC-0008-0003 | integration | packages/qfai/tests/integration/atddSkillSpec0008.test.ts | TC-0008-0003: API Tests Cover All Required CON-API        | exception | DR-0008-0001 | one-shot GREEN 2026-04-14 + existing atddCodeTraceability.test.ts                 |
| TDD-0004 | TC-0008-0004 | integration | packages/qfai/tests/integration/atddSkillSpec0008.test.ts | TC-0008-0004: Integration Tests Cover All Required TC     | exception | DR-0008-0001 | one-shot GREEN 2026-04-14 + existing atddCodeTraceability.test.ts                 |
| TDD-0005 | TC-0008-0005 | integration | packages/qfai/tests/integration/atddSkillSpec0008.test.ts | TC-0008-0005: Forbidden TC Annotations Detected           | exception | DR-0008-0001 | one-shot GREEN 2026-04-14 + existing atddCodeTraceability.test.ts                 |
| TDD-0006 | TC-0008-0006 | integration | packages/qfai/tests/integration/atddSkillSpec0008.test.ts | TC-0008-0006: Stage Gates Not Skipped                     | exception | DR-0008-0001 | one-shot GREEN 2026-04-14 14 pass                                                 |
| TDD-0007 | TC-0008-0007 | integration | packages/qfai/tests/integration/atddSkillSpec0008.test.ts | TC-0008-0007: Evidence File Contains Required Sections    | exception | DR-0008-0001 | one-shot GREEN 2026-04-14 14 pass                                                 |
| TDD-0008 | TC-0008-0008 | integration | packages/qfai/tests/integration/atddSkillSpec0008.test.ts | TC-0008-0008: Reviewer Independence Enforced              | exception | DR-0008-0001 | one-shot GREEN 2026-04-14 14 pass                                                 |
| TDD-0009 | TC-0008-0009 | integration | —                                                         | TC-0008-0009: Coverage Placeholder for EX-0008-0006       | exception | DR-0008-0100 | exception:DR-0008-0100 deferred — no impl yet, v1.7.15 rev3                       |
| TDD-0010 | TC-0008-0010 | integration | —                                                         | TC-0008-0010: Coverage Placeholder for EX-0008-0007       | exception | DR-0008-0100 | exception:DR-0008-0100 deferred — no impl yet, v1.7.15 rev3                       |
| TDD-0011 | TC-0008-0011 | integration | packages/qfai/tests/integration/specAutoDiscovery.test.ts | TC-0008-0011: Coverage Depth Matrix Produced and Verified | exception | DR-0008-0002 | exception:DR-0008-0002 backfill — impl-first v1.7.15 rev3, vitest PASS 2026-04-14 |
| TDD-0012 | TC-0008-0012 | integration | packages/qfai/tests/integration/specAutoDiscovery.test.ts | TC-0008-0012: Normal-Path-Only Flagged as Incomplete      | exception | DR-0008-0002 | exception:DR-0008-0002 backfill — impl-first v1.7.15 rev3, vitest PASS 2026-04-14 |

## CHG-006 v1.9.2 second-wave — atdd scaffold + 3-cycle escalation (2026-05-31)

| TDD-ID   | TC-Refs      | Layer       | Test file                                                      | Selector                                                                              | Status | DR-ID                    | Evidence                                                       |
| -------- | ------------ | ----------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------ | ------------------------ | -------------------------------------------------------------- |
| TDD-0013 | TC-0008-0013 | integration | packages/qfai/tests/integration/atddScaffoldSkeleton.test.ts   | TC-0008-0013: scaffold emits per-TC skeleton with TODO + Refs (US/AC/TC)              | done   | DR-0008-0003 (→ DR-0272) | RED→GREEN 2026-06-01 (W4 c1acb533); reviewers PASS×3; REQ-0157 |
| TDD-0014 | TC-0008-0014 | integration | packages/qfai/tests/integration/atddScaffoldEscalation.test.ts | TC-0008-0014: scaffold idempotency + 3-cycle escalation (atdd.scaffoldEscalateCycles) | done   | DR-0008-0003 (→ DR-0272) | RED→GREEN 2026-06-01 (W4 c1acb533); reviewers PASS×3; REQ-0157 |

CHG-006 notes:

- TDD-0013..0014 cover REQ-0157 (atdd scaffold bulk skeleton generation + 3-cycle escalation). Cross-spec decision cited from `_policies/08_Decisions.md`: DR-0272 (escalate-after-3 default with `atdd.scaffoldEscalateCycles` config override).
- Ledger sync follow-up: the spec-0008 CHG-006 SDD wave omitted `UPDATE:APPEND tdd/test-list.md` from its triage table. This section reconciles the ledger before `/qfai-implement` proceeds.

## CHG-007 — worker-scoped credential-reuse guidance (2026-08-05)

| TDD-ID   | TC-Refs      | Layer       | Test file | Selector                                                                           | Status | DR-ID | Evidence |
| -------- | ------------ | ----------- | --------- | ---------------------------------------------------------------------------------- | ------ | ----- | -------- |
| TDD-0015 | TC-0008-0015 | Integration | —         | TC-0008-0015: seven rules + companion rule stated and cross-linked from the skill  | todo   | —     | —        |
| TDD-0016 | TC-0008-0016 | Integration | —         | TC-0008-0016: backend deny-list scan returns zero; planted-name fixture returns >0 | todo   | —     | —        |
| TDD-0017 | TC-0008-0017 | Integration | —         | TC-0008-0017: layer tokens, annotation forms and finding-code set unchanged        | todo   | —     | —        |
| TDD-0018 | TC-0008-0018 | Integration | —         | TC-0008-0018: script-naming rule adopter-only; scope excludes unit/component       | todo   | —     | —        |

CHG-007 notes:

- TDD-0015..0018 cover REQ-0024. The deliverable is prose, so every row's oracle reads a shipped artifact; there is no validator, finding code or annotation token to test.
- `Layer` uses the word form per the layer crosswalk in `catalog/test-layers.md`; `06_Test-Cases.md#Level` carries the word form (`integration`) matching the sibling ATDD-family specs, since this pack had no prior `Level` field to inherit a spelling from.
