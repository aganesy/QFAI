# 02 User Stories

## US Catalog

- US-0026-0001: UI-bearing プロジェクトで uiux/ サイドカーを生成できる
- US-0026-0002: SKILL.md が UI/UX オーサリングをガイドする
- US-0026-0003: ダイレクトテンプレートが行動・状態・インタラクションに焦点を当てる
- US-0026-0004: コアテンプレートが UX intent クロスリファレンスを含む
- US-0026-0005: strategy アーティファクトが5フィールドを全て含む (v1.7.6 remediation)

## US-0026-0001: UI-bearing プロジェクトで uiux/ サイドカーを生成できる

- Parent: CAP-0026
- Source: discussion-20260328120000000, REQ-0026-0001, REQ-0026-0005, REQ-0026-0006, REQ-0026-0007, REQ-0026-0009, REQ-0026-0010, REQ-0026-0011
- Goal: QFAI ユーザーとして、UI-bearing プロジェクトで qfai-discussion を実行した際に、構造化された uiux/ サイドカーアーティファクト（11ファイル）が生成されるようにしたい。下流のバリデータとレビュアーがスコアリング可能な入力を受け取れるようにするため。
- Non-goals: バリデータによるサイドカーの自動検証（v1.7.4）、ブラウザベースのレンダリング証跡
- Notes: 11 files: 00_index, 10_strategy, 20-23_eval axes, 30_comparison, 31_anchor, 40_contracts, 50_review_bundle, 60_critique_loop

### Example Seeds

| Perspective         | Example                                                                            | Status |
| ------------------- | ---------------------------------------------------------------------------------- | ------ |
| Happy path          | UI-bearing プロジェクトが検出 → uiux/ 作成、11ファイル全てがスキーマに適合         | seed   |
| Negative path       | 非 UI プロジェクト (CLI ツール) → uiux/ ディレクトリなし、エラーなし               | seed   |
| Edge / boundary     | 曖昧な UI シグナル (config-only web endpoint) → 検出ヒューリスティックが正しく分類 | seed   |
| Permission / role   | 読み取り専用ファイルシステム → サイドカー生成が IO エラーで失敗、部分書き込みなし  | seed   |
| State transition    | 同一プロジェクトでコンテキスト編集後に再実行 → サイドカーファイルが再生成          | seed   |
| Idempotency / retry | 同一入力で qfai-discussion を2回実行 → 同一 uiux/ 出力                             | seed   |

## US-0026-0002: SKILL.md が UI/UX オーサリングをガイドする

- Parent: CAP-0026
- Source: discussion-20260328120000000, REQ-0026-0002, REQ-0026-0005, REQ-0026-0012
- Goal: QFAI ユーザーとして、SKILL.md が UI-bearing 検出条件からサイドカー生成完了までの UI/UX オーサリングフローをガイドするようにしたい。generic fallback に陥らないようにするため。
- Non-goals: SKILL.md の自動検証、レビュアープロンプトの実装
- Notes: SKILL.md は surface classification → strategy selection → scoring axes → anchor screen → contracts → completion の順でフローを案内

### Example Seeds

| Perspective         | Example                                                                                                     | Status                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Happy path          | UI-bearing プロジェクト → SKILL.md フローが strategy selection, scoring, anchor, contracts まで到達して完了 | seed                                |
| Negative path       | 非 UI プロジェクト → SKILL.md フローが UI/UX ステップをスキップ、標準条件のみで完了                         | seed                                |
| Edge / boundary     | 最初は非 UI、ユーザーが途中で UI コンテキスト追加 → SKILL.md が変更を検出、UI フローをアクティブ化          | seed                                |
| Permission / role   | N/A — SKILL.md はアシスタントが消費するテンプレート、ロール区別なし                                         | seed (skipped: no role distinction) |
| State transition    | detection → strategy → scoring → anchor → contracts → completion の順で正しく進行                           | seed                                |
| Idempotency / retry | 同一プロジェクトコンテキストで SKILL.md を再読み込み → 同一検出結果、同一フロー                             | seed                                |

## US-0026-0003: ダイレクトテンプレートが行動・状態・インタラクションに焦点を当てる

- Parent: CAP-0026
- Source: discussion-20260328120000000, REQ-0026-0003, REQ-0026-0012
- Goal: QFAI ユーザーとして、ダイレクトテンプレート (03, 04, 14) が generic visual mock ではなく behavior/state/interaction に焦点を当てるようにしたい。ディスカッション出力が下流の spec にとって actionable になるようにするため。
- Non-goals: テンプレートの自動バリデーション、既存テンプレートの後方互換フォールバック
- Notes: 03 は HTML mock から behavior obligations にシフト、04 は translation-aware registry を追加、14 は sidecar artifact review scope を追加

### Example Seeds

| Perspective         | Example                                                                                                | Status                              |
| ------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| Happy path          | UI-bearing プロジェクト → 03 テンプレートが HTML mock の代わりに behavior obligations セクションを生成 | seed                                |
| Negative path       | 非 UI プロジェクト → 03 テンプレートが HTML mock と behavior obligations の両方を省略                  | seed                                |
| Edge / boundary     | 04_Sources に competitive reference がゼロ → registry テーブルは存在するが空、スキーマ違反なし         | seed                                |
| Permission / role   | N/A — テンプレートは内部スキルアーティファクト                                                         | seed (skipped: no role distinction) |
| State transition    | 14_Review-Request がサイドカー生成前に作成 → review scope がサイドカーを pending と表記                | seed                                |
| Idempotency / retry | 同一ディスカッションコンテキストからテンプレート再生成 → 同一出力                                      | seed                                |

## US-0026-0004: コアテンプレートが UX intent クロスリファレンスを含む

- Parent: CAP-0026
- Source: discussion-20260328120000000, REQ-0026-0004, REQ-0026-0008
- Goal: QFAI ユーザーとして、コアテンプレート (01, 02, 05-12, 99) がプロダクトレベルの UX intent クロスリファレンスを含むようにしたい。具体的な UI を固定せずにデザイン意図をトレース可能にするため。
- Non-goals: クロスリファレンスの自動解決、具体的な UI コンポーネントの指定
- Notes: cross-refs は uiux/ sidecar がある場合にリンク、ない場合は graceful degrade (空/非表示)

### Example Seeds

| Perspective         | Example                                                                                                       | Status                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Happy path          | UI-bearing プロジェクト → コアテンプレートに `<!-- UX-INTENT: see uiux/10_strategy.md -->` クロスリファレンス | seed                                |
| Negative path       | 非 UI プロジェクト → UX intent プレースホルダーが空/非表示、リンク切れなし                                    | seed                                |
| Edge / boundary     | 部分的サイドカー (11ファイル中6ファイルのみ) → 既存ファイルにクロスリファレンス、不足ファイルは noted         | seed                                |
| Permission / role   | N/A — コアテンプレートは内部スキルアーティファクト                                                            | seed (skipped: no role distinction) |
| State transition    | サイドカーがコアテンプレート後に生成 → コアテンプレート再生成でクロスリファレンスを取得                       | seed                                |
| Idempotency / retry | 同一サイドカーでコアテンプレートを2回生成 → 同一クロスリファレンス                                            | seed                                |

## US-0026-0005: strategy アーティファクトが5フィールドを全て含む

- Parent: CAP-0026
- Source: v1.7.6 remediation, REQ-0026-0005
- Goal: QFAI ユーザーとして、discussion pack を作成する際に、strategy アーティファクト (uiux/10_strategy.md) が selection_required、candidate_options、chosen_option、verification_expectations、none-as-legitimate-outcome の5フィールドを全て含むようにしたい。これにより qfai validate が完全な意思決定トレースを検証できるようにするため。
- Non-goals: 5フィールド以外のフィールドの追加強制、フィールド値の内容バリデーション
- Notes: none-as-legitimate-outcome は正当な選択肢として扱われる。chosen_option が none-as-legitimate-outcome の場合も rationale が必要。

### Example Seeds

| Perspective         | Example                                                                                                     | Status |
| ------------------- | ----------------------------------------------------------------------------------------------------------- | ------ |
| Happy path          | discussion pack が5フィールド全て populated で生成; `qfai validate` が通過する                              | seed   |
| Negative path       | selection_required が true だが chosen_option が空; validation が actionable エラーを出力する               | seed   |
| Edge / boundary     | none-as-legitimate-outcome が chosen option; アーティファクトが rationale を記録し、validation が受け入れる | seed   |
| Permission / role   | contributor が strategy アーティファクトを生成; reviewer がソースにアクセスせずに全5フィールドを監査できる  | seed   |
| State transition    | strategy アーティファクトが draft から finalized に遷移; finalization 後は全5フィールドが immutable になる  | seed   |
| Idempotency / retry | 同一入力で strategy アーティファクトを再生成; 全5フィールドの値が同一になる                                 | seed   |
