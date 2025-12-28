# Prompts (手動利用)

このディレクトリのプロンプトは **手動で使う資産**です。v0.2.6 では自動読取を行いません。

## 目的

- Spec から overview / Business Flow を生成するための素材
- 将来（v0.9）の adapter/emit 実装に備えた配布物

## 使い方（例）

1. 目的のプロンプトを開く（例: `makeOverview.md`）
2. そのまま AI エージェントに貼り付ける
3. 指示された出力先に生成結果を保存する

### エージェント別の手動導線（例）

- Copilot: `.github/copilot-instructions.md` に要旨を転記
- Claude: `CLAUDE.md` に要旨を転記
- Codex: `AGENTS.md` に要旨を転記

※ いずれも **自動生成はしません**。必要に応じて人手で同期してください。

## 出力先の例

- Overview: `docs/specs/overview.md`
- Business Flow: `docs/flows/bf-0001-<slug>.md`

## CI との関係

- プロンプト自体は CI の検査対象ではありません
- 生成物をレビューし、Spec/Scenario/Contracts と整合しているかを確認してください
