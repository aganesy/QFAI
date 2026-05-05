# 09 delta

## 2026-04-22

- Clarified: prototyping-related routing is now described against the skill-led flow.
- Superseded: wording that tied evaluator routing to a removed prototyping runtime entrypoint.

## 2026-05-06 — CHG-001 — Absorbed prototyping routing rebuild + full-harness profile drop from spec-0017 (decomposition)

| Op ID  | Op Type       | Target                                            | Summary                                                                                |
| ------ | ------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| OP-001 | UPDATE:APPEND | 01_Spec.md (Scope.In)                             | `/qfai-prototyping` v2.0 routing rebuild + `review-profiles.yml` full-harness drop      |
| OP-002 | UPDATE:APPEND | 06_Test-Cases.md (TC-0015-0015..0016)             | routing rebuild + profile drop test coverage                                           |
| OP-003 | UPDATE:APPEND | tdd/test-list.md (TDD rows for TC-0015-0015..0016)| TDD ledger sync                                                                        |

- Approved By: yusuke_senaga
- Notes: subjects originated from former spec-0017 (Prototyping v2.0 / UX-loop redesign decomposition). Same-Claude generator/reviewer assignment is rejected at the routing layer to keep the evaluator independent of generator self-preference bias.
