# 09 Delta

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-04-01
- Primary: spec-0005 新規作成（旧 spec-0003 の統合）
- Tags: report, markdown, json, consolidation

## Migration Record

| Old Spec  | Title       | Key Changes                                                                                                     |
| --------- | ----------- | --------------------------------------------------------------------------------------------------------------- |
| spec-0003 | qfai report | Core functionality retained. IDs renumbered to 0005-XXXX. phase guard and spec-pack report added as explicit US |

## Outdated Content Removed

- 旧 spec-0003 では暗黙的だった phase guard と spec-pack レポートを US-0005-0007, AC-0005-0008 として明示化
- 実装に合わせて validate.json の形式検証ルール（isValidationResult）を BR-0005-0005 として明示化

## Adopted

- Adopted: 旧 spec-0003 を spec-0005 として再番号付け
- Why: v2.0 のスペック番号体系に合わせるため

## Rejected

- Candidate: 旧番号（spec-0003）を維持する
- Reason: 新番号体系は CAP-0005 に揃えるため
- DO NOT: 旧 spec-0003 の番号でテスト/コード内の参照を残さないこと
- Temptation: 旧番号維持は変更が少ないが、番号体系の不整合が将来の混乱を招く

## v1.7.13 (2026-04-04) — Canonical Sidecar Convergence

- adopted: REQ-0028 (Prototyping report observability section) 追加
- adopted: US-0005-0008, AC-0005-0009~0010, BR-0005-0009, EX-0005-0009~0010, TC-0005-0009~0010 追加
- rationale: v1.7.13 report.ts に prototyping observability section が追加された実装の仕様反映
