# Prompts (手動利用)

このディレクトリのプロンプトは **手動で使う資産**です。現時点では自動読取は行いません（将来のバージョンで CLI 連携を検討します）。

## 目的

- Spec から overview / Business Flow を生成するための素材
- トレーサビリティ/契約/変更区分の運用支援（CIで止めない領域）
- 将来（v0.9）の adapter/emit 実装に備えた配布物

## プロンプト一覧

- `makeOverview.md`: Spec 一覧（overview）生成
- `makeBusinessFlow.md`: 業務フロー（BF）整理
- `require-to-spec.md`: 既存要件から Spec Pack を起こす
- `qfai-generate-test-globs.md`: テストファイル glob の生成支援（`qfai.config.yaml` 更新）
- `qfai-maintain-traceability.md`: 参照切れの修復（Spec/Scenario/Test）
- `qfai-maintain-contracts.md`: 契約 ID と参照の整合
- `qfai-classify-change.md`: Compatibility / Change 分類支援

## 使い分け表

| Prompt                          | 目的             | 必須入力                                      | 出力の期待形式                 | よくある失敗        |
| ------------------------------- | ---------------- | --------------------------------------------- | ------------------------------ | ------------------- |
| `qfai-maintain-traceability.md` | 参照切れの修復   | spec/delta/scenario + validate/report + tests | 修正方針 + diff + 再実行手順   | ID形式崩し/SSOT無視 |
| `qfai-maintain-contracts.md`    | 契約と参照の整合 | contracts + spec + report                     | 採番案 + 参照更新案 + diff     | ID変更の無断実施    |
| `qfai-classify-change.md`       | 変更区分の判断   | delta.md + 変更差分                           | 分類 + 根拠 + 影響範囲         | 根拠なし分類        |
| `qfai-generate-test-globs.md`   | テストglob生成   | package.json/設定/テスト配置                  | glob案 + 更新案 + サンプル確認 | glob過剰/不足       |
| `makeOverview.md`               | Spec一覧生成     | spec.md                                       | 一覧テーブル/サマリ            | spec未読            |
| `makeBusinessFlow.md`           | 業務フロー整理   | spec.md/要件                                  | フロー手順/根拠                | 要件の飛ばし        |
| `require-to-spec.md`            | 要件からSpec作成 | require資料                                   | Spec Pack草案                  | ID採番の逸脱        |

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
