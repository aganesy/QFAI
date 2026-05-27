# 09 Delta

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-04-01
- Primary: spec-0006 新規作成（旧 spec-0004 の統合）
- Tags: doctor, diagnostics, consolidation

## Migration Record

| Old Spec  | Title       | Key Changes                                                                                                            |
| --------- | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| spec-0004 | qfai doctor | Core functionality retained. IDs renumbered to 0006-XXXX. --out and root auto-discovery added as explicit requirements |

## Outdated Content Removed

- 旧 spec-0004 の実装詳細（個別チェック項目のリスト）は core/doctor.ts に委譲されるため spec レベルでは概要にとどめた

## Adopted

- Adopted: 旧 spec-0004 を spec-0006 として再番号付け
- Why: v2.0 のスペック番号体系（CAP-0006）に合わせるため

## Rejected

- Candidate: 旧番号（spec-0004）を維持する
- Reason: 新番号体系への統一
- DO NOT: 旧 spec-0004 の番号で参照を残さないこと
- Temptation: 旧番号維持は移行コストが低いが、体系の一貫性を損なう

## 2026-05-24 — CHG-005 — qfai-prototyping defect remediation pack

- Discussion pack: `.qfai/discussion/discussion-20260523221141355/`
- Operation: UPDATE:APPEND
- Posture: additive append; preserves existing AC/BR/EX/TC numbering. NFR-0112 (fresh init + playwright install yields zero error lines) absorbed into AC-0006-0012 / TC-0006-0016.
- Approved By: yusuke_senaga

### Triage (rows owned by this spec)

| Source                                         | Subject                                                                                                                                       | Existing Spec | Operation | Sub-op | Approved By   | Rationale                                                     |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ------------- | ------------------------------------------------------------- |
| REQ-0107 (discussion-20260523221141355)        | playwright を primary launcher として probe; playwright-cli は deprecation window 中 accepted (`D-DEPRECATED-PROBE` warning, sunset `1.10.0`) | spec-0006     | UPDATE    | APPEND | yusuke_senaga | `qfai doctor` probe rebuild は CAP-0006 (doctor) territory    |
| REQ-0122 (discussion-20260523221141355)        | `skills.integrity` 既定 severity を `warning` に downgrade; doctor summary を errors / warnings の 2 group に分割表示                         | spec-0006     | UPDATE    | APPEND | yusuke_senaga | doctor output shape は spec-0006 owned                        |
| NFR-0112 (fresh init + playwright zero errors) | absorbed into AC-0006-0012 / TC-0006-0016                                                                                                     | spec-0006     | UPDATE    | APPEND | yusuke_senaga | NFR realized as acceptance signal on doctor fresh-project run |

### CHG-005 Operations (this PR)

| Op ID  | Op Type       | Target                                                                                | Summary                                                                                                                 |
| ------ | ------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| OP-001 | UPDATE:APPEND | 01_Spec.md (Relevant Requirements: REQ-0107 / REQ-0122; Entry-points US range → 0007) | doctor probe rebuild + skills.integrity downgrade を Relevant Requirements に登録                                       |
| OP-002 | UPDATE:APPEND | 02_User-stories.md (US-0006-0006..0007)                                               | playwright primary probe + 2-group summary user stories                                                                 |
| OP-003 | UPDATE:APPEND | 03_Acceptance-Criteria.md (AC-0006-0010..0014)                                        | probe primary + deprecation-window + fresh-init zero-error + skills.integrity warning + group split (Gherkin + catalog) |
| OP-004 | UPDATE:APPEND | 04_Business-Rules.md (BR-0006-0007..0011)                                             | mirror BR layer (probe order / window / error-text install hint / severity default / group split)                       |
| OP-005 | UPDATE:APPEND | 05_Examples.md (EX-0006-0010..0014)                                                   | worked examples per AC                                                                                                  |
| OP-006 | UPDATE:APPEND | 06_Test-Cases.md (TC-0006-0012..0018)                                                 | test coverage per AC — TC level `integration` for probe / summary; `unit` for severity-default helper                   |

- Notes:
  - Sunset version `1.10.0` is the next minor after `feature/v1.9.1`; the literal string is the only versioned token permitted in spec text per `.agents/rules/distributed-surface.md` exception for npm-version markers.
  - Parallel pack pieces: spec-0004 (validate.json profile path + SSOT-sync pair lane + R-PROMPT-SCANNER-DRIFT justification); spec-0012 (iterate-side scanner / prompt implementation); spec-0013 (UI contract template `primary_tasks:` slot); spec-0015 (Reviewer-Gate cycle check + R-PROMPT-SCANNER-DRIFT emission).
  - 9 deferred-OQ decisions made upstream by the orchestrator are reflected verbatim in REQ text (playwright-cli sunset = `1.10.0`).
- Source: REQ-0107, REQ-0122 (discussion-20260523221141355); NFR-0112

## CHG-005 Phase 1 follow-ups (2026-05-26)

| Op            | Target spec | REQ / NFR | Rationale                                                                                                                                                                            | Approver |
| ------------- | ----------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| UPDATE:APPEND | spec-0006   | REQ-0123  | CHG-005 cycle (REQ-0107 / REQ-0122 実装) で `playwrightLauncher.ts` / `doctor.ts` の 3 関数が ~50 LOC を超えたまま着地。behavior-preserving extraction を follow-up として登録する。 | auto     |
