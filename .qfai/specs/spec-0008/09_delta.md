# 09 Delta (Migration Record)

## Origin

- Consolidates: old spec-0013 (UI/UX review -- ATDD-relevant parts)
- Old spec-0013 covered UI/UX review framework including ATDD integration
- ATDD acceptance test orchestration parts are now captured in this spec (spec-0008)

## Adopted

- AD-0008-0001: ATDD skill consolidation -- all acceptance test orchestration (E2E/API/Integration) unified under CAP-0008
- AD-0008-0002: Layer-annotation mapping -- strict annotation per test layer (US for E2E, TC for Integration, CON-API for API)

## Rejected

- RJ-0008-0001: Unit/Component test inclusion in ATDD
  - DO NOT include unit/component tests in this skill scope
  - Temptation: adding unit tests to ATDD for "completeness"
  - Reason: unit/component tests belong to `/qfai-implement` per separation of concerns

## ID Renumbering

| Old ID                       | New ID                      | Notes                             |
| ---------------------------- | --------------------------- | --------------------------------- |
| spec-0013 US/TC (ATDD parts) | US-0008-YYYY / TC-0008-YYYY | Renumbered to spec-0008 namespace |

## Post-Migration Changes

| Date       | Change Type | IDs Added                                                                          | Summary                                                                                                                      |
| ---------- | ----------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-01 | adopted     | US-0008-0006, AC-0008-0009, BR-0008-0007, EX-0008-0008, TC-0008-0011, TC-0008-0012 | テストケース品質深度チェック: Coverage Depth Matrix 必須化、正常系のみ不完全判定、test-design-analyst/qa-gatekeeper 責務拡張 |

## Triage

| Source                                                     | Subject                                                                                                                                                                           | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                              |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| REQ-0004, REQ-0005, REQ-0010, REQ-0016, REQ-0017 (CHG-003) | `/qfai-atdd` SKILL.md に `project_memory:` 宣言追加。author 前に open work-log entry を読む。kind 別 write-trigger に従う。handoff entry body を 5 セクション schema に従わせる。 | spec-0008     | UPDATE    | APPEND | pin-implied | Implementation-phase skill (REQ-0005 scope)。SKILL.md は配布物。subject-token overlap (`skill`, `atdd`)。新 CAP 不要。 |

## CHG-003 (v1.9.0) — Work-log Read Contract + project_memory Declaration

- Discussion pack: `.qfai/discussion/discussion-20260522081618995/`
- Contract: `.qfai/contracts/cli/worklog-entry.schema.md` (CLI-WLOG)
- Operation: UPDATE:APPEND
- Obligation: `qfai-atdd` SKILL.md MUST gain a `project_memory:` YAML block enumerating the layers it reads. The skill MUST read open work-log entries (`status` ∈ `{active, handoff}` and `scope` ∈ `{global, <current-spec>}`) before authoring, and MUST cite consulted entry IDs in its completion report (REQ-0005). The skill MUST follow the 11-`kind` write-trigger SSOT (REQ-0004) and the handoff-brief body schema (REQ-0017).
- Cascade: SKILL.md declaration is validated by spec-0004's `qfai validate` (companion spec-0004 row). Reviewer-Gate `R-WORKLOG-DRIFT` / `R-REJECTED-READOPT` runs on this skill's outputs (companion spec-0015 row).
- Implementation-phase 詳細 US/AC/BR/EX/TC は次回の per-spec SDD pass で append される
- Source: REQ-0004, REQ-0005, REQ-0010, REQ-0016, REQ-0017

## 2026-05-27 — v1.9.2 Second-Wave (spec-0008)

- Discussion pack: `.qfai/discussion/discussion-20260527075558258/`
- Operation: UPDATE:APPEND (additive; preserves existing US/AC/BR/EX/TC numbering)
- Local ID ranges added: US-0008-0007, AC-0008-0010..0011, BR-0008-0008..0009, EX-0008-0009..0010, TC-0008-0013..0014

### Triage (rows owned by this spec)

| Operation     | Sub-op | Target                                                                                    | Source (REQ) | Rationale                                                | DR-Ref  | Status |
| ------------- | ------ | ----------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------- | ------- | ------ |
| UPDATE:APPEND | APPEND | 01_Spec.md (Relevant Requirements + US range→0007 + Consumer-View copy-down)              | REQ-0157     | atdd scaffold bulk skeleton gen; cascade verified        | DR-0272 | PASS   |
| UPDATE:APPEND | APPEND | 02_User-stories.md (US-0008-0007)                                                         | REQ-0157     | scaffold user story; cascade verified                    | DR-0272 | PASS   |
| UPDATE:APPEND | APPEND | 03..06 (AC-0008-0010,0011 / BR-0008-0008,0009 / EX-0008-0009,0010 / TC-0008-0013,0014)    | REQ-0157     | skeleton shape + idempotency + escalation; cascade verified | DR-0272 | PASS   |
| UPDATE:APPEND | APPEND | 07_Decisions.md (DR-0008-0002 cites DR-0272) + 08_Open-questions (OQ-0166)                | REQ-0157     | escalate-count resolved by DR-0272; cascade verified     | DR-0272 | PASS   |

- Notes:
  - REQ-0157 が "default deferred to /qfai-sdd" としていた escalate-cycle count は DR-0272 (既定 3, `atdd.scaffoldEscalateCycles` 可変) で確定。
  - Required edges US-0008-0007 → AC-0008-0010/0011 → BR-0008-0008/0009 → EX-0008-0009/0010 → TC-0008-0013/0014; TC は normal (0013) AND error/boundary (0014) を両方カバー。
- Source: REQ-0157 (discussion-20260527075558258)
