# 02 User Stories

## US Catalog

- US-0038-0001: spec引数省略時のprototyping自動spec検出
- US-0038-0002: spec引数省略時のimplement自動spec検出
- US-0038-0003: specと実装のトレーサビリティ検証
- US-0038-0004: 差分サマリの可読性

## US-0038-0001: spec引数省略時のprototyping自動spec検出

- Parent: CAP-0038
- Goal: `/qfai-prototyping` をspec引数なしで実行した際に、4ソース統合差分検出により変更specを自動特定し、prototypingを開始できるようにする
- Non-goals: /qfai-atddのインクリメンタル対応、完全セマンティック解析
- Notes: 変更specゼロ時はフルスキャンフォールバック

## US-0038-0002: spec引数省略時のimplement自動spec検出

- Parent: CAP-0038
- Goal: `/qfai-implement` をspec引数なしで実行した際に、4ソース統合差分検出により変更specを検出・提示し、ユーザー選択で作業を開始できるようにする
- Non-goals: 複数specの自動全件実行（1spec単位の設計維持）
- Notes: 単一spec検出時は自動選択（確認付き）、複数時は優先度順リスト

## US-0038-0003: specと実装のトレーサビリティ検証

- Parent: CAP-0038
- Goal: specのBR/ACが変更された際に、対応する実装コードにも変更があるかをqfai validateで自動検証し、不整合をerror/warningとして報告する
- Non-goals: 完全セマンティック解析、自動修正
- Notes: Traceability Ledger（16_Traceability-ledger.md）のマッピングを基にファイルレベルdiffチェック

## US-0038-0004: 差分サマリの可読性

- Parent: CAP-0038
- Goal: 差分検出結果をspec-id、変更種別、変更ソース、分類結果を含むテーブル形式で提示し、一目で把握できるようにする
- Non-goals: GUIダッシュボード
- Notes: Evidence Diff Contextセクションにlast_commit_sha, last_run_timestamp, changed_specs, execution_modeを記録
