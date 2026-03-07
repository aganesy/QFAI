# 05 Examples

## Purpose

- Concretize BR into executable examples.
- Every EX must reference one BR via `BR-Ref`.

## Example Table (required)

| EX-ID   | BR-Ref  | Input                                                                                            | Expected                                                                                                                       | Notes                              |
| ------- | ------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| EX-0003-0001 | BR-0003-0001 | validate.json が存在する状態で `qfai report --format md` を実行                                  | Markdown レポートが stdout に出力され、終了コード 0                                                                             | Happy path                         |
| EX-0003-0002 | BR-0003-0001 | validate.json が不在、--run-validate なしで `qfai report --format md` を実行                     | エラーメッセージ（code, message, suggested_action 付き）が表示され、終了コード 1                                                 | Negative path                      |
| EX-0003-0003 | BR-0003-0002 | validate.json に issues: 3件（error 1, warning 2）で `qfai report --format md` を実行            | サマリーに Errors: 1, Warnings: 2 が表示、イシュー一覧に3件表示、トレーサビリティマトリックス表示                                 | サマリー・一覧・マトリックスの3構造 |
| EX-0003-0004 | BR-0003-0002 | validate.json に issues: 0件で `qfai report --format md` を実行                                  | サマリーに "No issues found" が表示される                                                                                       | イシューゼロの境界ケース            |
| EX-0003-0005 | BR-0003-0003 | validate.json が存在する状態で `qfai report --format json` を実行                                | `{"summary": {...}, "issues": [...], "traceability": {...}}` 形式の有効な JSON が出力                                           | JSON 出力構造の検証                 |
| EX-0003-0006 | BR-0003-0003 | validate.json が不在、--run-validate なしで `qfai report --format json` を実行                   | エラーメッセージが表示され、終了コード 1                                                                                        | JSON 出力のエラーケース             |
| EX-0003-0007 | BR-0003-0004 | `qfai report --format md --base-url https://github.com/org/repo/blob/main` を実行               | ファイルパス `.qfai/specs/sample/01_Spec.md` が `[.qfai/specs/sample/01_Spec.md](https://github.com/org/repo/blob/main/.qfai/specs/sample/01_Spec.md)` に変換 | Markdown リンク形式                 |
| EX-0003-0008 | BR-0003-0004 | `qfai report --format json --base-url https://github.com/org/repo/blob/main/` を実行（末尾スラッシュあり） | ファイルオブジェクトに `"url": "https://github.com/org/repo/blob/main/.qfai/specs/sample/01_Spec.md"` が追加（スラッシュ重複なし） | 末尾スラッシュ正規化                |
| EX-0003-0009 | BR-0003-0005 | validate.json 不在で `qfai report --format md --run-validate` を実行                             | 内部バリデーション実行後、結果に基づく Markdown レポートが出力、終了コード 0                                                     | --run-validate の動作確認           |
| EX-0003-0010 | BR-0003-0005 | 不完全なスペック構造で `qfai report --format md --run-validate` を実行                            | 内部バリデーションで検出されたイシューがレポートに含まれる、終了コード 0                                                         | バリデーションエラー含有レポート     |
| EX-0003-0011 | BR-0003-0007 | `qfai report --help` を実行                                                                      | 使用方法、--format, --base-url, --run-validate 等のオプション説明が表示                                                         | CLI ヘルプ                          |
| EX-0003-0012 | BR-0003-0008 | 同一 validate.json で `qfai report --format md` を2回実行                                        | 2回の出力が完全一致                                                                                                             | 冪等性                              |
| EX-0003-0013 | BR-0003-0009 | validate.json 存在時に `qfai report --format md` を実行                                          | 終了コード 0                                                                                                                    | 正常終了コード                      |
| EX-0003-0014 | BR-0003-0009 | validate.json 不在、--run-validate なしで `qfai report --format md` を実行                       | 終了コード 1                                                                                                                    | エラー終了コード                    |
| EX-0003-0015 | BR-0003-0006 | validate.json が不在、--run-validate なしで `qfai report --format md` を実行                     | エラーメッセージに code, message, suggested_action の3フィールドが含まれる                                                       | エラーメッセージ品質の検証          |
