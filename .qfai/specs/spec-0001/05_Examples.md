# 05 Examples

## Purpose

- Concretize BR into executable examples.
- Every EX must reference one BR via `BR-Ref`.

## Example Table (required)

| EX-ID   | BR-Ref  | Input                                          | Expected                                                                                     | Notes                          |
| ------- | ------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------ |
| EX-0001-0001 | BR-0001-0001 | 空ディレクトリで `qfai init`                   | .qfai/assistant/, .qfai/specs/, .qfai/contracts/, .qfai/discussion/, .qfai/evidence/, .qfai/review/, .qfai/report/ が作成される | Happy path                     |
| EX-0001-0002 | BR-0001-0002 | 空ディレクトリで `qfai init`                   | プロジェクトルートに qfai.config.yaml が生成される                                           | Happy path                     |
| EX-0001-0003 | BR-0001-0003 | qfai.config.yaml が既に存在する状態で `qfai init` | qfai.config.yaml はスキップされ、既存の内容が保持される                                    | 冪等性チェック                 |
| EX-0001-0004 | BR-0001-0004 | .qfai/ が存在する状態で `qfai init`            | 既存ファイルは変更されず、コンソールに [SKIP] メッセージが表示される                          | 冪等性チェック                 |
| EX-0001-0005 | BR-0001-0005 | .qfai/ が存在するが specs/ が欠落した状態で `qfai init` | specs/ のみ新規作成され、他の既存ディレクトリは変更なし                               | 部分初期化                     |
| EX-0001-0006 | BR-0001-0006 | 古い skills/ がある状態で `qfai init --force`  | skills/ 配下が最新版に上書きされる                                                            | 強制更新                       |
| EX-0001-0007 | BR-0001-0007 | skills.local/custom.md がある状態で `qfai init --force` | skills.local/custom.md は変更されずに残る                                              | skills.local/ 保護             |
| EX-0001-0008 | BR-0001-0008 | 空ディレクトリで `qfai init --dry-run`         | ファイルは一切作成されない。ファイルシステムに変更なし                                        | ドライラン                     |
| EX-0001-0009 | BR-0001-0009 | 空ディレクトリで `qfai init --dry-run`         | [CREATE] .qfai/assistant/ のような出力が表示される                                           | 出力フォーマット確認           |
| EX-0001-0010 | BR-0001-0009 | .qfai/ 存在状態で `qfai init --dry-run`        | [SKIP] qfai.config.yaml のような出力が表示される                                             | スキップ表示                   |
| EX-0001-0011 | BR-0001-0010 | 空ディレクトリで `qfai init`                   | .claude/commands/, .github/prompts/, .codex/skills/, .agents/skills/ にラッパーが生成される   | ラッパー生成                   |
| EX-0001-0012 | BR-0001-0011 | 生成されたラッパーファイルを確認               | ラッパー内に .qfai/assistant/skills/ へのパス参照が含まれる                                   | 参照確認                       |
| EX-0001-0013 | BR-0001-0012 | 10_workflow.md が存在する状態で `qfai init`    | 10_workflow.md が .qfai/.legacy/ に移動される                                                | レガシー退避                   |
| EX-0001-0014 | BR-0001-0013 | 非推奨ファイルが存在しない状態で `qfai init`   | .qfai/.legacy/ ディレクトリは作成されない                                                    | レガシー非存在                 |
| EX-0001-0015 | BR-0001-0014 | 書き込み権限なしディレクトリで `qfai init`     | code と message と suggested_action を含むエラーメッセージが表示される                        | エラーメッセージ品質           |
| EX-0001-0016 | BR-0001-0015 | `qfai init --help`                             | コマンドの使用方法・オプション（--force, --dry-run）が表示される                              | ヘルプ表示                     |
