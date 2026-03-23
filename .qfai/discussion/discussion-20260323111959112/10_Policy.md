# 10 Policy

## Security Policies

| ID     | Title                                      | Policy                                                                                                       | Rationale                                                              |
| ------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| POL-S1 | sandbox_mode for review agents             | レビュー・分析系 25 エージェントには `sandbox_mode = "read-only"` を必須とする。                             | レビュー専用エージェントが誤ってファイルを変更・削除することを防止する |
| POL-S2 | No elevated permissions for implementation | 実装系 14 エージェントは `sandbox_mode` を省略し、親セッションの権限を継承する。明示的な権限昇格は行わない。 | 最小権限の原則に従い、必要以上の権限を付与しない                       |

## Development Policies

| ID     | Title                                     | Policy                                                                                                                                | Rationale                                                  |
| ------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| POL-D1 | TOML files committed to repository        | `.codex/agents/*.toml` および `.codex/config.toml` はリポジトリにコミットし、バージョン管理下に置く。                                 | 変更履歴の追跡とチームメンバー間での一貫性を確保する       |
| POL-D2 | Follow existing QFAI development workflow | TOML ファイルの追加・変更は既存の QFAI 開発ワークフロー（ブランチ → PR → レビュー → マージ）に従う。                                  | 品質ゲートを通過させ、レビューなしの変更を防止する         |
| POL-D3 | Canonical MD as single source of truth    | TOML の `developer_instructions` は canonical MD (`.qfai/assistant/agents/*.md`) を正とし、乖離が見つかった場合は TOML 側を修正する。 | 複数プラットフォーム間で一貫したエージェント仕様を維持する |

## Testing Policies

| ID     | Title                               | Policy                                                                               | Rationale                                                |
| ------ | ----------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| POL-T1 | TOML syntax validation before merge | PR マージ前に全 TOML ファイルの構文検証（パーサーによる parse チェック）を実施する。 | 構文エラーのあるファイルがリポジトリに入ることを防止する |
| POL-T2 | Agent count verification            | CI またはレビュー時に `.codex/agents/` 配下のファイル数が 39 であることを確認する。  | エージェントの追加漏れ・重複を検知する                   |

## Rules

- ポリシーは実施義務のある規則として扱う。
- 各ポリシーには適用理由（Rationale）を明記する。
