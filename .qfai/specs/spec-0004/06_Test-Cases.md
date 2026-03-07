# 06 Test Cases

## Purpose

- Verify examples and acceptance criteria with explicit refs.
- Include both `AC-Refs` and `EX-Ref` whenever possible.

## Test Case Table (required)

| TC-ID   | Level | AC-Refs         | EX-Ref  | Steps                                                                                                    | Expected                                                                                     | Notes                          |
| ------- | ----- | --------------- | ------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------ |
| TC-0004-0001 | L2    | AC-0004-0001         | EX-0004-0001 | 1. 有効な qfai.config.yaml を配置 2. `qfai doctor` を実行                                               | 設定ファイルチェック ok。終了コード 0                                                         | Happy path: 設定ファイル        |
| TC-0004-0002 | L2    | AC-0004-0002         | EX-0004-0002 | 1. qfai.config.yaml を削除 2. `qfai doctor` を実行                                                      | エラーメッセージ（code, message, suggested_action 付き）表示。終了コード 1                     | 設定ファイル不在エラー          |
| TC-0004-0003 | L2    | AC-0004-0003         | EX-0004-0003 | 1. specsDir 欠落の qfai.config.yaml を配置 2. `qfai doctor` を実行                                      | 不正箇所（フィールド名、期待値、実際値）を含むエラーメッセージ。終了コード 1                   | 設定ファイル不正: フィールド欠落 |
| TC-0004-0004 | L2    | AC-0004-0003         | EX-0004-0004 | 1. specsDir に数値型の qfai.config.yaml を配置 2. `qfai doctor` を実行                                   | 型エラーメッセージ（期待: string, 実際: number）表示                                          | 設定ファイル不正: 型エラー      |
| TC-0004-0005 | L2    | AC-0004-0004         | EX-0004-0005 | 1. .qfai/ 配下に必要ディレクトリをすべて作成 2. `qfai doctor` を実行                                     | ディレクトリ構造チェック ok                                                                    | Happy path: ディレクトリ構造    |
| TC-0004-0006 | L2    | AC-0004-0005         | EX-0004-0006 | 1. .qfai/specs/ を削除 2. `qfai doctor` を実行                                                           | 欠落警告（suggested_action: "mkdir -p .qfai/specs"）表示                                      | ディレクトリ欠落警告            |
| TC-0004-0007 | L2    | AC-0004-0006         | EX-0004-0007 | 1. specsDir が実在ディレクトリを参照する設定を配置 2. `qfai doctor` を実行                                | パス解決チェック ok                                                                            | Happy path: パス解決            |
| TC-0004-0008 | L2    | AC-0004-0007         | EX-0004-0008 | 1. testsDir に存在しないディレクトリを設定 2. `qfai doctor` を実行                                       | 解決失敗の警告メッセージ表示                                                                   | パス解決失敗                    |
| TC-0004-0009 | L2    | AC-0004-0008         | EX-0004-0009 | 1. specsDir: "../../outside" を設定 2. `qfai doctor` を実行                                              | パストラバーサルエラー。終了コード 1                                                           | パストラバーサル検出            |
| TC-0004-0010 | L2    | AC-0004-0009         | EX-0004-0010 | 1. spec-pack 形式ファイルを配置 2. `qfai doctor` を実行                                                  | 情報レベル警告: レガシー spec-pack 検出                                                        | レガシー: spec-pack             |
| TC-0004-0011 | L2    | AC-0004-0010         | EX-0004-0011 | 1. 非推奨の promptsDir を作成 2. `qfai doctor` を実行                                                    | 情報レベル警告: 非推奨ディレクトリ検出                                                         | レガシー: 非推奨ディレクトリ    |
| TC-0004-0012 | L2    | AC-0004-0009         | EX-0004-0012 | 1. レガシーレイアウトを配置 2. `qfai doctor` を実行 3. suggested_action を確認                            | suggested_action にマイグレーションガイドへの参照を含む                                         | マイグレーション案内            |
| TC-0004-0013 | L2    | AC-0004-0011         | EX-0004-0013 | 1. 正常な設定・構造を用意 2. `qfai doctor --format json` を実行 3. 出力を JSON パース                    | 有効な JSON。checks 配列に各チェック項目の結果を含む                                            | JSON 出力: 正常系               |
| TC-0004-0014 | L2    | AC-0004-0012         | EX-0004-0014 | 1. 設定エラーを含む環境を用意 2. `qfai doctor --format json` を実行                                      | JSON 出力に status: "error" のチェック項目が含まれる                                            | JSON 出力: エラー含有           |
| TC-0004-0015 | L2    | AC-0004-0013         | EX-0004-0015 | 1. 警告ありの環境を用意 2. `qfai doctor --fail-on warning` を実行 3. 終了コード確認                      | 終了コード 1                                                                                   | --fail-on warning               |
| TC-0004-0016 | L2    | AC-0004-0013         | EX-0004-0016 | 1. 警告のみの環境を用意 2. `qfai doctor --fail-on error` を実行 3. 終了コード確認                        | 終了コード 0                                                                                   | --fail-on error デフォルト      |
| TC-0004-0017 | L2    | AC-0004-0014         | EX-0004-0017 | 1. `qfai doctor --help` を実行                                                                            | 使用方法・オプション説明が表示される                                                            | CLI ヘルプ表示                  |
| TC-0004-0018 | L2    | AC-0004-0015         | EX-0004-0018 | 1. 設定エラーを含む環境を用意 2. `qfai doctor` を実行 3. メッセージの言語を確認                           | メッセージが日本語で出力される                                                                  | 日本語メッセージ検証            |
| TC-0004-0019 | L2    | AC-0004-0001, AC-0004-0005, AC-0004-0010, AC-0004-0015 |         | 全 AC を網羅する統合テスト: doctor 実行 → 診断結果確認                                                    | 全 AC シナリオが正常に動作する                                                                  | 統合カバレッジ                  |
