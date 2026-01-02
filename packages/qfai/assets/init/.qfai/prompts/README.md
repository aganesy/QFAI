# Prompts (手動利用)

このディレクトリのプロンプトは **手動で使う資産**です。現時点では自動読取は行いません（将来のバージョンで CLI 連携を検討します）。

## 目的

- Spec から overview / Business Flow を生成するための素材
- 将来（v0.9）の adapter/emit 実装に備えた配布物

## プロンプト一覧

- `makeOverview.md`: Spec 一覧（overview）生成
- `makeBusinessFlow.md`: 業務フロー（BF）整理
- `require-to-spec.md`: 既存要件から Spec Pack を起こす
- `qfai-generate-test-globs.md`: テストファイル glob の生成支援（`qfai.config.yaml` 更新）

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
