# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0001-0001
Scenario: 空ディレクトリでの初期化成功
  Given 空のプロジェクトディレクトリが存在する
  When `qfai init` を実行する
  Then `.qfai/` 配下に assistant/, specs/, contracts/, discussion/, evidence/, review/, report/ が作成される
  And qfai.config.yaml が生成される
```

```gherkin
# AC-0001-0002
Scenario: 既存プロジェクトでの初期化成功
  Given 既存のソースコードがあるプロジェクトディレクトリが存在する
  When `qfai init` を実行する
  Then 既存ファイルに影響を与えず `.qfai/` 構造が追加される
```

```gherkin
# AC-0001-0003
Scenario: 書き込み権限なしでのエラー
  Given プロジェクトディレクトリに書き込み権限がない
  When `qfai init` を実行する
  Then エラーメッセージが表示され、終了コード 1 で終了する
```

```gherkin
# AC-0001-0004
Scenario: 冪等な初期化 - 既存ファイルスキップ
  Given `.qfai/` ディレクトリが既に存在し、qfai.config.yaml が存在する
  When `qfai init` を再度実行する
  Then 既存ファイルはスキップされ、新規ファイルのみ追加される
  And スキップされたファイルの情報がコンソールに表示される
```

```gherkin
# AC-0001-0005
Scenario: 冪等な初期化 - 新規ファイル追加
  Given `.qfai/` ディレクトリが存在するが、一部のファイルが欠落している
  When `qfai init` を再度実行する
  Then 欠落ファイルのみが新規作成される
  And 既存ファイルは変更されない
```

```gherkin
# AC-0001-0006
Scenario: --force でスキル上書き
  Given `.qfai/assistant/skills/` に古いバージョンのスキルファイルが存在する
  When `qfai init --force` を実行する
  Then skills/ 配下のスキルファイルが最新版に上書きされる
  And skills.local/ 配下のファイルは保護され変更されない
```

```gherkin
# AC-0001-0007
Scenario: --force で skills.local/ 保護確認
  Given `.qfai/assistant/skills.local/` にカスタムスキルが存在する
  When `qfai init --force` を実行する
  Then skills.local/ 配下のファイルは一切変更されない
```

```gherkin
# AC-0001-0008
Scenario: --dry-run で変更プレビュー
  Given 空のプロジェクトディレクトリが存在する
  When `qfai init --dry-run` を実行する
  Then 作成予定のファイル一覧が [CREATE] プレフィックス付きで表示される
  And 実際にはファイルが作成されない
```

```gherkin
# AC-0001-0009
Scenario: --dry-run で既存ファイルのスキップ表示
  Given `.qfai/` ディレクトリが既に存在する
  When `qfai init --dry-run` を実行する
  Then スキップ対象が [SKIP] プレフィックス付きで表示される
  And 実際にはファイル操作が行われない
```

```gherkin
# AC-0001-0010
Scenario: マルチツールラッパー生成
  Given 空のプロジェクトディレクトリが存在する
  When `qfai init` を実行する
  Then `.claude/commands/` にラッパーファイルが生成される
  And `.github/prompts/` にラッパーファイルが生成される
  And `.codex/skills/` にラッパーファイルが生成される
  And `.agents/skills/` にラッパーファイルが生成される
```

```gherkin
# AC-0001-0011
Scenario: ラッパーファイルのスキル参照
  Given `qfai init` を実行して .qfai/ が作成されている
  When 生成されたラッパーファイルを確認する
  Then 各ラッパーファイルは `.qfai/assistant/skills/` 配下のスキルファイルへの参照を含む
```

```gherkin
# AC-0001-0012
Scenario: レガシーファイル検出・退避
  Given プロジェクトに非推奨ファイル（10_workflow.md）が存在する
  When `qfai init` を実行する
  Then 非推奨ファイルが `.qfai/.legacy/` に退避される
  And 退避元・退避先がコンソールに表示される
```

```gherkin
# AC-0001-0013
Scenario: レガシーファイル非存在時のスキップ
  Given プロジェクトに非推奨ファイルが存在しない
  When `qfai init` を実行する
  Then レガシー退避処理はスキップされる
  And `.qfai/.legacy/` ディレクトリは作成されない
```

```gherkin
# AC-0001-0014
Scenario: --help でヘルプ表示
  Given CLI がインストールされている
  When `qfai init --help` を実行する
  Then init コマンドの使用方法、オプション一覧が表示される
```

## AC Catalog (optional)

| AC_ID   | Title                        | Notes                           | Priority |
| ------- | ---------------------------- | ------------------------------- | -------- |
| AC-0001-0001 | 空ディレクトリでの初期化成功 | REQ-0001                        | P1       |
| AC-0001-0002 | 既存プロジェクトでの初期化   | REQ-0001                        | P1       |
| AC-0001-0003 | 書き込み権限なしエラー       | NFR-0040                        | P2       |
| AC-0001-0004 | 冪等な初期化 - スキップ      | REQ-0002, NFR-0012              | P1       |
| AC-0001-0005 | 冪等な初期化 - 新規追加      | REQ-0002                        | P1       |
| AC-0001-0006 | --force でスキル上書き       | REQ-0003                        | P1       |
| AC-0001-0007 | --force で skills.local 保護 | REQ-0003                        | P1       |
| AC-0001-0008 | --dry-run 変更プレビュー     | REQ-0004                        | P2       |
| AC-0001-0009 | --dry-run スキップ表示       | REQ-0004                        | P2       |
| AC-0001-0010 | マルチツールラッパー生成     | REQ-0005                        | P1       |
| AC-0001-0011 | ラッパーのスキル参照         | REQ-0005                        | P2       |
| AC-0001-0012 | レガシーファイル退避         | REQ-0006                        | P2       |
| AC-0001-0013 | レガシー非存在時スキップ     | REQ-0006                        | P2       |
| AC-0001-0014 | --help ヘルプ表示            | NFR-0042                        | P2       |
