# 07 NFR (Non-Functional Requirements)

## Requirements Table

| NFR-ID   | Category        | Title                    | Target                                                                       | Measurement                                                         | Source             | Priority |
| -------- | --------------- | ------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------ | -------- |
| NFR-0001 | performance     | Audit Validator 実行時間 | 追加バリデータによる validate 全体の実行時間増加 ≤ 500ms                     | `qfai validate` の total time を計測し、v1.7.0 比較で delta ≤ 500ms | SRC-0001           | must     |
| NFR-0002 | maintainability | Rule 追加容易性          | 新規 slop rule の追加が designSlopPatterns.json への JSON 追記のみで完了する | JSON ファイル追記のみで新 rule が検知されることを確認               | SRC-0001           | must     |
| NFR-0003 | reliability     | False Positive 制御      | style-heuristic rule が非 UI-bearing pack で発火しない                       | 非 UI-bearing fixture で finding = 0 を確認                         | SRC-0001           | must     |
| NFR-0004 | maintainability | Validator 責務分離       | designAudit.ts と designSlop.ts が明確に分離され、既存バリデータと重複しない | コードレビューで責務境界を確認                                      | SRC-0001           | should   |
| NFR-0005 | usability       | Report 可読性            | finding ごとに rule ID, why, evidence, guidance が表示される                 | report 出力サンプルで 4 フィールド確認                              | SRC-0001           | must     |
| NFR-0006 | maintainability | 後方互換性               | 既存テスト全パス、既存 config の省略時デフォルト動作が変わらない             | CI (Node 18/20) green                                               | SRC-0001, SRC-0008 | must     |

## Categories

- `performance`: Response time, throughput, latency.
- `reliability`: Availability, fault tolerance, recovery.
- `security`: Authentication, authorization, data protection.
- `scalability`: Load handling, horizontal/vertical scaling.
- `usability`: Accessibility, UX standards, i18n.
- `maintainability`: Code quality, documentation, testability.
- `operability`: Monitoring, deployment, logging.

## Rules

- Each NFR must have a measurable target.
- Each NFR must reference at least one Source (SRC-ID).
