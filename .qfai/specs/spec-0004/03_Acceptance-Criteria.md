# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0004-0001: 設定ファイル診断（正常系）
Scenario: 正常な qfai.config.yaml が存在する場合
  Given プロジェクトルートに有効な qfai.config.yaml が存在する
  When `qfai doctor` を実行する
  Then 設定ファイルチェックが ok と表示される
  And 終了コードが 0 である

# AC-0004-0002: 設定ファイル診断（不在エラー）
Scenario: qfai.config.yaml が存在しない場合
  Given プロジェクトルートに qfai.config.yaml が存在しない
  When `qfai doctor` を実行する
  Then 設定ファイル不在のエラーメッセージ（code, message, suggested_action 付き）が表示される
  And 終了コードが 1 である

# AC-0004-0003: 設定ファイル診断（不正内容）
Scenario: qfai.config.yaml の内容が不正な場合
  Given プロジェクトルートに不正な内容の qfai.config.yaml が存在する
  When `qfai doctor` を実行する
  Then 具体的な不正箇所（フィールド名、期待値、実際値）を含むエラーメッセージが表示される
  And 終了コードが 1 である

# AC-0004-0004: ディレクトリ構造診断（正常系）
Scenario: 必要なディレクトリがすべて存在する場合
  Given .qfai/ 配下に specs/, contracts/, discussion/, evidence/ が存在する
  When `qfai doctor` を実行する
  Then ディレクトリ構造チェックが ok と表示される

# AC-0004-0005: ディレクトリ構造診断（欠落）
Scenario: 必要なディレクトリが欠落している場合
  Given .qfai/ 配下に specs/ が存在しない
  When `qfai doctor` を実行する
  Then 欠落ディレクトリの警告メッセージ（suggested_action 付き）が表示される

# AC-0004-0006: パス解決診断（正常系）
Scenario: 設定ファイル内のパスがすべて正しく解決される場合
  Given qfai.config.yaml の specsDir, contractsDir, testsDir が実在するディレクトリを参照する
  When `qfai doctor` を実行する
  Then パス解決チェックが ok と表示される

# AC-0004-0007: パス解決診断（解決失敗）
Scenario: 設定ファイル内のパスが存在しないディレクトリを参照する場合
  Given qfai.config.yaml の testsDir が存在しないディレクトリを参照する
  When `qfai doctor` を実行する
  Then 解決失敗のパスとその設定キーを含む警告メッセージが表示される

# AC-0004-0008: パス解決診断（パストラバーサル）
Scenario: 設定ファイル内のパスが root 外を参照する場合
  Given qfai.config.yaml の specsDir が "../../outside" を参照する
  When `qfai doctor` を実行する
  Then パストラバーサル検出のエラーメッセージが表示される
  And 終了コードが 1 である

# AC-0004-0009: レガシー警告（検出あり）
Scenario: レガシーファイルレイアウトが検出される場合
  Given プロジェクトに v1.4.25 以前の spec-pack 形式のファイルが存在する
  When `qfai doctor` を実行する
  Then レガシーレイアウトの情報レベル警告（移行手順の suggested_action 付き）が表示される

# AC-0004-0010: レガシー警告（非推奨ディレクトリ）
Scenario: 非推奨の promptsDir が存在する場合
  Given プロジェクトに非推奨の promptsDir が存在する
  When `qfai doctor` を実行する
  Then 情報レベルの警告メッセージが表示される

# AC-0004-0011: JSON 診断出力（正常系）
Scenario: --format json で診断結果を出力する
  Given プロジェクトに有効な設定・構造が存在する
  When `qfai doctor --format json` を実行する
  Then 有効な JSON 形式で診断結果が stdout に出力される
  And checks 配列に各チェック項目の結果が含まれる

# AC-0004-0012: JSON 診断出力（エラー含有）
Scenario: エラーがある状態で --format json を実行する
  Given プロジェクトに設定エラーが存在する
  When `qfai doctor --format json` を実行する
  Then JSON 出力に status: "error" のチェック項目が含まれる

# AC-0004-0013: --fail-on による終了コード制御
Scenario: --fail-on warning で警告がある場合
  Given プロジェクトに警告レベルの問題が存在する
  When `qfai doctor --fail-on warning` を実行する
  Then 終了コードが 1 である

# AC-0004-0014: CLI ヘルプ表示
Scenario: doctor コマンドのヘルプを表示する
  Given qfai CLI がインストールされている
  When `qfai doctor --help` を実行する
  Then doctor コマンドの使用方法、オプション一覧が表示される

# AC-0004-0015: 日本語メッセージ出力
Scenario: 診断メッセージが日本語で出力される
  Given プロジェクトに設定エラーが存在する
  When `qfai doctor` を実行する
  Then 診断メッセージが日本語で出力される
```

## AC Catalog (optional)

| AC_ID        | Title                              | Notes                    | Priority |
| ------------ | ---------------------------------- | ------------------------ | -------- |
| AC-0004-0001 | 設定ファイル診断（正常系）         | 設定 ok 表示             | P1       |
| AC-0004-0002 | 設定ファイル診断（不在エラー）     | エラーハンドリング       | P1       |
| AC-0004-0003 | 設定ファイル診断（不正内容）       | 具体的な不正箇所の報告   | P1       |
| AC-0004-0004 | ディレクトリ構造診断（正常系）     | 必要ディレクトリ存在確認 | P1       |
| AC-0004-0005 | ディレクトリ構造診断（欠落）       | 欠落警告                 | P1       |
| AC-0004-0006 | パス解決診断（正常系）             | パス解決成功             | P1       |
| AC-0004-0007 | パス解決診断（解決失敗）           | 解決失敗の警告           | P1       |
| AC-0004-0008 | パス解決診断（パストラバーサル）   | セキュリティチェック     | P1       |
| AC-0004-0009 | レガシー警告（検出あり）           | spec-pack 形式検出       | P2       |
| AC-0004-0010 | レガシー警告（非推奨ディレクトリ） | 情報レベル警告           | P2       |
| AC-0004-0011 | JSON 診断出力（正常系）            | --format json            | P1       |
| AC-0004-0012 | JSON 診断出力（エラー含有）        | エラー時の JSON 出力     | P1       |
| AC-0004-0013 | --fail-on 終了コード制御           | warning/error レベル制御 | P2       |
| AC-0004-0014 | CLI ヘルプ表示                     | --help オプション        | P2       |
| AC-0004-0015 | 日本語メッセージ出力               | NFR-0041 準拠            | P2       |
