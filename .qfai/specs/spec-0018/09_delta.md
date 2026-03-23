# 09 Delta

## Adopted

| Date       | Decision / Artifact         | Summary                                                                                                                                    | Source                                   |
| ---------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| 2026-03-23 | DR-0027: TOML 形式採用      | Codex サブエージェントは `.codex/agents/*.toml` に TOML 形式で定義する                                                                     | OQ-0001 / discussion-20260323111959112   |
| 2026-03-23 | DR-0028: 39 エージェント    | Claude Code/GitHub Copilot と同じ 39 エージェントに限定                                                                                    | OQ-0001 / discussion-20260323111959112   |
| 2026-03-23 | DR-0029: 役割ベース sandbox | レビュー系 25 に `read-only`、実装系 14 は省略（親セッション継承）                                                                         | OQ-0004 / discussion-20260323111959112   |
| 2026-03-23 | DR-0030: 静的配置           | リポジトリ直接コミット。init.ts 自動生成は行わない                                                                                         | OQ-0002 / discussion-20260323111959112   |
| 2026-03-23 | spec-0018 作成              | US-0018-0001〜US-0018-0003, AC-0018-0001〜AC-0018-0009, BR-0018-0001〜BR-0018-0006, EX-0018-0001〜EX-0018-0008, TC-0018-0001〜TC-0018-0012 | DR-0027〜DR-0030 から SDD Phase 4 で導出 |

## Rejected

| Date       | Rejected Option                                  | Rejection Reason                                               | Guardrail                                                                                                                      |
| ---------- | ------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 2026-03-23 | Markdown symlink 方式（DR-0027 Rejected-A）      | Codex は TOML を要求するため技術的に不可能                     | DO NOT: Markdown symlink を Codex エージェント定義に使用しない。Temptation: Claude/Copilot と同じアプローチで統一したい        |
| 2026-03-23 | 全 44 エージェント実装（DR-0028 Rejected）       | 5 エージェントが Claude/Copilot に未リンクのため不一致が生じる | DO NOT: Claude/Copilot に存在しないエージェントを Codex に追加しない。Temptation: せっかくなので全 44 エージェントを追加したい |
| 2026-03-23 | 個別エージェントに model 設定（DR-0027 variant） | 柔軟性を低下させ、メンテナンス負荷が増加する                   | DO NOT: 個別エージェントに model フィールドを設定しない。Temptation: レビュー系には軽量モデルを指定したい                      |
| 2026-03-23 | init.ts 自動生成（DR-0030 Rejected）             | MD→TOML 変換ロジックの複雑度が高く、スコープ肥大を招く         | DO NOT: init.ts に Codex TOML 自動生成ロジックを追加しない。Temptation: init コマンドで全プラットフォーム対応したい            |
| 2026-03-23 | 全エージェント同一 sandbox_mode（DR-0029 Rej-A） | 全 read-only では実装系エージェントが機能しない                | DO NOT: 全エージェントに同じ sandbox_mode を適用しない。Temptation: 設定をシンプルに統一したい                                 |

## Impact Analysis

- **Files created (implementation):**
  - `.codex/agents/*.toml` — 39 ファイル（レビュー系 25 + 実装系 14）
  - `.codex/config.toml` — エージェント並列度・委譲深度設定
- **Files modified:** なし（静的配置のため既存コードへの変更なし）
- **No breaking changes:** 新規追加のみ、既存動作に影響なし
