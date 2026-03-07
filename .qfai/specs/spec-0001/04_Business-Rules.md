# 04 Business Rules

## Purpose

- Decompose AC into explicit business rules.
- Every BR must reference one or more AC IDs.

## Rule Table (required)

| BR_ID   | Title                              | AC_Refs       | Rule                                                                                                   | Notes                                | NFR_Refs |
| ------- | ---------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------ | -------- |
| BR-0001-0001 | ディレクトリ構造生成               | AC-0001-0001       | init は .qfai/ 配下に assistant/, specs/, contracts/, discussion/, evidence/, review/, report/ を作成する | REQ-0001 準拠                        |          |
| BR-0001-0002 | 設定ファイル生成                   | AC-0001-0001       | init は qfai.config.yaml をプロジェクトルートに生成する                                                 | REQ-0001 準拠                        |          |
| BR-0001-0003 | 既存設定ファイルスキップ           | AC-0001-0004       | qfai.config.yaml がすでに存在する場合はスキップする                                                     | REQ-0002 準拠                        | NFR-0012 |
| BR-0001-0004 | 既存ディレクトリスキップ           | AC-0001-0004       | .qfai/ 配下の既存ディレクトリ・ファイルは上書きしない（--force 未指定時）                                | REQ-0002 準拠                        | NFR-0012 |
| BR-0001-0005 | 欠落ファイル追加                   | AC-0001-0005       | 初期化済み環境で欠落ファイルがある場合、欠落分のみ新規作成する                                          | REQ-0002 準拠                        | NFR-0012 |
| BR-0001-0006 | --force スキル上書き               | AC-0001-0006       | --force 指定時は skills/ 配下のファイルを最新版で上書きする                                              | REQ-0003 準拠                        |          |
| BR-0001-0007 | skills.local/ 保護                 | AC-0001-0006,AC-0001-0007 | --force 指定時でも skills.local/ 配下のファイルは一切変更しない                                        | REQ-0003 準拠                        |          |
| BR-0001-0008 | --dry-run 無操作                   | AC-0001-0008,AC-0001-0009 | --dry-run 指定時は実ファイル操作を行わない                                                             | REQ-0004 準拠                        |          |
| BR-0001-0009 | --dry-run 出力フォーマット         | AC-0001-0008,AC-0001-0009 | --dry-run は [CREATE], [SKIP], [OVERWRITE] プレフィックス付きで変更予定を表示する                      | REQ-0004 準拠                        |          |
| BR-0001-0010 | ラッパー生成対象                   | AC-0001-0010       | Claude Code (.claude/commands/), GitHub Copilot (.github/prompts/), Codex (.codex/skills/), Agents (.agents/skills/) のラッパーを生成する | REQ-0005 準拠 |          |
| BR-0001-0011 | ラッパーのスキル参照               | AC-0001-0011       | 各ラッパーファイルは .qfai/assistant/skills/ 配下のスキルファイルへの参照パスを含む                      | REQ-0005 準拠                        |          |
| BR-0001-0012 | レガシーファイル検出               | AC-0001-0012       | 非推奨ファイル（10_workflow.md 等）を検出し、.qfai/.legacy/ に退避する                                  | REQ-0006 準拠                        |          |
| BR-0001-0013 | レガシー非存在時スキップ           | AC-0001-0013       | 非推奨ファイルが存在しない場合はレガシー退避処理をスキップし、.qfai/.legacy/ を作成しない               | REQ-0006 準拠                        |          |
| BR-0001-0014 | エラーメッセージ品質               | AC-0001-0003       | エラー発生時は code, message, suggested_action を含むメッセージを表示する                               | REQ-0001 準拠                        | NFR-0040 |
| BR-0001-0015 | CLI ヘルプ                         | AC-0001-0014       | `qfai init --help` で使用方法とオプション一覧を表示する                                                 |                                      | NFR-0042 |
