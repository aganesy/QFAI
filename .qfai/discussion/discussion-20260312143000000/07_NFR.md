# 07_NFR

## Requirements Table

| NFR-ID   | Category        | Title                        | Target                                              | Measurement                                               | Source             | Priority |
| -------- | --------------- | ---------------------------- | --------------------------------------------------- | --------------------------------------------------------- | ------------------ | -------- |
| NFR-0001 | maintainability | ラッパー同期コスト排除       | ラッパー更新作業 0                                  | skill 更新時にラッパー更新が不要                          | SRC-0001           | must     |
| NFR-0002 | reliability     | クロスプラットフォーム互換性 | macOS, Linux, Windows (Developer Mode) で動作       | 各 OS での `qfai init` テスト合格                         | SRC-0007, SRC-0008 | must     |
| NFR-0003 | reliability     | Git symlink 追跡の正確性     | `git ls-files -s` で mode `120000` として追跡       | symlink が通常ファイルでなく symlink として commit される | SRC-0007           | must     |
| NFR-0004 | usability       | エラーメッセージの明確性     | Windows fallback 時にユーザーが対処法を理解可能     | エラーメッセージに Developer Mode 有効化手順を含む        | SRC-0008           | should   |
| NFR-0005 | maintainability | 後方互換性                   | 旧ラッパー形式のプロジェクトが `--force` で移行可能 | migration テスト合格                                      | SRC-0002           | must     |
| NFR-0006 | operability     | init 実行時間                | symlink 生成は既存 writeFile と同等以下の速度       | init ベンチマーク                                         | SRC-0002           | could    |

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
