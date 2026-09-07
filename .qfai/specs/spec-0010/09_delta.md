# 09 Delta

## 2026-04-22

- Clarified: discussion-generated prototyping hints are downstream references only.
- Superseded: discussion-side wording that implied a current public `full-harness` mode engine.
- Retained: 3-layer evaluation family, design-system generation, trend-derived axis generation.

## 2026-05-06 — CHG-001 — Absorbed DESIGN.md authoring + legacy sidecar drop from spec-0017 (decomposition)

| Op ID  | Op Type       | Target                                             | Summary                                                                          |
| ------ | ------------- | -------------------------------------------------- | -------------------------------------------------------------------------------- |
| OP-001 | UPDATE:APPEND | 01_Spec.md (Scope.In, Entry points US range)       | DESIGN.md draft authoring + legacy sidecar drop bullets; US range → US-0010-0010 |
| OP-002 | UPDATE:APPEND | 02_User-stories.md (US-0010-0009..0010)            | DESIGN.md draft authoring + legacy sidecar drop                                  |
| OP-003 | UPDATE:APPEND | 03_Acceptance-Criteria.md (AC-0010-0007..0008)     | DESIGN.md draft as discussion phase output + legacy sidecar non-emission         |
| OP-004 | UPDATE:APPEND | 04_Business-Rules.md (BR-0010-0007..0008)          | mirror BR layer for OP-003                                                       |
| OP-005 | UPDATE:APPEND | 05_Examples.md (EX-0010-0007..0008)                | worked examples per AC                                                           |
| OP-006 | UPDATE:APPEND | 06_Test-Cases.md (TC-0010-0007..0008)              | test coverage per AC                                                             |
| OP-007 | UPDATE:APPEND | tdd/test-list.md (TDD rows for TC-0010-0007..0008) | TDD ledger sync                                                                  |

- Approved By: yusuke_senaga
- Notes: subjects originated from former spec-0017 (Prototyping v2.0 / UX-loop redesign decomposition). Cross-spec downstream consumers (e.g. `/qfai-sdd` Phase 0 lock, `/qfai-implement` design-system input) are recorded in the receiving specs (spec-0013 / spec-0011) without back-references here, per editorial convention §15.

## Triage

| Source             | Subject                                                     | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                             |
| ------------------ | ----------------------------------------------------------- | ------------- | --------- | ------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-0010 (CHG-003) | `/qfai-discussion` SKILL.md に `project_memory:` 宣言を追加 | spec-0010     | UPDATE    | APPEND | pin-implied | Discussion skill は worklog-writer ではない (REQ-0005 Notes で明示除外) が、`project_memory:` 宣言義務は適用される。subject-token overlap (`skill`)。 |

## CHG-003 (v1.9.0) — project_memory Declaration (discussion skill)

- Discussion pack: `.qfai/discussion/discussion-20260522081618995/`
- Operation: UPDATE:APPEND
- Obligation: `qfai-discussion` SKILL.md MUST gain a `project_memory:` YAML block enumerating the layers it reads (typically `manifest/`, `catalog/`, `process/`; `constitution/` is implicitly always-loaded). Discussion is intentionally excluded from the worklog-write contract per REQ-0005 Notes (it authors a discussion pack and does not modify code).
- Cascade: SKILL.md declaration is validated by spec-0004's `qfai validate`.
- Source: REQ-0010

## 2026-05-27 — v1.9.2 Second-Wave (spec-0010)

- Discussion pack: `.qfai/discussion/discussion-20260527075558258/`
- Operation: UPDATE:APPEND
- Posture: additive append; preserves existing US/AC/BR/EX/TC numbering. New local IDs: US-0010-0011..0012, AC-0010-0009..0012, BR-0010-0009..0012, EX-0010-0009..0013, TC-0010-0009..0013, TDD-0013..0017, DR-0010-0005..0006.
- Approved By: pin-implied (feature/v1.9.2)

| Operation | Sub-op | Target                                                     | Source (REQ)       | Rationale        | DR-Ref           | Status |
| --------- | ------ | ---------------------------------------------------------- | ------------------ | ---------------- | ---------------- | ------ |
| UPDATE    | APPEND | 01_Spec.md (Relevant Reqs, Consumer View, US range → 0012) | REQ-0154, REQ-0155 | cascade verified | DR-0265, DR-0266 | PASS   |
| UPDATE    | APPEND | 02_User-stories.md (US-0010-0011..0012)                    | REQ-0154, REQ-0155 | cascade verified | DR-0265, DR-0266 | PASS   |
| UPDATE    | APPEND | 03_Acceptance-Criteria.md (AC-0010-0009..0012)             | REQ-0154, REQ-0155 | cascade verified | DR-0265, DR-0266 | PASS   |
| UPDATE    | APPEND | 04_Business-Rules.md (BR-0010-0009..0012)                  | REQ-0154, REQ-0155 | cascade verified | DR-0265, DR-0266 | PASS   |
| UPDATE    | APPEND | 05_Examples.md (EX-0010-0009..0013)                        | REQ-0154, REQ-0155 | cascade verified | DR-0265, DR-0266 | PASS   |
| UPDATE    | APPEND | 06_Test-Cases.md (TC-0010-0009..0013, Type-classified)     | REQ-0154, REQ-0155 | cascade verified | DR-0265, DR-0266 | PASS   |
| UPDATE    | APPEND | 07_Decisions.md (DR-0010-0005..0006)                       | REQ-0154, REQ-0155 | cascade verified | DR-0265, DR-0266 | PASS   |
| UPDATE    | APPEND | 08_Open-questions.md (OQ-0156/0157 resolved)               | REQ-0154, REQ-0155 | cascade verified | DR-0265, DR-0266 | PASS   |
| UPDATE    | APPEND | 10_Plan.md (Second-Wave How)                               | REQ-0154, REQ-0155 | cascade verified | DR-0265, DR-0266 | PASS   |
| UPDATE    | APPEND | tdd/test-list.md (TDD-0013..0017)                          | REQ-0154, REQ-0155 | cascade verified | DR-0265, DR-0266 | PASS   |

- Notes:
  - REQ-0155 spans spec-0010 (writer) and spec-0013 (reader) — same Source REQ, file-local IDs per spec. Reader side declared in spec-0013.
  - `R-MOCK-HREF-DRIFT` (template ↔ `QFAI-MOCK-010` SSOT-sync) and `QFAI-MOCK-010` validator implementation enforcement route through spec-0004; this slice owns the discussion-side template + SKILL.md authoring surface and the pointer-writer behavior.
- Source: REQ-0154, REQ-0155 (discussion-20260527075558258)
