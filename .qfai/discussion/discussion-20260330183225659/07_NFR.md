# 07 NFR (Non-Functional Requirements)

## Requirements Table

| NFR-ID   | Category        | Title | Target | Measurement | Source | Priority |
| -------- | --------------- | ----- | ------ | ----------- | ------ | -------- |
| NFR-0001 | reliability     | 差分検出の漏れ防止 | 変更specの検出漏れゼロ | 4ソース統合による変更検出テスト | SRC-0001, SRC-0006 | must |
| NFR-0002 | maintainability | SKILL.mdとTypeScriptの分離 | SKILL.mdはプロンプト定義、TypeScriptは検出ロジック | コード構造レビュー | SRC-0001 | must |
| NFR-0003 | reliability     | フォールバック動作 | evidence不在・git不可時はフルスキャンにフォールバック | git不在環境でのテスト実行 | SRC-0001 | must |
| NFR-0004 | maintainability | 後方互換性 | 既存evidenceファイルにDiff Contextセクションがなくても正常動作 | 既存evidence + 新validate実行テスト | SRC-0001 | must |
| NFR-0005 | usability       | Diff Summaryの可読性 | 変更spec一覧を人間が一目で把握できるテーブル形式 | ユーザーテスト / レビュー | SRC-0007 | should |
| NFR-0006 | performance     | 差分検出の実行時間 | 100spec規模で5秒以内 | ベンチマークテスト | SRC-0007 | should |
| NFR-0007 | reliability     | トレーサビリティ検証の精度 | ファイルレベルの差分チェックで偽陰性を最小化 | spec変更+実装未変更のテストケース | SRC-0007 | must |
| NFR-0008 | maintainability | 拡張性 | 将来のセマンティック解析への拡張を阻害しないモジュール設計 | コード構造レビュー | SRC-0007 | should |

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
