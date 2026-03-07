# 05 Examples

## Purpose

- Concretize BR into executable examples.
- Every EX must reference one BR via `BR-Ref`.

## Example Table (required)

| EX-ID   | BR-Ref  | Input                                                                                        | Expected                                                                                                  | Notes                        |
| ------- | ------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------- |
| EX-0004-0001 | BR-0004-0001 | 有効な qfai.config.yaml が存在する状態で `qfai doctor` を実行                                | 設定ファイルチェック: ok と表示。終了コード 0                                                              | Happy path: 設定ファイル存在  |
| EX-0004-0002 | BR-0004-0001 | qfai.config.yaml が存在しない状態で `qfai doctor` を実行                                     | エラー: "qfai.config.yaml が見つかりません" (code, message, suggested_action 付き)。終了コード 1           | Negative: 設定ファイル不在    |
| EX-0004-0003 | BR-0004-0002 | specsDir フィールドが欠落した qfai.config.yaml で `qfai doctor` を実行                       | エラー: "specsDir: 必須フィールドが未定義です (期待: string, 実際: undefined)"。終了コード 1               | 不正内容: 必須フィールド欠落  |
| EX-0004-0004 | BR-0004-0002 | specsDir に数値型が設定された qfai.config.yaml で `qfai doctor` を実行                       | エラー: "specsDir: 型が不正です (期待: string, 実際: number)"                                              | 不正内容: 型エラー            |
| EX-0004-0005 | BR-0004-0003 | .qfai/ 配下に specs/, contracts/, discussion/, evidence/, assistant/ がすべて存在する状態     | ディレクトリ構造チェック: ok と表示                                                                         | Happy path: ディレクトリ完備  |
| EX-0004-0006 | BR-0004-0004 | .qfai/ 配下に specs/ が欠落している状態で `qfai doctor` を実行                               | 警告: "specs/ ディレクトリが存在しません" (suggested_action: "mkdir -p .qfai/specs")                       | 欠落ディレクトリの警告        |
| EX-0004-0007 | BR-0004-0005 | specsDir: ".qfai/specs" が実在するディレクトリを参照する状態で `qfai doctor` を実行           | パス解決チェック: specsDir ok と表示                                                                        | Happy path: パス解決成功      |
| EX-0004-0008 | BR-0004-0005 | testsDir: "tests/unit" が存在しないディレクトリを参照する状態で `qfai doctor` を実行          | 警告: "testsDir: 'tests/unit' が存在しません"                                                              | パス解決失敗                  |
| EX-0004-0009 | BR-0004-0006 | specsDir: "../../outside" が設定された qfai.config.yaml で `qfai doctor` を実行              | エラー: "specsDir: パストラバーサルが検出されました (root 外を参照)"。終了コード 1                          | パストラバーサル検出          |
| EX-0004-0010 | BR-0004-0007 | レガシー単一ファイル形式のスペックが存在する状態で `qfai doctor` を実行                       | 情報: "レガシーの spec_pack 形式が検出されました"                                                          | レガシー検出: spec_pack       |
| EX-0004-0011 | BR-0004-0007 | 非推奨の promptsDir ディレクトリが存在する状態で `qfai doctor` を実行                        | 情報: "非推奨の promptsDir が存在します"                                                                   | レガシー検出: 非推奨ディレクトリ |
| EX-0004-0012 | BR-0004-0008 | レガシーレイアウト検出時の suggested_action                                                    | suggested_action: "v1.5 マイグレーションガイドを参照してください: docs/migration-v1.5.3.md"                 | マイグレーション案内          |
| EX-0004-0013 | BR-0004-0009 | 正常な設定・構造で `qfai doctor --format json` を実行                                        | `{"checks": [{"name": "config", "status": "ok", "message": "..."}, ...]}` 形式の有効な JSON               | JSON 出力: 正常系             |
| EX-0004-0014 | BR-0004-0009 | 設定エラーがある状態で `qfai doctor --format json` を実行                                    | JSON 出力に `"status": "error"` のチェック項目が含まれる                                                   | JSON 出力: エラー含有         |
| EX-0004-0015 | BR-0004-0010 | 警告ありの状態で `qfai doctor --fail-on warning` を実行                                      | 終了コード 1                                                                                               | --fail-on warning             |
| EX-0004-0016 | BR-0004-0010 | 警告ありの状態で `qfai doctor --fail-on error` を実行                                        | 終了コード 0（warning は error ではないため）                                                               | --fail-on error デフォルト    |
| EX-0004-0017 | BR-0004-0011 | `qfai doctor --help` を実行                                                                   | 使用方法、--format, --fail-on 等のオプション説明が表示                                                      | CLI ヘルプ                    |
| EX-0004-0018 | BR-0004-0012 | 設定エラーがある状態で `qfai doctor` を実行                                                   | メッセージが日本語で出力される（例: "設定ファイルが見つかりません"）                                        | 日本語メッセージ              |
| EX-0004-0019 | BR-0004-0013 | qfai.config.yaml が不在の状態で `qfai doctor` を実行                                         | エラーメッセージに code, message, suggested_action の3フィールドが含まれる                                  | エラーメッセージ品質の検証    |
