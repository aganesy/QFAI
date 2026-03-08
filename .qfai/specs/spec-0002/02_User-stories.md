# 02 User Stories

## US Catalog

- US-0002-0001: バリデーション実行 - validate で全バリデータ(33+)を順次実行しIssue[]を集約
- US-0002-0002: バリデーションフェーズ制御 - --phase full|atdd|tdd|refinement でスコープ制御
- US-0002-0003: 終了コード制御 - --fail-on error|warning|never で終了コード制御
- US-0002-0004: GitHub Actions 出力 - --format github でアノテーション形式出力（最大100件）
- US-0002-0005: バリデーション結果 JSON 出力 - validate.json に構造化結果出力
- US-0002-0006: ランログ生成 - .qfai/report/run-\*/ にタイムスタンプ付きログ保存
- US-0002-0007: ウェイバー適用 - waivers.yml で issue の suppress/downgrade
- US-0002-0008: スペック必須ファイル検証 - レイヤードスペック必須ファイル存在チェック
- US-0002-0009: ID フォーマット検証 - CAP/US/AC/BR/EX/TC の形式・重複チェック
- US-0002-0010: トレーサビリティ検証 - AC→TC, BR→EX, EX→TC 参照整合性
- US-0002-0011: ATDD アノテーション検証 - テストファイル内のQFAIアノテーション検証
- US-0002-0012: ディスカッションパック検証 - 15ファイル存在・内容・OQゲート
- US-0002-0013: コントラクト検証 - UI/API/DB コントラクト ID 整合性
- US-0002-0014: Mermaid 図検証 - mermaid フェンスブロック形式チェック

## US-0002-0001: バリデーション実行

- Parent: CAP-0002
- Goal: `qfai validate` で全バリデータ（33+）を順次実行し、検出された Issue を集約して返す
- Non-goals: 個別バリデータの修正機能
- Notes: REQ-0010 準拠。バリデータは独立して実行され、結果は Issue[] として統合される

## US-0002-0002: バリデーションフェーズ制御

- Parent: CAP-0002
- Goal: `--phase full|atdd|tdd|refinement` でバリデーション対象のスコープを制御する
- Non-goals: カスタムフェーズ定義
- Notes: REQ-0011 準拠。デフォルトは full

## US-0002-0003: 終了コード制御

- Parent: CAP-0002
- Goal: `--fail-on error|warning|never` でバリデーション結果に基づく終了コードを制御する
- Non-goals: カスタム終了コード
- Notes: REQ-0012, NFR-0061 準拠。error: エラーがあれば exit 1、warning: 警告以上で exit 1、never: 常に exit 0

## US-0002-0004: GitHub Actions 出力

- Parent: CAP-0002
- Goal: `--format github` で GitHub Actions ワークフローアノテーション形式（::error, ::warning）で出力する（最大100件）
- Non-goals: 他 CI ツール固有の出力形式
- Notes: REQ-0013 準拠。100件超の場合は切り詰めて "N more issues truncated" メッセージを表示

## US-0002-0005: バリデーション結果 JSON 出力

- Parent: CAP-0002
- Goal: `validate.json` に構造化されたバリデーション結果（issues, summary, metadata）を出力する
- Non-goals: カスタム出力スキーマ
- Notes: REQ-0014 準拠。report コマンドの入力として使用可能

## US-0002-0006: ランログ生成

- Parent: CAP-0002
- Goal: `.qfai/report/run-*/` にタイムスタンプ付きの実行ログを保存する
- Non-goals: ログのローテーション・削除
- Notes: REQ-0015 準拠。ディレクトリ名は run-YYYYMMDDTHHMMSS 形式

## US-0002-0007: ウェイバー適用

- Parent: CAP-0002
- Goal: waivers.yml に基づき、特定の Issue を suppress（非表示）または downgrade（severity 低下）する
- Non-goals: ウェイバーの自動生成
- Notes: REQ-0110, NFR-0011 準拠。ウェイバー適用後も issue 自体は内部的に保持される（suppressed=true フラグ）

## US-0002-0008: スペック必須ファイル検証

- Parent: CAP-0002
- Goal: レイヤードスペック（01_Spec ~ 09_delta）および \_policies（01_Objective ~ 10_delta）の必須ファイル存在チェックを行う
- Non-goals: ファイル内容の意味的検証
- Notes: REQ-0100 準拠。欠落ファイルは E_SPEC_MISSING_FILESET エラーとして報告

## US-0002-0009: ID フォーマット検証

- Parent: CAP-0002
- Goal: CAP_XXXX, US_XXXX, AC_XXXX, BR_XXXX, EX_XXXX, TC_XXXX の形式チェック・重複チェックを行う
- Non-goals: ID の自動採番
- Notes: REQ-0101 準拠。不正形式は E_ID_FORMAT、重複は E_ID_DUPLICATE として報告

## US-0002-0010: トレーサビリティ検証

- Parent: CAP-0002
- Goal: AC→TC, BR→EX, EX→TC, Spec→CAP の参照整合性チェックを行う
- Non-goals: 参照の自動修復
- Notes: REQ-0102 準拠。参照欠落は W_TRACE_MISSING_EDGE 警告として報告

## US-0002-0011: ATDD アノテーション検証

- Parent: CAP-0002
- Goal: テストファイル内の QFAI:SPEC_XXXX:US_YYYY / TC_YYYY / CON_API_XXXX アノテーションの存在・形式を検証する
- Non-goals: アノテーションの自動挿入
- Notes: REQ-0103 準拠。testsDir が存在しない場合は ATDD チェックをスキップ

## US-0002-0012: ディスカッションパック検証

- Parent: CAP-0002
- Goal: ディスカッションパックの 15ファイル存在、内容充足（最低文字数）、blocking OQ 検出、Mermaid 図存在チェックを行う
- Non-goals: ディスカッション内容の品質評価
- Notes: REQ-0104 準拠。blocking OQ が存在する場合は E_DPACK_BLOCKING_OQ エラー

## US-0002-0013: コントラクト検証

- Parent: CAP-0002
- Goal: UI/API/DB コントラクトの ID 形式・重複・参照整合性チェックを行う
- Non-goals: コントラクトの自動生成
- Notes: REQ-0105 準拠。DB コントラクトで DROP/TRUNCATE を検出した場合は NFR-0021 に基づき警告

## US-0002-0014: Mermaid 図検証

- Parent: CAP-0002
- Goal: discussion および spec 内の mermaid フェンスブロックの存在・形式チェックを行う
- Non-goals: Mermaid 図のレンダリング検証
- Notes: REQ-0108, REQ-0112 準拠。\_policies/04_Business-Flow.md に mermaid ブロック必須
