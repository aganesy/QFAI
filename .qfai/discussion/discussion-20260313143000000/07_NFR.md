# 07_NFR

## Requirements Table

| NFR-ID   | Category        | Title                            | Target                                                  | Measurement                                                    | Source   | Priority |
| -------- | --------------- | -------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------- | -------- | -------- |
| NFR-0001 | reliability     | 差分検出の漏れ防止               | 変更された spec の検出漏れが 0 件                        | 手動変更後の差分検出テスト（union 結合で漏れなし確認）          | SRC-0001 | must     |
| NFR-0002 | maintainability | SKILL.md のみの改修              | TypeScript コード変更なし                                | git diff に packages/ 配下の変更がないこと                     | SRC-0001 | must     |
| NFR-0003 | reliability     | フォールバック動作               | git 不可時でも差分検出が動作する                         | git なし環境でのスキル実行テスト                               | SRC-0001 | must     |
| NFR-0004 | maintainability | 後方互換性                       | 既存 evidence ファイルとの互換維持                       | Diff Context セクションがない evidence でもフルモード動作       | SRC-0010 | must     |
| NFR-0005 | usability       | Diff Summary の可読性            | ユーザーが変更 spec と実行モードを一目で把握可能          | Diff Summary テーブルの出力確認                                 | SRC-0001 | should   |

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
