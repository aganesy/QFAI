# 07 Decisions

## Decisions

### DR-0038-0001

- Date: 2026-03-30
- Title: ファイルレベルdiffチェック採用（Phase 1）
- Context: spec BR/AC変更と実装コードの整合性検証において、検証粒度の選択が必要
- Decision: Phase 1はファイルレベルのdiffチェックで実装。将来Phase 2で行レベル/セマンティック解析に拡張
- Rejected: 完全セマンティック解析 — 実装コスト高、段階的改善で対応
- Evidence: discussion-20260330183225659 OQ-0002

### DR-0038-0002

- Date: 2026-03-30
- Title: フルスキャンフォールバック（差分ゼロ時）
- Context: 差分検出で変更specがゼロの場合の動作決定
- Decision: フルスキャンにフォールバック（エラー停止しない）
- Rejected: エラー停止 — 「spec指定なしで作業不可」問題の再発
- Evidence: spec-0011 REQ-0010, discussion-20260330183225659 OQ-0003

### DR-0038-0003

- Date: 2026-03-30
- Title: Traceability Ledger不在時はwarningスキップ
- Context: 16_Traceability-ledger.md不在specのトレーサビリティチェック方法
- Decision: warningを出してチェックスキップ（errorで停止しない）
- Rejected: error停止 — ユーザー体験悪化
- Evidence: discussion-20260330183225659 OQ-0004
