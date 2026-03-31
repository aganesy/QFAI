# 02 User Stories

<!-- Language policy: Section headers are English (aligned with _policies convention);
     body text is Japanese. This is the standard bilingual style for QFAI specs. -->

## US Catalog

- US-0011-0001: Spec 変更の自動検出 - 3ソース統合でスペック変更を自動検出しDiff Summaryを提示
- US-0011-0002: 実装状態の分析 - 各specをimplemented/missing/stale/unchangedに分類
- US-0011-0003: インクリメンタルなスケルトン更新 - changed_specsのみスケルトン/テスト更新
- US-0011-0004: Evidenceへの基点情報記録 - Diff Contextセクションで次回差分検出の基点を記録

## US-0011-0001: Spec 変更の自動検出

- Parent: CAP-0011
- Goal: /qfai-prototyping または /qfai-atdd の実行前に、3ソース統合（git diff, timestamp 比較, delta.md パース）で変更された spec を自動検出し、Diff Summary を提示する
- Non-goals: delta.md パーサー自体の改修、新しい差分検出ソースの追加
- Notes: REQ-0001, REQ-0002, REQ-0003, REQ-0004, REQ-0005 準拠。changed_specs = union(Source A, Source B), change_context = Source C

## US-0011-0002: 実装状態の分析

- Parent: CAP-0011
- Goal: 各 spec に対してテストファイル・スケルトンコードのアノテーションスキャンを行い、implemented / missing / stale / unchanged の4状態に分類する
- Non-goals: コードの意味的な品質評価、テストカバレッジの数値算出
- Notes: REQ-0006 準拠。stale 判定は Primary=Behavior/Initial の場合のみ（DR-0010）

## US-0011-0003: インクリメンタルなスケルトン更新

- Parent: CAP-0011
- Goal: /qfai-prototyping は changed_specs のみスケルトン更新・unchanged は Runtime Gate のみ実行し、/qfai-atdd は missing のテスト新規生成・stale のテスト更新・unchanged のスキップを行う
- Non-goals: /qfai-verify のインクリメンタル対応（DR-0007 により常にフルスキャン）
- Notes: REQ-0007, REQ-0008, REQ-0013 準拠。--full フラグまたは evidence 不在時はフルモードにフォールバック（REQ-0010, REQ-0011）

## US-0011-0004: Evidence への基点情報記録

- Parent: CAP-0011
- Goal: スキル実行後の evidence ファイルに Diff Context セクション（last_commit_sha, last_run_timestamp, changed_specs, execution_mode）を記録し、次回差分検出の基点とする
- Non-goals: evidence ファイルの自動クリーンアップ、evidence フォーマットの大幅変更
- Notes: REQ-0009 準拠。既存 evidence に Diff Context がない場合でも後方互換で動作（NFR-0004）
