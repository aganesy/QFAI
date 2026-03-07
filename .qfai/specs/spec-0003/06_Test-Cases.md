# 06 Test Cases

## Purpose

- Verify examples and acceptance criteria with explicit refs.
- Include both `AC-Refs` and `EX-Ref` whenever possible.

## Test Case Table (required)

| TC-ID   | Level | AC-Refs | EX-Ref  | Steps                                                                                              | Expected                                                                                        | Notes                        |
| ------- | ----- | ------- | ------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------- |
| TC-0003-0001 | L2    | AC-0003-0001 | EX-0003-0001 | 1. validate.json をプロジェクトルートに配置 2. `qfai report --format md` を実行                    | Markdown レポートが stdout に出力される。エグゼクティブサマリー、イシュー一覧、マトリックスを含む。終了コード 0 | Happy path: Markdown 出力     |
| TC-0003-0002 | L2    | AC-0003-0002 | EX-0003-0004 | 1. issues: 0 の validate.json を配置 2. `qfai report --format md` を実行                          | サマリーに "No issues found" が表示される                                                        | イシューゼロの境界ケース      |
| TC-0003-0003 | L2    | AC-0003-0003 | EX-0003-0002 | 1. validate.json を削除 2. `qfai report --format md` を実行（--run-validate なし）                 | エラーメッセージ（code, message, suggested_action 付き）表示。終了コード 1                         | validate.json 不在エラー      |
| TC-0003-0004 | L2    | AC-0003-0004 | EX-0003-0005 | 1. validate.json を配置 2. `qfai report --format json` を実行                                     | 有効な JSON 出力。summary, issues, traceability キーを含む。終了コード 0                           | Happy path: JSON 出力         |
| TC-0003-0005 | L2    | AC-0003-0005 | EX-0003-0006 | 1. validate.json を削除 2. `qfai report --format json` を実行（--run-validate なし）               | エラーメッセージ表示。終了コード 1                                                                | JSON のエラーケース           |
| TC-0003-0006 | L2    | AC-0003-0006 | EX-0003-0007 | 1. validate.json を配置 2. `qfai report --format md --base-url https://github.com/org/repo/blob/main` を実行 | ファイルパスがリポジトリリンクに変換される                                                       | Markdown リンク生成           |
| TC-0003-0007 | L2    | AC-0003-0007 | EX-0003-0008 | 1. validate.json を配置 2. `qfai report --format json --base-url https://github.com/org/repo/blob/main/` を実行 | 各イシューに url フィールド追加。末尾スラッシュ重複なし                                           | JSON リンク生成 + 正規化      |
| TC-0003-0008 | L2    | AC-0003-0008 | EX-0003-0009 | 1. validate.json を削除 2. 有効なスペック構造を用意 3. `qfai report --format md --run-validate` を実行 | 内部バリデーション実行後、Markdown レポート出力。終了コード 0                                     | --run-validate 正常系         |
| TC-0003-0009 | L2    | AC-0003-0009 | EX-0003-0010 | 1. 不完全なスペック構造を用意 2. `qfai report --format md --run-validate` を実行                   | バリデーションイシューがレポートに含まれる。終了コード 0                                           | --run-validate エラー検出     |
| TC-0003-0010 | L2    | AC-0003-0010 | EX-0003-0011 | 1. `qfai report --help` を実行                                                                     | 使用方法・オプション説明が表示される                                                              | CLI ヘルプ表示                |
| TC-0003-0011 | L2    | AC-0003-0011 | EX-0003-0012 | 1. validate.json を配置 2. `qfai report --format md` を2回実行 3. 出力を diff で比較               | 2回の出力が完全一致                                                                               | 冪等性検証                    |
| TC-0003-0012 | L2    | AC-0003-0001 | EX-0003-0003 | 1. issues: 3件の validate.json を配置 2. `qfai report --format md` を実行                         | サマリーに Errors/Warnings 数、イシュー一覧に3件、マトリックス表示                                 | 複数イシュー時の出力構造      |
| TC-0003-0013 | L2    | AC-0003-0001, AC-0003-0003 | EX-0003-0013 | 1. validate.json 存在時に `qfai report --format md` を実行 2. 終了コード確認                | 終了コード 0                                                                                     | 正常終了コード検証            |
| TC-0003-0014 | L2    | AC-0003-0003, AC-0003-0005 | EX-0003-0014 | 1. validate.json 不在で `qfai report --format md` を実行 2. 終了コード確認                  | 終了コード 1                                                                                     | エラー終了コード検証          |
| TC-0003-0015 | L2    | AC-0003-0001, AC-0003-0003, AC-0003-0006, AC-0003-0009 |         | 全 AC を網羅する統合テスト: report 実行 → 出力確認                                          | 全 AC シナリオが正常に動作する                                                                    | 統合カバレッジ                |
