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
Scenario: symlink ベースのスキル統合生成
  Given 空のプロジェクトディレクトリが存在する
  When `qfai init` を実行する
  Then `.claude/skills/` に skill symlink が生成される
  And `.github/skills/` に skill symlink が生成される
  And `.codex/skills/` に skill symlink が生成される
  And `.agents/skills/` に skill symlink が生成される
```

```gherkin
# AC-0001-0011
Scenario: symlink ターゲット解決
  Given `qfai init` を実行して .qfai/ が作成されている
  When 生成された symlink のターゲットを確認する
  Then 各 skill symlink は `.qfai/assistant/skills/` 配下のスキルディレクトリへの相対パスで解決される
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

```gherkin
# AC-0001-0015
Scenario: commands ディレクトリ prune
  Given `.claude/commands/qfai-*.md` が存在する
  When `qfai init --force` を実行する
  Then `.claude/commands/qfai-*.md` が存在しないこと
```

```gherkin
# AC-0001-0016
Scenario: prompts ディレクトリ prune
  Given `.github/prompts/qfai-*.prompt.md` が存在する
  When `qfai init --force` を実行する
  Then `.github/prompts/qfai-*.prompt.md` が存在しないこと
```

```gherkin
# AC-0001-0017
Scenario: Skill ディレクトリ symlink（.claude/skills/）
  Given `.qfai/assistant/skills/qfai-*` にカノニカルスキルが存在する
  When `qfai init` を実行する
  Then `.claude/skills/qfai-*` が `.qfai/assistant/skills/qfai-*` への directory symlink であること
```

```gherkin
# AC-0001-0018
Scenario: Skill ディレクトリ symlink（.agents/, .codex/, .github/）
  Given `.qfai/assistant/skills/qfai-*` にカノニカルスキルが存在する
  When `qfai init` を実行する
  Then `.agents/skills/qfai-*`, `.codex/skills/qfai-*`, `.github/skills/qfai-*` が同様に directory symlink であること
```

```gherkin
# AC-0001-0019
Scenario: Agent ファイル symlink（.claude/agents/）
  Given `.qfai/assistant/agents/<name>.md` にカノニカルエージェントが存在する
  When `qfai init` を実行する
  Then `.claude/agents/<name>.md` が `.qfai/assistant/agents/<name>.md` へのファイル symlink であること
```

```gherkin
# AC-0001-0020
Scenario: Agent ファイル symlink（.github/agents/）
  Given `.qfai/assistant/agents/<name>.md` にカノニカルエージェントが存在する
  When `qfai init` を実行する
  Then `.github/agents/<name>.agent.md` が `.qfai/assistant/agents/<name>.md` へのファイル symlink であること
```

```gherkin
# AC-0001-0021
Scenario: README.md 通常ファイル維持
  Given `.qfai/assistant/agents/` に README.md と他のエージェントファイルが存在する
  When `qfai init` を実行する
  Then README.md は symlink 化されず通常ファイルのまま維持されること
```

```gherkin
# AC-0001-0022
Scenario: git config core.symlinks 設定
  Given Git リポジトリ内で `qfai init` を実行する
  When init 処理が開始される
  Then `git config core.symlinks true` が実行されること
```

```gherkin
# AC-0001-0023
Scenario: Windows symlink 失敗時エラー
  Given Windows 環境で Developer Mode が無効である
  When `qfai init` で symlink 作成を試みる
  Then Developer Mode 有効化の案内を含むエラーメッセージが表示されること
  And 処理が中断されること
```

```gherkin
# AC-0001-0024
Scenario: macOS/Linux での symlink 正常作成
  Given macOS または Linux 環境である
  When `qfai init` を実行する
  Then 追加設定不要で symlink が正常に作成されること
```

```gherkin
# AC-0001-0025
Scenario: copilot-instructions.md 参照先更新
  Given `.github/copilot-instructions.md` に `.github/prompts/` への参照が含まれる
  When `qfai init` を実行する
  Then `.github/prompts/` の参照が `.github/skills/` に更新されること
```

```gherkin
# AC-0001-0026
Scenario: アップグレード時の stale asset 検出と移行ガイダンス
  Given v1.7.5 以前のプロジェクトが存在する
  When `qfai init` を実行する
  Then stale アセットが検出される
  And アップグレードガイダンスとマイグレーション手順がコンソールに表示される
```

```gherkin
# AC-0001-0027
Scenario: サポート外バージョンからのマイグレーション拒否
  Given v1.4.0 以前のプロジェクトが存在する
  When `qfai init` を実行する
  Then "manual migration required" を含むエラーメッセージが表示される
  And 終了コード 1 で終了する
```

```gherkin
# AC-0001-0028
Scenario: 最新バージョンでの no-op アップグレードチェック
  Given すでに v1.7.6 のプロジェクトが存在する
  When `qfai init` を実行する
  Then "already current" を含むメッセージが表示される
  And ファイルシステムへの変更は行われない
```

```gherkin
# AC-0001-0029
Scenario: マイグレーション前の確認プロンプト
  Given 設定ファイルを変更するマイグレーションが必要な状態である
  When `qfai init` を実行する（非インタラクティブモード以外）
  Then 破壊的変更の前にユーザーに確認プロンプトが表示される
  And ユーザーが拒否した場合はマイグレーションが中断される
```

```gherkin
# AC-0001-0030
Scenario: マイグレーション状態遷移とロールバック
  Given マイグレーションが進行中である（migrating 状態）
  When マイグレーションが失敗または中断される
  Then プロジェクトは pre-migration 状態にロールバックされる
  And ロールバック完了がコンソールに表示される
```

```gherkin
# AC-0001-0031
Scenario: 完了済みマイグレーションの冪等性
  Given すでにマイグレーション済み（migrated 状態）のプロジェクトが存在する
  When `qfai init` を再度実行する
  Then マイグレーション処理はスキップされる（安全な no-op）
  And 既存のファイルは変更されない
```

```gherkin
# AC-0001-0032
Scenario: バージョン一貫性の正常ケース
  Given changelog、steering docs、ソースコメントがすべて同一バージョンを参照している
  When `qfai validate` を実行する
  Then バージョン不整合エラーは報告されない
```

```gherkin
# AC-0001-0033
Scenario: バージョン不整合の検出
  Given ソースコメントが v1.7.5 を参照し changelog が v1.7.6 を示している
  When `qfai validate` を実行する
  Then バージョン不整合エラーが報告される
  And 不整合箇所（ファイルパス、参照バージョン）がエラーメッセージに含まれる
```

```gherkin
# AC-0001-0034
Scenario: プレリリースバージョン表記の一貫性
  Given バージョンが 1.7.7-dev である
  When `qfai validate` を実行する
  Then dev サフィックスを含む全指標が一貫していれば不整合エラーは報告されない
```

```gherkin
# AC-0001-0035
Scenario: 内部モジュールドキュメントの発見可能性
  Given critique、calibration、observability、handoff、detection モジュールのドキュメントが整備されている
  When コントリビューターがモジュールドキュメントを参照する
  Then 使用方法・エントリポイント・モード関係・障害時挙動がドキュメントから理解できる
```

```gherkin
# AC-0001-0036
Scenario: 未ドキュメントモジュールの検出
  Given 新規モジュールが追加されているがドキュメントが存在しない
  When `qfai validate` を実行する
  Then 未ドキュメントモジュールの警告が報告される
```

```gherkin
# AC-0001-0037
Scenario: ドキュメント内の壊れたモジュール参照の検出
  Given ドキュメントが存在しないソースファイルを参照している
  When `qfai validate` を実行する
  Then 壊れた参照エラーが報告される
```

## AC Catalog (optional)

| AC_ID        | Title                                  | Notes              | Priority |
| ------------ | -------------------------------------- | ------------------ | -------- |
| AC-0001-0001 | 空ディレクトリでの初期化成功           | REQ-0001           | P1       |
| AC-0001-0002 | 既存プロジェクトでの初期化             | REQ-0001           | P1       |
| AC-0001-0003 | 書き込み権限なしエラー                 | NFR-0040           | P2       |
| AC-0001-0004 | 冪等な初期化 - スキップ                | REQ-0002, NFR-0012 | P1       |
| AC-0001-0005 | 冪等な初期化 - 新規追加                | REQ-0002           | P1       |
| AC-0001-0006 | --force でスキル上書き                 | REQ-0003           | P1       |
| AC-0001-0007 | --force で skills.local 保護           | REQ-0003           | P1       |
| AC-0001-0008 | --dry-run 変更プレビュー               | REQ-0004           | P2       |
| AC-0001-0009 | --dry-run スキップ表示                 | REQ-0004           | P2       |
| AC-0001-0010 | symlink ベースのスキル統合             | REQ-0005, REQ-0009 | P1       |
| AC-0001-0011 | symlink ターゲット解決                 | REQ-0005, REQ-0016 | P1       |
| AC-0001-0012 | レガシーファイル退避                   | REQ-0006           | P2       |
| AC-0001-0013 | レガシー非存在時スキップ               | REQ-0006           | P2       |
| AC-0001-0014 | --help ヘルプ表示                      | NFR-0042           | P2       |
| AC-0001-0015 | commands ディレクトリ prune            | REQ-0007           | P1       |
| AC-0001-0016 | prompts ディレクトリ prune             | REQ-0008           | P1       |
| AC-0001-0017 | Skill symlink (.claude)                | REQ-0009           | P1       |
| AC-0001-0018 | Skill symlink (他3ツール)              | REQ-0009           | P1       |
| AC-0001-0019 | Agent symlink (.claude)                | REQ-0010           | P1       |
| AC-0001-0020 | Agent symlink (.github)                | REQ-0010           | P1       |
| AC-0001-0021 | README.md 通常ファイル維持             | REQ-0010           | P2       |
| AC-0001-0022 | git config core.symlinks               | REQ-0011           | P1       |
| AC-0001-0023 | Windows symlink 失敗エラー             | REQ-0015           | P1       |
| AC-0001-0024 | macOS/Linux 正常 symlink               | REQ-0009           | P1       |
| AC-0001-0025 | copilot-instructions 更新              | REQ-0013           | P1       |
| AC-0001-0026 | stale asset 検出と移行ガイダンス       | REQ-0018           | P1       |
| AC-0001-0027 | サポート外バージョン拒否               | REQ-0018           | P1       |
| AC-0001-0028 | 最新バージョンの no-op チェック        | REQ-0018           | P1       |
| AC-0001-0029 | マイグレーション前確認プロンプト       | REQ-0018           | P1       |
| AC-0001-0030 | マイグレーション状態遷移とロールバック | REQ-0018           | P1       |
| AC-0001-0031 | マイグレーション冪等性                 | REQ-0018           | P1       |
| AC-0001-0032 | バージョン一貫性の正常ケース           | REQ-0019           | P2       |
| AC-0001-0033 | バージョン不整合の検出                 | REQ-0019           | P2       |
| AC-0001-0034 | プレリリースバージョン一貫性           | REQ-0019           | P2       |
| AC-0001-0035 | モジュールドキュメントの発見可能性     | REQ-0019           | P2       |
| AC-0001-0036 | 未ドキュメントモジュール検出           | REQ-0019           | P2       |
| AC-0001-0037 | 壊れたモジュール参照検出               | REQ-0019           | P2       |
