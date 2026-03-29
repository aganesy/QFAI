# 05 Examples

## Purpose

- Concretize BR into executable examples.
- Every EX must reference one BR via `BR-Ref`.

## Example Table (required)

| EX-ID        | BR-Ref       | Input                                                             | Expected                                                                                             | Notes                             |
| ------------ | ------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------- |
| EX-0026-0001 | BR-0026-0001 | プロジェクトコンテキストに surface: web-ui の指定あり             | UI-bearing と分類、サイドカー生成トリガー                                                            | Surface classification happy path |
| EX-0026-0002 | BR-0026-0001 | プロジェクトコンテキストに surface: non-ui の指定あり             | 非 UI-bearing と分類、サイドカー生成スキップ                                                         | Surface classification non-UI     |
| EX-0026-0003 | BR-0026-0001 | プロジェクトに web endpoint あるが UI コンポーネントなし          | non-ui に分類（surface type ベース判定）                                                             | Edge: ambiguous signal            |
| EX-0026-0004 | BR-0026-0002 | UI-bearing プロジェクトで qfai-discussion 完了                    | uiux/ に11ファイル全て存在                                                                           | 11-file completeness              |
| EX-0026-0005 | BR-0026-0002 | UI-bearing プロジェクトだがディスク容量不足                       | IO エラーで生成失敗、部分ファイル書き込みなし                                                        | Partial write prevention          |
| EX-0026-0006 | BR-0026-0003 | 生成された uiux/10_strategy.md                                    | YAML 形式、version フィールド含む、スキーマ v0.1 準拠                                                | Schema conformance                |
| EX-0026-0007 | BR-0026-0004 | 非 UI プロジェクトで qfai-discussion 完了                         | uiux/ ディレクトリなし、エラーなし、15ファイルコアパックのみ                                         | Non-UI skip                       |
| EX-0026-0008 | BR-0026-0005 | 更新された SKILL.md テンプレート                                  | UI-bearing 検出セクションに5カテゴリが明記                                                           | SKILL.md detection section        |
| EX-0026-0009 | BR-0026-0006 | UI-bearing プロジェクトで SKILL.md フロー完了                     | strategy, scoring axes, anchor, contracts の4条件全て充足確認                                        | UI completion conditions          |
| EX-0026-0010 | BR-0026-0006 | UI-bearing プロジェクトで strategy 未選択のまま完了しようとする   | 完了条件未充足でブロック                                                                             | Incomplete completion blocked     |
| EX-0026-0011 | BR-0026-0007 | 非 UI プロジェクトで SKILL.md フロー完了                          | v1.7.2 以前と同一の完了条件で完了                                                                    | Non-UI completion unchanged       |
| EX-0026-0012 | BR-0026-0008 | UI-bearing プロジェクトで 03_Story-Workshop 生成                  | behavior obligations セクション (state coverage, interaction contracts, error handling) がプライマリ | 03 behavior focus                 |
| EX-0026-0013 | BR-0026-0009 | 04_Sources に competitive reference 2件                           | registry テーブルに各エントリの adopted_points, rejected_points, local_translation あり              | 04 translation-aware registry     |
| EX-0026-0014 | BR-0026-0009 | 04_Sources に competitive reference 0件                           | registry テーブル存在するが行なし、スキーマ違反なし                                                  | 04 empty registry                 |
| EX-0026-0015 | BR-0026-0010 | UI-bearing プロジェクトで 14_Review-Request 生成                  | sidecar artifact review scope セクションあり                                                         | 14 sidecar review scope           |
| EX-0026-0016 | BR-0026-0011 | UI-bearing プロジェクトでコアテンプレート生成                     | `<!-- UX-INTENT: see uiux/10_strategy.md -->` 形式のクロスリファレンスあり                           | Cross-ref present                 |
| EX-0026-0017 | BR-0026-0012 | 非 UI プロジェクトでコアテンプレート生成                          | UX intent プレースホルダーが空/非表示、リンク切れなし                                                | Cross-ref graceful degrade        |
| EX-0026-0018 | BR-0026-0012 | 部分サイドカー (6/11 ファイルのみ) でコアテンプレート生成         | 既存ファイルにクロスリファレンス、不足ファイルは noted                                               | Partial sidecar cross-ref         |
| EX-0026-0019 | BR-0026-0013 | qfai init を fresh プロジェクトで実行                             | SKILL.md, 11サイドカーテンプレート, 3置換テンプレート, 拡張バッチテンプレート全て配布                | Init asset complete               |
| EX-0026-0020 | BR-0026-0013 | v1.7.3 変更後に verify-pack 実行                                  | 全アセットパス、エラーなし                                                                           | verify-pack pass                  |
| EX-0026-0021 | BR-0026-0014 | uiux/20_eval_axis_usability.md 生成                               | usability 軸に evaluation criteria と measurement approach あり                                      | Eval axis content                 |
| EX-0026-0022 | BR-0026-0015 | uiux/30_comparison.md 生成                                        | 2つ以上のオプションがスコアリング軸で比較                                                            | Option comparison                 |
| EX-0026-0023 | BR-0026-0016 | uiux/40_contracts.md 生成                                         | anchor screen のインタラクションコントラクトが構造化ドラフトで記述                                   | Screen contracts                  |
| EX-0026-0024 | BR-0026-0017 | uiux/10_strategy.md 生成                                          | アーティファクトタイプにつき1つの完全な例、冗長な例なし                                              | Minimal-but-complete (DR-0056)    |
| EX-0026-0025 | BR-0026-0018 | UI-bearing プロジェクトで 03_Story-Workshop 生成                  | HTML/CSS mock セクションはフォールバックオプションとして存在、プライマリではない                     | Mock fallback demotion            |
| EX-0026-0026 | BR-0026-0004 | 同一入力で qfai-discussion を2回実行                              | 両回とも同一出力（サイドカーなし）                                                                   | Idempotency non-UI                |
| EX-0026-0027 | BR-0026-0002 | 同一 UI-bearing 入力で qfai-discussion を2回実行                  | 両回とも同一 uiux/ 出力                                                                              | Idempotency UI-bearing            |
| EX-0026-0028 | BR-0026-0018 | UI-bearing プロジェクトで 03_Story-Workshop の DDS セクション確認 | State Coverage に4状態（empty/loading/error/populated）の箇条書きが存在（DDP-024 準拠）              | DDS State Coverage regression     |
| EX-0026-0029 | BR-0026-0019 | UI-bearing discussion pack 生成後の uiux/10_strategy.md 検査      | 5フィールド (selection_required, candidate_options, chosen_option, verification_expectations, none-as-legitimate-outcome) 全て存在 | Strategy 5-field completeness     |
| EX-0026-0030 | BR-0026-0020 | selection_required=true、chosen_option 空 の strategy artifact    | qfai validate が actionable エラーを出力、対象フィールドを明示                                       | Validation error on empty choice  |
| EX-0026-0031 | BR-0026-0021 | chosen_option=none-as-legitimate-outcome かつ rationale 記録済み  | qfai validate 通過、エラーなし                                                                        | none as legitimate outcome valid  |
| EX-0026-0032 | BR-0026-0022 | contributor が strategy artifact を生成; reviewer が監査する      | 5フィールド全て読み取り可能; ソースコードアクセス不要                                                 | Reviewer audit without source     |
| EX-0026-0033 | BR-0026-0022 | strategy artifact が draft → finalized に遷移                     | finalization 後は全5フィールドが変更不可、新規 draft サイクルが必要                                   | Immutability post-finalization    |
| EX-0026-0034 | BR-0026-0019 | 同一入力で strategy artifact を2回生成                            | 両回とも全5フィールドの値が同一                                                                        | Idempotency of 5-field generation |
