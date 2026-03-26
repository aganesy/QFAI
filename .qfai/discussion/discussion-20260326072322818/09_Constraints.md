# 09 Constraints

## Technical Constraints

| ID   | Constraint                              | Rationale                              | Impact                                                                 |
| ---- | --------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------- |
| TC-1 | 既存 Issue 型 (types.ts) との互換性維持 | 下流の report/CI 出力が Issue 型に依存 | 新 finding は既存の Issue 構造にマッピングする必要がある               |
| TC-2 | Node 18/20 サポート                     | CI マトリクスが Node 18/20 で実行      | ES module/API の互換性を確認                                           |
| TC-3 | 新トップレベルコマンド禁止              | 既存 `qfai validate` の拡張のみ        | designAudit/designSlop は validate パイプラインに統合                  |
| TC-4 | QFAI core は tool-agnostic 維持         | 外部 model/provider に依存しない       | slop 検知は rule-based のみ、AI 推論は使用しない                       |
| TC-5 | render evidence 非依存                  | v1.7.1 は optional                     | 静的監査は discussion pack + contracts + optional HTML mock のみで成立 |

## Operational Constraints

| ID   | Constraint                        | Rationale                          | Impact                                 |
| ---- | --------------------------------- | ---------------------------------- | -------------------------------------- |
| OC-1 | 既存テスト全パス                  | CI green が merge 条件             | 既存テストの修正は互換性維持の範囲で   |
| OC-2 | config 省略時のデフォルト動作不変 | 既存ユーザーの workflow を壊さない | uiux.audit 未指定 = 全有効がデフォルト |

## Legal / Compliance Constraints

| ID   | Constraint | Regulation / Standard | Impact |
| ---- | ---------- | --------------------- | ------ |
| LC-1 | 特になし   | -                     | -      |

## Budget Constraints

- Budget range: N/A（OSS プロジェクト）
- Cost drivers: 開発工数のみ

## Timeline Constraints

- Hard deadlines: v1.7.2 リリース
- Milestones: v1.7.0 完了後
