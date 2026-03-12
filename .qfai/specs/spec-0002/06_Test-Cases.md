# 06 Test Cases

## Purpose

- Verify examples and acceptance criteria with explicit refs.
- Include both `AC-Refs` and `EX-Ref` whenever possible.

## Test Case Table (required)

| TC-ID        | Level | AC-Refs                                                | EX-Ref       | Steps                                                                          | Expected                                              | Notes                |
| ------------ | ----- | ------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------- | -------------------- |
| TC-0002-0001 | L2    | AC-0002-0001                                           | EX-0002-0001 | 正常なスペック構造を用意し `qfai validate` を実行                              | 全バリデータが実行され Issue[] が返却される           | バリデータ集約       |
| TC-0002-0002 | L2    | AC-0002-0002                                           | EX-0002-0005 | 完備スペックで `qfai validate` を実行                                          | exit code 0                                           | 成功終了コード       |
| TC-0002-0003 | L2    | AC-0002-0003                                           | EX-0002-0004 | `qfai validate --phase atdd` を実行                                            | ATDD フェーズのバリデータのみ実行される               | フェーズ制御         |
| TC-0002-0004 | L2    | AC-0002-0004                                           | EX-0002-0003 | `qfai validate --phase full` を実行                                            | 全バリデータが実行される                              | デフォルトフェーズ   |
| TC-0002-0005 | L2    | AC-0002-0005                                           | EX-0002-0005 | warning のみの状態で `qfai validate --fail-on error` を実行                    | exit code 0                                           | error 基準           |
| TC-0002-0006 | L2    | AC-0002-0005                                           | EX-0002-0006 | error ありの状態で `qfai validate --fail-on error` を実行                      | exit code 1                                           | error 基準失敗       |
| TC-0002-0007 | L2    | AC-0002-0006                                           | EX-0002-0007 | warning ありの状態で `qfai validate --fail-on warning` を実行                  | exit code 1                                           | warning 基準         |
| TC-0002-0008 | L2    | AC-0002-0007                                           | EX-0002-0008 | error ありの状態で `qfai validate --fail-on never` を実行                      | exit code 0                                           | never 基準           |
| TC-0002-0009 | L2    | AC-0002-0008                                           | EX-0002-0009 | Issue 3件で `qfai validate --format github` を実行                             | ::error/::warning 形式の出力が3件                     | GitHub 形式          |
| TC-0002-0010 | L2    | AC-0002-0009                                           | EX-0002-0010 | Issue 120件で `qfai validate --format github` を実行                           | 100件出力 + truncated メッセージ                      | 上限切り詰め         |
| TC-0002-0011 | L2    | AC-0002-0010                                           | EX-0002-0011 | バリデーション実行後に validate.json を読み込み                                | issues, summary, metadata キーが存在する              | JSON スキーマ        |
| TC-0002-0012 | L2    | AC-0002-0011                                           | EX-0002-0012 | バリデーション実行後に .qfai/report/ を確認                                    | run-YYYYMMDDTHHMMSS/ ディレクトリが存在する           | ランログ             |
| TC-0002-0013 | L2    | AC-0002-0012                                           | EX-0002-0013 | waivers.yml に suppress ルールを設定し validate を実行                         | 該当 Issue が suppressed=true、デフォルト出力に非表示 | suppress             |
| TC-0002-0014 | L2    | AC-0002-0013                                           | EX-0002-0014 | waivers.yml に downgrade ルールを設定し validate を実行                        | 該当 Issue の severity が1段階低下                    | downgrade            |
| TC-0002-0015 | L2    | AC-0002-0014                                           | EX-0002-0015 | spec-0001/01_Spec.md を削除して validate を実行                                | E_SPEC_MISSING_FILESET エラーが出力される             | 必須ファイル欠落     |
| TC-0002-0016 | L2    | AC-0002-0015                                           | EX-0002-0016 | 全ファイル完備のスペックで validate を実行                                     | 必須ファイル検証でエラーなし                          | 必須ファイル完備     |
| TC-0002-0017 | L2    | AC-0002-0016                                           | EX-0002-0017 | 不正 ID 形式を含むスペックで validate を実行                                   | E_ID_FORMAT エラーが出力される                        | ID 形式不正          |
| TC-0002-0018 | L2    | AC-0002-0017                                           | EX-0002-0018 | AC-0002-0001 を2箇所で定義したスペックで validate を実行                       | E_ID_DUPLICATE エラーが出力される                     | ID 重複              |
| TC-0002-0019 | L2    | AC-0002-0018                                           | EX-0002-0019 | AC-0002-0003 に対応する TC がないスペックで validate を実行                    | W_TRACE_MISSING_EDGE 警告が出力される                 | トレーサビリティ欠落 |
| TC-0002-0020 | L2    | AC-0002-0019                                           | EX-0002-0020 | 全トレーサビリティ完備のスペックで validate を実行                             | トレーサビリティ検証でエラー・警告なし                | トレーサビリティ完備 |
| TC-0002-0021 | L2    | AC-0002-0020                                           | EX-0002-0021 | QFAI アノテーション付きテストファイルで validate --phase atdd を実行           | アノテーション検証成功                                | ATDD 成功            |
| TC-0002-0022 | L2    | AC-0002-0021                                           | EX-0002-0022 | testsDir が存在しない状態で validate を実行                                    | ATDD チェックがスキップされ関連 Issue なし            | ATDD スキップ        |
| TC-0002-0023 | L2    | AC-0002-0022                                           | EX-0002-0023 | ディスカッションパックのファイルを欠落させて validate を実行                   | E_DPACK_MISSING_FILE エラーが出力される               | パック欠落           |
| TC-0002-0024 | L2    | AC-0002-0023                                           | EX-0002-0024 | blocking OQ を含むディスカッションパックで validate を実行                     | E_DPACK_BLOCKING_OQ エラーが出力される                | blocking OQ          |
| TC-0002-0025 | L2    | AC-0002-0024                                           | EX-0002-0025 | 不正なコントラクト ID を含む状態で validate を実行                             | E_CONTRACT_ID_FORMAT エラーが出力される               | コントラクト ID      |
| TC-0002-0026 | L2    | AC-0002-0025                                           | EX-0002-0026 | 参照先不在のコントラクト参照を含む状態で validate を実行                       | W_CONTRACT_REF_MISSING 警告が出力される               | コントラクト参照     |
| TC-0002-0027 | L2    | AC-0002-0026                                           | EX-0002-0027 | 不正な mermaid ブロックを含むスペックで validate を実行                        | E_MERMAID_FORMAT エラーが出力される                   | Mermaid 形式         |
| TC-0002-0028 | L2    | AC-0002-0027                                           | EX-0002-0028 | \_policies/04_Business-Flow.md から mermaid ブロックを削除して validate を実行 | E_MERMAID_MISSING エラーが出力される                  | Mermaid 必須         |
| TC-0002-0029 | L2    | AC-0002-0028                                           | EX-0002-0029 | 同一入力で validate を2回連続実行し validate.json を比較                       | issues と summary が同一（タイムスタンプ除く）        | 冪等性               |
| TC-0002-0030 | L2    | AC-0002-0001                                           | EX-0002-0002 | スペックが存在しない空ディレクトリで `qfai validate` を実行                    | 0 件の Issue + 構造エラーが報告される                 | エラーケース         |
| TC-0002-0031 | L2    | AC-0002-0001                                           | EX-0002-0030 | 10,001 ファイルが存在するプロジェクトで validate を実行                        | ファイル探索が 10,000件で打ち切られ truncated=true    | 探索上限             |
| TC-0002-0032 | L2    | AC-0002-0001, AC-0002-0005, AC-0002-0010, AC-0002-0020 |              | 全 AC を網羅する統合テスト: validate 実行 → 結果確認                           | 全 AC シナリオが正常に動作する                        | 統合カバレッジ       |
