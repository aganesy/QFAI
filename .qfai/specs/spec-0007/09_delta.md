# 09 Delta

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-04-01
- Primary: spec-0007 新規作成（旧 spec-0005 の統合）
- Tags: guardrails, drift-prevention, rfc2119, consolidation

## Migration Record

| Old Spec  | Title           | Key Changes                                                                                                                                 |
| --------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| spec-0005 | qfai guardrails | Core functionality retained. IDs renumbered to 0007-XXXX. extract --max and --paths added as explicit requirements. LLM format output added |

## Outdated Content Removed

- 旧 spec-0005 の BR-0005-0009（RFC 2119 検出仕様の重複記述）を DR-0001 に統合
- 旧 spec-0005 の auto-traceability backfill rows（TC-0005-0010, TC-0005-0011）は新 ID 体系では不要のため除外

## Adopted

- Adopted: 旧 spec-0005 を spec-0007 として再番号付け
- Why: v2.0 のスペック番号体系（CAP-0007）に合わせるため

## Rejected

- Candidate: 旧番号（spec-0005）を維持する
- Reason: 新番号体系への統一
- DO NOT: 旧 spec-0005 の番号で参照を残さないこと
- Temptation: 旧番号維持は移行コストが低いが、体系の一貫性を損なう

## 2026-05-06 — CHG-001 — Scope-deferred legacy concept reintroduction guard (decomposition note)

| Op ID  | Op Type       | Target                | Summary                                                                                                            |
| ------ | ------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| OP-001 | UPDATE:APPEND | 01_Spec.md (Scope)    | Scope-deferral note: legacy concept reintroduction guard (旧 prototyping 概念 sanity grep) は future guardrail extension へ defer |

- Approved By: yusuke_senaga
- Notes: subjects originated from former spec-0017 (Prototyping v2.0 / UX-loop redesign decomposition). The sanity grep guard for v1.x prototyping concepts (`mode` / `full-harness` / `round` / `polish` / `concept-fit`) is recorded as scope-deferred at this spec; existing distributed-surface guard (`check-no-internal-version-leakage.sh`) is unchanged. No AC/BR/EX/TC ID is allocated in this CHG.
