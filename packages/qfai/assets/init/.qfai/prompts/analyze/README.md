# analyze（手動利用）

このディレクトリは QFAI の `validate` が扱わない **意味レベル** の矛盾/抜け/リスクを、レビューのために洗い出すための **手動プロンプト集**です。

重要:

- analyze は **Hard Gate ではありません**（CI を落とさない想定）
- 出力は **候補**です。根拠（引用）を必ず確認し、最終判断はレビューで行ってください
- `validate` が扱う **構造矛盾（参照/フォーマット/トレーサビリティ）** は対象外です

## 推奨入力（最小セット）

- Project Context / Spec / Scenario / Test / Contract のうち、今回関係する箇所を **抜粋**で用意する
- `validate` / `report` の結果（必要なら要約）
- 変更差分（PR diff / 変更ファイル一覧）

## プロンプト一覧（v0.9.x）

- `spec_to_scenario.md`: Spec ↔ Scenario の意味整合
- `spec_to_contract.md`: Spec ↔ Contract の参照整合（紐付け漏れ/根拠薄弱）
- `scenario_to_test.md`: Scenario ↔ Test の網羅性/ズレ
