# 02 User Stories

## US Catalog

- US-0022-0001: フィデリティスコアカード評価 - レンダリング済み UI を 4 次元で評価し、美的品質とユーザビリティを同時に保証する
- US-0022-0002: スコアカード基準によるプロトタイプ改善 - 客観的な評価基準に基づいてプロトタイプを改善する
- US-0022-0003: 破壊的変更のデルタ/マイグレーション記録 - 破壊的変更が適切に記録されていることを確認する

## US-0022-0001: フィデリティスコアカード評価

- Parent: CAP-0022
- Source:  Design Fidelity Review
- Goal: QA エンジニアとして、レンダリング済み UI を階層（hierarchy）・明確性（clarity）・アクセシビリティ（accessibility）・レスポンシブ（responsiveness）の 4 次元で評価したい。美的品質とユーザビリティを同時にスコアカードで評価し、レビューゲートと統合するため。
- Non-goals: 自動 VRT スコアリングによる判定、RUM メトリクスとの連携
- Notes: REQ-0009 準拠。スコアカードは prose コメントと数値スコアの両方を含む

## US-0022-0002: スコアカード基準によるプロトタイプ改善

- Parent: CAP-0022
- Source:  Design Fidelity Review
- Goal: AI エージェント開発者として、スコアカードの評価基準に基づいてプロトタイプを改善したい。主観的な「良さそう」ではなく客観的な基準で判断するため。
- Non-goals: 評価基準の自動適用・自動修正
- Notes: NFR-0007（レビュー再現性）準拠。同一 artifact に同一 rubric を適用すれば同一結果が得られる

## US-0022-0003: 破壊的変更のデルタ/マイグレーション記録

- Parent: CAP-0022
- Source:  Design Fidelity Review
- Goal: プロジェクトリードとして、v1.6.5 の破壊的変更がデルタ/マイグレーションノートに記録されていることを確認したい。移行の影響を把握するため。
- Non-goals: 破壊的変更の自動検出
- Notes: REQ-0011 準拠。NFR-0008（破壊的変更衛生）により breaking item 100% が delta / migration note を持つ
