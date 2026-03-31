# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0003-0001: Markdown レポート出力（正常系）
Scenario: validate.json が存在する状態で Markdown レポートを生成する
  Given 設定された validateJsonPath（既定: .qfai/report/validate.json）に validate 結果が存在する
  When `qfai report --format md` を実行する
  Then 設定された outDir（既定: .qfai/report）配下に report.md が生成される
  And report.md にエグゼクティブサマリー、イシュー一覧、トレーサビリティマトリックスが含まれる
  And 終了コードが 0 である

# AC-0003-0002: Markdown レポート出力（イシューゼロ）
Scenario: イシューがゼロの場合のサマリー表示
  Given validateJsonPath に issues が 0 件の validate 結果が存在する
  When `qfai report --format md` を実行する
  Then サマリーに "No issues found" が表示される

# AC-0003-0003: Markdown レポート出力（validate.json 不在エラー）
Scenario: validate.json が存在しない状態でレポート生成を試みる
  Given 設定された validateJsonPath（既定: .qfai/report/validate.json）に validate 結果が存在しない
  And --run-validate が指定されていない
  When `qfai report --format md` を実行する
  Then 入力ファイルパスを含むエラーメッセージが表示される
  And 終了コードが 2 である

# AC-0003-0004: JSON レポート出力（正常系）
Scenario: validate.json が存在する状態で JSON レポートを生成する
  Given 設定された validateJsonPath（既定: .qfai/report/validate.json）に validate 結果が存在する
  When `qfai report --format json` を実行する
  Then 設定された outDir（既定: .qfai/report）配下に report.json が生成される
  And report.json の内容が有効な JSON である
  And 終了コードが 0 である

# AC-0003-0005: JSON レポート出力（validate.json 不在エラー）
Scenario: validate.json が存在しない状態で JSON レポート生成を試みる
  Given 設定された validateJsonPath（既定: .qfai/report/validate.json）に validate 結果が存在しない
  And --run-validate が指定されていない
  When `qfai report --format json` を実行する
  Then エラーメッセージが表示される
  And 終了コードが 2 である

# AC-0003-0006: リポジトリリンク付与（Markdown）
Scenario: --base-url を指定して Markdown レポートを生成する
  Given 設定された validateJsonPath に validate 結果が存在する
  When `qfai report --format md --base-url https://github.com/org/repo/blob/main` を実行する
  Then 生成された report.md のイシュー一覧のファイルパスがリポジトリ URL リンクに変換される
  And リンク形式が `[<path>](https://github.com/org/repo/blob/main/<path>)` である

# AC-0003-0007: リポジトリリンク付与（JSON）
Scenario: --base-url を指定して JSON レポートを生成する
  Given 設定された validateJsonPath に validate 結果が存在する
  When `qfai report --format json --base-url https://github.com/org/repo/blob/main` を実行する
  Then 生成された report.json の各イシューに url フィールドが追加される

# AC-0003-0008: 内部バリデーション実行（正常系）
Scenario: --run-validate を指定してレポートを生成する
  Given 設定された validateJsonPath に validate 結果が存在しない
  And プロジェクトに有効なスペック構造が存在する
  When `qfai report --format md --run-validate` を実行する
  Then 内部的にバリデーションが実行される
  And validate 結果が validateJsonPath に保存される
  And バリデーション結果に基づく report.md が生成される
  And 終了コードが 0 である

# AC-0003-0009: 内部バリデーション実行（バリデーション失敗）
Scenario: --run-validate でバリデーションがエラーを検出する
  Given プロジェクトに不完全なスペック構造が存在する
  When `qfai report --format md --run-validate` を実行する
  Then 内部バリデーションで検出されたイシューが report.md に含まれる
  And 終了コードが 0 である

# AC-0003-0010: CLI ヘルプ表示
Scenario: report コマンドのヘルプを表示する
  Given qfai CLI がインストールされている
  When `qfai report --help` を実行する
  Then report コマンドの使用方法、オプション一覧が表示される

# AC-0003-0011: 冪等性
Scenario: 同一入力で2回実行して同一出力を得る
  Given 設定された validateJsonPath に validate 結果が存在する
  When `qfai report --format md` を2回連続で実行する
  Then 2回生成された report.md の内容が同一である
```

## AC Catalog (optional)

| AC_ID        | Title                                       | Notes                                              | Priority |
| ------------ | ------------------------------------------- | -------------------------------------------------- | -------- |
| AC-0003-0001 | Markdown レポート出力（正常系）             | エグゼクティブサマリー、イシュー一覧、マトリックス | P1       |
| AC-0003-0002 | Markdown レポート出力（イシューゼロ）       | No issues found 表示                               | P2       |
| AC-0003-0003 | Markdown レポート出力（validate.json 不在） | エラーハンドリング                                 | P1       |
| AC-0003-0004 | JSON レポート出力（正常系）                 | 構造化データ出力                                   | P1       |
| AC-0003-0005 | JSON レポート出力（validate.json 不在）     | エラーハンドリング                                 | P1       |
| AC-0003-0006 | リポジトリリンク付与（Markdown）            | --base-url オプション                              | P2       |
| AC-0003-0007 | リポジトリリンク付与（JSON）                | --base-url オプション                              | P2       |
| AC-0003-0008 | 内部バリデーション実行（正常系）            | --run-validate オプション                          | P2       |
| AC-0003-0009 | 内部バリデーション実行（失敗時）            | イシュー含有レポート                               | P2       |
| AC-0003-0010 | CLI ヘルプ表示                              | --help オプション                                  | P2       |
| AC-0003-0011 | 冪等性                                      | 同一入力→同一出力                                  | P1       |
