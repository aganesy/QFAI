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

### v1.7.13 補完 (2026-04-04)

- adopted: BR-0005-0010~0012, EX-0005-0011~0012, TC-0005-0011~0012 追加
- rationale: コミット履歴分析で特定された mode provenance, fullHarness, calibration スキーマの設計意図補完

### v1.7.13 収束 (2026-04-05)

- adopted: US range 更新 US-0005-0001..US-0005-0008
- rationale: US-0005-0008（prototyping observability section）が US range に含まれていなかった修正

## v1.7.14 (2026-04-07) — Report Terminology Canonical 統一

- adopted: REQ-0029（Report Terminology Canonical 統一）追加
- rationale: v1.7.14 の breaking change を仕様に反映:
  - **"Compatibility Issues" → "Canonical Issues"**: レポートの issue カテゴリセクション名と issuesByCategory キーを "compatibility" → "canonical" に変更（DR-0108）
  - **Surface inference fallback**: surface 推定不能時に "mixed" にフォールバックし warning を付与（旧: エラー）
  - **バージョン更新**: レポート内バージョンコメント v1.7.13 → v1.7.14
