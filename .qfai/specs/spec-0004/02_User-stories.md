# 02 User Stories

## US Catalog

- US-0004-0001: バリデーション実行 - validate で全バリデータ(33+)を順次実行し Issue[] を集約
- US-0004-0002: バリデーションフェーズ制御 - --phase full|atdd|tdd|refinement でスコープ制御
- US-0004-0003: 終了コード制御 - --fail-on error|warning|never で終了コード制御
- US-0004-0004: GitHub Actions 出力 - --format github でアノテーション形式出力（最大100件）
- US-0004-0005: バリデーション結果 JSON 出力 - validate.json に構造化結果出力
- US-0004-0006: ランログ生成 - .qfai/report/run-\*/ にタイムスタンプ付きログ保存
- US-0004-0007: ウェイバー適用 - waivers.yml で Issue の suppress/downgrade
- US-0004-0008: スペック必須ファイル検証 - レイヤードスペック必須ファイル存在チェック
- US-0004-0009: ID フォーマット検証 - ID 形式・重複チェック
- US-0004-0010: トレーサビリティ検証 - AC->TC, BR->EX, EX->TC 参照整合性
- US-0004-0011: ATDD アノテーション検証 - テストファイル内のアノテーション検証
- US-0004-0012: ディスカッションパック検証 - 15ファイル存在・内容・OQ ゲート
- US-0004-0013: コントラクト検証 - UI/API/DB コントラクト ID 整合性
- US-0004-0014: Mermaid 図検証 - mermaid フェンスブロック形式チェック
- US-0004-0015: Phase guard - CI で --phase refinement をブロック

## US-0004-0001: バリデーション実行

- Parent: CAP-0004
- Goal: `qfai validate` で全バリデータ（33+）を順次実行し、検出された Issue を集約して返す
- Non-goals: 個別バリデータの修正機能
- Notes: バリデータは独立して実行され、結果は Issue[] として統合される

## US-0004-0002: バリデーションフェーズ制御

- Parent: CAP-0004
- Goal: `--phase full|atdd|tdd|refinement` でバリデーション対象のスコープを制御する
- Non-goals: カスタムフェーズ定義
- Notes: デフォルトは full

## US-0004-0003: 終了コード制御

- Parent: CAP-0004
- Goal: `--fail-on error|warning|never` でバリデーション結果に基づく終了コードを制御する。config の validation.failOn がフォールバック
- Non-goals: カスタム終了コード

## US-0004-0004: GitHub Actions 出力

- Parent: CAP-0004
- Goal: `--format github` で ::error / ::warning アノテーション形式で出力する（重複排除後、最大100件）
- Non-goals: 他 CI ツール固有の出力形式

## US-0004-0005: バリデーション結果 JSON 出力

- Parent: CAP-0004
- Goal: `validate.json` に構造化されたバリデーション結果（issues, counts, traceability）を出力する
- Non-goals: カスタム出力スキーマ
- Notes: report コマンドの入力として使用可能

## US-0004-0006: ランログ生成

- Parent: CAP-0004
- Goal: `.qfai/report/run-*/` にタイムスタンプ付きの実行ログを保存する
- Non-goals: ログのローテーション

## US-0004-0007: ウェイバー適用

- Parent: CAP-0004
- Goal: waivers.yml に基づき、特定の Issue を suppress または downgrade する
- Non-goals: ウェイバーの自動生成
- Notes: suppressed=true フラグで内部保持

## US-0004-0008: スペック必須ファイル検証

- Parent: CAP-0004
- Goal: レイヤードスペック（01_Spec..09_delta）の必須ファイル存在チェック
- Non-goals: ファイル内容の意味的検証

## US-0004-0009: ID フォーマット検証

- Parent: CAP-0004
- Goal: CAP/US/AC/BR/EX/TC の形式チェック・重複チェック
- Non-goals: ID の自動採番

## US-0004-0010: トレーサビリティ検証

- Parent: CAP-0004
- Goal: AC->TC, BR->EX, EX->TC, Spec->CAP の参照整合性チェック
- Non-goals: 参照の自動修復

## US-0004-0011: ATDD アノテーション検証

- Parent: CAP-0004
- Goal: テストファイル内の QFAI アノテーション（US/TC/CON-API）の存在・形式を検証する
- Non-goals: アノテーションの自動挿入

## US-0004-0012: ディスカッションパック検証

- Parent: CAP-0004
- Goal: ディスカッションパックの 15ファイル存在、内容充足、blocking OQ 検出を行う
- Non-goals: ディスカッション内容の品質評価

## US-0004-0013: コントラクト検証

- Parent: CAP-0004
- Goal: UI/API/DB コントラクトの ID 形式・重複・参照整合性チェック
- Non-goals: コントラクトの自動生成

## US-0004-0014: Mermaid 図検証

- Parent: CAP-0004
- Goal: spec/discussion 内の mermaid フェンスブロックの存在・形式チェック
- Non-goals: Mermaid 図のレンダリング検証

## US-0004-0015: Phase guard

- Parent: CAP-0004
- Goal: CI 環境で `--phase refinement` が指定された場合、バリデーションをブロックし refinement issue を生成する
- Non-goals: 他フェーズのブロック
