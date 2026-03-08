# 05 Examples

## Purpose

- Concretize BR into executable examples.
- Every EX must reference one BR via `BR-Ref`.

## Example Table (required)

| EX-ID        | BR-Ref       | Input                                                                 | Expected                                                                         | Notes                  |
| ------------ | ------------ | --------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------- |
| EX-0002-0001 | BR-0002-0001 | 正常なスペック構造で `qfai validate`                                  | 全バリデータが実行され Issue[] が返却される                                      | Happy path             |
| EX-0002-0002 | BR-0002-0001 | スペックが存在しない空ディレクトリで `qfai validate`                  | 0 件の Issue + 構造エラーが報告される                                            | エラーケース           |
| EX-0002-0003 | BR-0002-0002 | `qfai validate`（--phase 未指定）                                     | デフォルト full として全バリデータが実行される                                   | デフォルト動作         |
| EX-0002-0004 | BR-0002-0003 | `qfai validate --phase atdd`                                          | ATDD フェーズに属するバリデータのみ実行。他はスキップ                            | フェーズ制御           |
| EX-0002-0005 | BR-0002-0004 | warning のみ存在、`qfai validate --fail-on error`                     | exit 0                                                                           | error 未満は成功       |
| EX-0002-0006 | BR-0002-0004 | error 存在、`qfai validate --fail-on error`                           | exit 1                                                                           | error で失敗           |
| EX-0002-0007 | BR-0002-0005 | warning 存在、`qfai validate --fail-on warning`                       | exit 1                                                                           | warning で失敗         |
| EX-0002-0008 | BR-0002-0006 | error 存在、`qfai validate --fail-on never`                           | exit 0                                                                           | 常に成功               |
| EX-0002-0009 | BR-0002-0007 | Issue 3件、`qfai validate --format github`                            | ::error file=...,line=...::{msg} が3件出力される                                 | GitHub 形式            |
| EX-0002-0010 | BR-0002-0008 | Issue 120件、`qfai validate --format github`                          | 100件のアノテーション + "20 more issues truncated"                               | 上限切り詰め           |
| EX-0002-0011 | BR-0002-0009 | バリデーション完了後                                                  | validate.json に { issues: [...], summary: {...}, metadata: {...} } が出力される | JSON 出力              |
| EX-0002-0012 | BR-0002-0010 | 2026-03-07T18:00:00 にバリデーション実行                              | .qfai/report/run-20260307T180000/ ディレクトリが作成される                       | ランログ               |
| EX-0002-0013 | BR-0002-0011 | waivers.yml に `- code: QFAI-COV-201, action: suppress`               | QFAI-COV-201 の Issue が suppressed=true となり出力から除外される                | suppress               |
| EX-0002-0014 | BR-0002-0012 | waivers.yml に `- code: QFAI-COV-201, action: downgrade`              | QFAI-COV-201 の severity が warning → info に変更される                          | downgrade              |
| EX-0002-0015 | BR-0002-0013 | 任意スペックディレクトリに 01_Spec.md が欠落                          | E_SPEC_MISSING_FILESET エラー（file: 該当スペック/01_Spec.md）                   | 必須ファイル欠落       |
| EX-0002-0016 | BR-0002-0013 | 任意スペックディレクトリに 01~08 全ファイルが存在                     | 必須ファイル検証パス                                                             | 必須ファイル完備       |
| EX-0002-0017 | BR-0002-0014 | スペック内に不正 ID 形式を記述                                        | E_ID_FORMAT エラー（expected: US_XXXX 形式）                                     | ID 形式不正            |
| EX-0002-0018 | BR-0002-0015 | 同一ファイルに AC-0002-0001 が2回定義                                 | E_ID_DUPLICATE エラー（id: AC-0002-0001）                                        | ID 重複                |
| EX-0002-0019 | BR-0002-0016 | AC-0002-0003 に対応する TC が未定義                                   | W_TRACE_MISSING_EDGE 警告（AC-0002-0003 → TC 参照なし）                          | トレーサビリティ欠落   |
| EX-0002-0020 | BR-0002-0016 | 全 AC/BR/EX に対応する TC/EX/TC が存在                                | トレーサビリティ検証でエラー・警告なし                                           | トレーサビリティ完備   |
| EX-0002-0021 | BR-0002-0017 | テストファイルに QFAI アノテーション（`QFAI:SPEC-0001:US-0001-0001`） | アノテーション検証成功                                                           | ATDD 成功              |
| EX-0002-0022 | BR-0002-0018 | testsDir: "tests/" だが tests/ ディレクトリ不在                       | ATDD チェックスキップ（Issue なし）                                              | スキップケース         |
| EX-0002-0023 | BR-0002-0019 | ディスカッションパックの 03_Story-Workshop.md が欠落                  | E_DPACK_MISSING_FILE エラー                                                      | パック欠落             |
| EX-0002-0024 | BR-0002-0020 | 08_Open-questions.md に status=open の OQ-001 が存在                  | E_DPACK_BLOCKING_OQ エラー                                                       | blocking OQ            |
| EX-0002-0025 | BR-0002-0021 | API コントラクトに "API-001" と不正な ID                              | E_CONTRACT_ID_FORMAT エラー（expected: CON-API-XXXX）                            | コントラクト ID        |
| EX-0002-0026 | BR-0002-0022 | スペック内に CON-API-0099 参照があるが対応コントラクト不在            | W_CONTRACT_REF_MISSING 警告                                                      | 参照不在               |
| EX-0002-0027 | BR-0002-0023 | spec 内に ````mermaid` 以外の不正な mermaid ブロック                  | E_MERMAID_FORMAT エラー                                                          | Mermaid 形式不正       |
| EX-0002-0028 | BR-0002-0024 | \_policies/04_Business-Flow.md に mermaid ブロックなし                | E_MERMAID_MISSING エラー                                                         | Business-Flow 必須     |
| EX-0002-0029 | BR-0002-0025 | 同一入力で `qfai validate` を2回実行                                  | 2つの validate.json の issues/summary が同一（タイムスタンプ除く）               | 冪等性                 |
| EX-0002-0030 | BR-0002-0028 | 10,001 ファイルが存在するプロジェクトで validate                      | ファイル探索が 10,000件で打ち切られ truncated=true                               | 探索上限               |
| EX-0002-0031 | BR-0002-0026 | 中規模プロジェクト（spec 5個）で `qfai validate` を実行               | 10秒以内にバリデーション完了する                                                 | 実行時間制約           |
| EX-0002-0032 | BR-0002-0027 | 大規模プロジェクト（spec 50個、テストファイル 1000個）で validate     | 60秒以内にバリデーション完了する                                                 | 大規模プロジェクト対応 |
