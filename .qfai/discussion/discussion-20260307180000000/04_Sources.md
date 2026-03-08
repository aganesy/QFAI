# 04 Sources

## Source Registry

| SRC-ID   | Title                       | Type      | URL/Path                                     | Retrieved  | Notes                                                   |
| -------- | --------------------------- | --------- | -------------------------------------------- | ---------- | ------------------------------------------------------- |
| SRC-0001 | QFAI ソースコード           | primary   | `packages/qfai/src/`                         | 2026-03-07 | TypeScript 91ファイル、約9,500行                        |
| SRC-0002 | package.json (qfai)         | primary   | `packages/qfai/package.json`                 | 2026-03-07 | v1.5.3, 依存関係定義                                    |
| SRC-0003 | qfai.config.yaml            | primary   | `qfai.config.yaml`                           | 2026-03-07 | デフォルト設定                                          |
| SRC-0004 | CHANGELOG.md                | primary   | `CHANGELOG.md`                               | 2026-03-07 | v0.2.1 から v1.5.3 までの全履歴                         |
| SRC-0005 | README.md                   | primary   | `README.md`                                  | 2026-03-07 | プロダクト概要・使用方法                                |
| SRC-0006 | tmp ディレクトリ            | secondary | `tmp/`                                       | 2026-03-07 | 開発経緯（テストスニペット、PR監視ログ等）              |
| SRC-0007 | テンプレートアセット        | primary   | `packages/qfai/assets/init/`                 | 2026-03-07 | init コマンドで展開される成果物テンプレート             |
| SRC-0008 | バリデータ群                | primary   | `packages/qfai/src/core/validators/`         | 2026-03-07 | 33+ バリデータ関数                                      |
| SRC-0009 | コアモジュール群            | primary   | `packages/qfai/src/core/`                    | 2026-03-07 | config, discovery, specLayout, traceability 等          |
| SRC-0010 | CLI コマンドハンドラ        | primary   | `packages/qfai/src/cli/commands/`            | 2026-03-07 | init, validate, report, doctor, guardrails, prototyping |
| SRC-0011 | ドキュメント                | secondary | `docs/`                                      | 2026-03-07 | マイグレーションガイド、ルール説明、スキーマ            |
| SRC-0012 | エージェント定義            | primary   | `.qfai/assistant/agents/`                    | 2026-03-07 | 39個のエージェントロール定義                            |
| SRC-0013 | スキル定義                  | primary   | `.qfai/assistant/skills/`                    | 2026-03-07 | 9個のカノニカルスキル                                   |
| SRC-0014 | ステアリング（ガバナンス）  | primary   | `.qfai/assistant/steering/`                  | 2026-03-07 | レビューロスター、レビューゲートルール                  |
| SRC-0015 | インストラクション          | primary   | `.qfai/assistant/instructions/`              | 2026-03-07 | constitution, workflow, thinking, drift等               |
| SRC-0016 | スクリプト                  | secondary | `scripts/`                                   | 2026-03-07 | ビルド検証スクリプト                                    |
| SRC-0017 | pack ディレクトリ（配布物） | secondary | `tmp/pack/`                                  | 2026-03-07 | npm パッケージ展開構造                                  |
| SRC-0018 | PR 監視ログ                 | secondary | `tmp/monitor_pr45*.log`                      | 2026-03-07 | GitHub PR レビュースレッド監視                          |
| SRC-0019 | テストスニペット            | secondary | `tmp/assets_snip.txt`, `tmp/doctor_snip.txt` | 2026-03-07 | バリデーション・診断テストの断片                        |
| SRC-0020 | GitHub 自動化スクリプト     | secondary | `tmp/check-pr-unresolved.ps1`                | 2026-03-07 | GraphQL でPRスレッド解決状態監視                        |

## Source Types

- **primary**: ソースコード・設定ファイルなど、直接の仕様根拠
- **secondary**: 開発経緯・テストログなど、補足情報

## Traceability Rules

- REQ/NFR の Source 列は SRC-ID で参照する
- 複数ソースを参照する場合はカンマ区切り（例: SRC-0001, SRC-0008）
