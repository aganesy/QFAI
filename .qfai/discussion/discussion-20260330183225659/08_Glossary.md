# 08 Glossary

## Term Definitions

| Term                         | Definition                                                                                                                            | Context                   | Source   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | -------- |
| Spec Auto-Discovery Protocol | spec引数省略時に4ソース統合差分検出を起動し、対象specを自動特定するプロトコル                                                         | SKILL.md / TypeScript実装 | SRC-0001 |
| 4ソース統合差分検出          | git diff (Source A) + ローカル変更 (Source B) + timestamp比較 (Source C) + delta.mdパース (Source D) を統合して変更specを特定する手法 | 差分検出ロジック          | SRC-0001 |
| Source A                     | `git diff --name-only origin/main..HEAD` によるブランチレベルの差分検出                                                               | 差分検出                  | SRC-0001 |
| Source B                     | `git diff --name-only` および `git diff --name-only --staged` によるローカル変更検出                                                  | 差分検出                  | SRC-0001 |
| Source C                     | evidenceの `last_run_timestamp` とspecファイルの mtime 比較によるstale検出                                                            | 差分検出                  | SRC-0001 |
| Source D                     | `09_delta.md` の変更サマリからのコンテキスト情報抽出                                                                                  | 差分検出                  | SRC-0001 |
| Traceability Integrity       | specのBR/AC変更と対応する実装コードの変更が整合している状態                                                                           | バリデーション            | SRC-0007 |
| Traceability Drift           | specのBR/ACが変更されたのに対応する実装コードに変更がない状態（トレーサビリティ断絶）                                                 | バリデーション            | SRC-0007 |
| Diff Context                 | evidenceファイルに記録される差分検出の実行コンテキスト（last_commit_sha, last_run_timestamp, changed_specs, execution_mode）          | evidence記録              | SRC-0001 |
| Implementation State         | 各specの実装状態分類: implemented（実装済み）, missing（未実装）, stale（古い実装）, unchanged（変更なし）                            | 差分検出                  | SRC-0001 |
| フルスキャンフォールバック   | 差分検出で変更specがゼロ、またはgit/evidence不在時に全specを対象とする動作                                                            | SKILL.md                  | SRC-0001 |

## Abbreviations

| Abbreviation | Full Form               | Notes              |
| ------------ | ----------------------- | ------------------ |
| BR           | Business Rule           | specの業務ルール   |
| AC           | Acceptance Criteria     | specの受け入れ基準 |
| TDD          | Test-Driven Development | テスト駆動開発     |
| DR           | Decision Record         | 意思決定記録       |

## Rules

- Terms must be used consistently across all discussion artifacts.
- Ambiguous or context-dependent terms should include usage context.
