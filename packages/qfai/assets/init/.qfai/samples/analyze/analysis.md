# analyze 実施ログ（テンプレート）

> 目的: analyze は `validate` が扱わない「意味矛盾」の候補を抽出するための **レビュー補助**です。
> 結果は正解判定ではありません。根拠（引用）を確認し、レビューで判断してください。

## メタ

- 実施日: YYYY-MM-DD
- 対象: <PR番号 / ブランチ / 変更スコープ>
- 利用モデル/環境: <任意>

## 入力（貼り付けたもの）

- Spec: <spec.md / delta.md の該当範囲>
- Scenario: <scenario.md の該当範囲>
- Contract（任意）: <該当契約>
- validate/report 要約: <report.md または validate.json の要約>
- 差分: <PR diff / 変更ファイル一覧>

## 実行したプロンプト

- `.qfai/prompts/analyze/spec_scenario_consistency.md`
- `.qfai/prompts/analyze/spec_contract_consistency.md`
- `.qfai/prompts/analyze/scenario_test_consistency.md`

## 結果（候補）

- <貼り付け>

## レビュー判断

- 採用（修正する）: <項目>
- 却下（問題なし/誤検知）: <項目>
- 保留（追加調査/議論）: <項目>

## 次アクション

- <誰が/何を/いつまでに>
