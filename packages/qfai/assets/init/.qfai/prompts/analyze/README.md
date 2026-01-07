# analyze（手動利用）

このディレクトリは QFAI の `validate` が扱わない **意味矛盾（レベル1/2）** を、レビューのために洗い出すための **手動プロンプト集**です。

重要:

- analyze は **Hard Gate ではありません**（CI を落とさない想定）
- 出力は **候補**です。根拠（引用）を必ず確認し、最終判断はレビューで行ってください
- `validate` が扱う **構造矛盾（参照/フォーマット/トレーサビリティ）** は対象外です

## 推奨入力（最小セット）

- 対象 Spec Pack:
  - `.qfai/specs/<spec-id>/spec.md`
  - `.qfai/specs/<spec-id>/delta.md`
  - `.qfai/specs/<spec-id>/scenario.md`
- `validate` の結果:
  - `.qfai/out/report.md`（または `.qfai/out/validate.json` の要約）
- 変更差分:
  - PR diff（または変更ファイル一覧）

入力が不足すると見落としが増え、入力が多すぎると回答が拡散しやすくなります。まずは上記のセットに揃える運用を推奨します。

## 推奨出力フォーマット

各指摘を「レビューで決めるべき論点」として、次の項目を固定して出してください。

- 種別: `Contradiction` / `Ambiguity` / `Missing Case` / `Risk` / `Suggestion`
- 影響範囲: `Spec` / `Scenario` / `Contract` / `Test` / `Docs`
- 根拠: 入力の該当箇所を短く引用
- 判断理由: なぜ矛盾/曖昧に見えるか
- 推奨アクション: 次に何を直す/議論するか（CIを止める結論は出さない）

## プロンプト一覧

- `spec_scenario_consistency.md`: Spec ↔ Scenario の意味整合
- `spec_contract_consistency.md`: Spec ↔ Contract の意味整合
- `scenario_test_consistency.md`: Scenario ↔ Test（SC参照）の表現妥当性
