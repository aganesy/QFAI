# 04 Business Rules

## Purpose

- Decompose AC into explicit business rules.
- Every BR must reference one or more AC IDs.

## Rule Table (required)

| BR-ID        | Title                          | AC-Refs                    | Rule                                                                                                                            | Notes                                      | NFR-Refs           |
| ------------ | ------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------ |
| BR-0038-0001 | Source A: git diff検出         | AC-0038-0001, AC-0038-0002 | `git diff --name-only origin/main..HEAD` で `.qfai/specs/` 配下の変更ファイルを検出し、変更spec-idを抽出する                    | ベースブランチはconfig設定可能             | NFR-0001           |
| BR-0038-0002 | Source B: ローカル変更検出     | AC-0038-0001, AC-0038-0002 | `git diff --name-only` + `git diff --name-only --staged` でローカル変更を検出する                                               | ステージ済み/未ステージ両方                | NFR-0001           |
| BR-0038-0003 | Source C: timestamp比較        | AC-0038-0001, AC-0038-0003 | evidenceの `last_run_timestamp` とspecファイルの mtime を比較し、stale specを検出する                                           | git不在時の主要ソース                      | NFR-0001, NFR-0003 |
| BR-0038-0004 | Source D: delta.md パース      | AC-0038-0001, AC-0038-0003 | `09_delta.md` の変更サマリからコンテキスト情報を取得する                                                                        | git不在時のバックアップ                    | NFR-0001           |
| BR-0038-0005 | 統合判定                       | AC-0038-0001, AC-0038-0002 | `changed_specs = Source A ∪ Source B ∪ Source C ∪ Source D` で統合し、各specを `implemented/missing/stale/unchanged` に分類する | union戦略                                  | NFR-0001           |
| BR-0038-0006 | フルスキャンフォールバック     | AC-0038-0004               | 全ソースで変更specがゼロ、またはevidence不在時は全specをスキャン対象とする                                                      | REQ-0013                                   | NFR-0003           |
| BR-0038-0007 | git不在フォールバック          | AC-0038-0003               | git CLI実行失敗時はSource A, Bをスキップし、Source C + Dのみで検出する                                                          | エラーメッセージ付き                       | NFR-0003           |
| BR-0038-0008 | prototyping統合                | AC-0038-0001               | spec引数省略時、検出された変更specのみprototyping実行する。変更specリストをユーザーに提示し承認後に開始                         | SKILL.md改修                               | NFR-0005           |
| BR-0038-0009 | implement統合                  | AC-0038-0002               | spec引数省略時、単一spec検出時は自動選択（確認付き）、複数spec検出時は優先度順リスト表示しユーザー選択                          | 1spec単位設計維持                          | NFR-0005           |
| BR-0038-0010 | トレーサビリティ整合性チェック | AC-0038-0005               | 変更specのBR/ACファイルと、Traceability Ledgerで紐づく実装ファイルの両方にdiffがあるか検証する                                  | ファイルレベル                             | NFR-0007           |
| BR-0038-0011 | Ledger不在スキップ             | AC-0038-0006               | 16_Traceability-ledger.md不在specはwarningを出してトレーサビリティチェックをスキップする                                        | errorで停止しない                          | NFR-0004           |
| BR-0038-0012 | --fullフラグ                   | AC-0038-0007               | `--full` フラグ指定時は差分検出をバイパスし全specスキャンを強制する                                                             | REQ-0011                                   | -                  |
| BR-0038-0013 | Evidence Diff Context          | AC-0038-0008               | evidenceに `last_commit_sha`, `last_run_timestamp`, `changed_specs`, `execution_mode` を記録する                                | 後方互換: セクション不在でもエラーにしない | NFR-0004           |
| BR-0038-0014 | Policy変更影響波及             | AC-0038-0009               | `_policies/` 配下の変更検出時は保守的に全specを対象とし、ユーザー確認を行う                                                     | REQ-0012                                   | NFR-0001           |
| BR-0038-0015 | ベースブランチ設定             | AC-0038-0010               | `origin/main` をデフォルトとし、`qfai.config.yaml` の `baseBranch` でカスタマイズ可能にする                                     | REQ-0014                                   | -                  |
