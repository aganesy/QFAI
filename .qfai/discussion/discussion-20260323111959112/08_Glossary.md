# 08 Glossary

## Terms

| Term                   | Definition                                                                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Codex                  | OpenAI の CLI ベース AI コーディングエージェント。ターミナルから起動し、サブエージェント委譲・サンドボックス実行をサポートする。                |
| TOML                   | Tom's Obvious Minimal Language。Codex がエージェント定義に採用する設定ファイル形式。キーと値のペアで構造化データを記述する。                    |
| Sub-agent              | 親エージェント（オーケストレータ等）から委譲されて特定タスクを実行する子エージェント。Codex では `.codex/agents/*.toml` で定義する。            |
| Canonical agent        | `.qfai/assistant/agents/*.md` に定義された QFAI の正規エージェント仕様。全プラットフォーム（Claude Code / Copilot / Codex）の単一情報源となる。 |
| Symlink                | ファイルシステム上のシンボリックリンク。Claude Code / Copilot エージェントは symlink で canonical MD を参照するが、Codex TOML では使用不可。    |
| sandbox_mode           | Codex TOML のフィールド。サブエージェントのファイルシステム権限を制御する。`"read-only"` でレビュー系エージェントの書き込みを禁止する。         |
| developer_instructions | Codex TOML のフィールド。エージェントの振る舞い（ミッション・入力・成果物・停止条件・チェックリスト・出力形式）を自然言語で記述する文字列。     |
| config.toml            | `.codex/config.toml`。Codex プロジェクト全体の設定ファイル。`[agents]` セクションでサブエージェントの並列数や再帰深度を制御する。               |
| AGENTS.md              | リポジトリルートに配置するマークダウンファイル。Codex がプロジェクト理解に利用するエージェント／ワークフローの概要ドキュメント。                |
| QFAI                   | Quality-First AI。AI 支援開発の品質と一貫性を向上させるフレームワーク。仕様駆動開発・エージェント定義・品質ゲートを体系化する。                 |

## Rules

- 新しい用語が登場したら本表に追記する。
- 定義は 1〜2 文で簡潔に記述する。
