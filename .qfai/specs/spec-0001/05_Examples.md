# 05 Examples

## Purpose

- Concretize BR into executable examples.
- Every EX must reference one BR via `BR-Ref`.

## Example Table (required)

| EX-ID        | BR-Ref       | Input                                                   | Expected                                                                                                                        | Notes                |
| ------------ | ------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| EX-0001-0001 | BR-0001-0001 | 空ディレクトリで `qfai init`                            | .qfai/assistant/, .qfai/specs/, .qfai/contracts/, .qfai/discussion/, .qfai/evidence/, .qfai/review/, .qfai/report/ が作成される | Happy path           |
| EX-0001-0002 | BR-0001-0002 | 空ディレクトリで `qfai init`                            | プロジェクトルートに qfai.config.yaml が生成される                                                                              | Happy path           |
| EX-0001-0003 | BR-0001-0003 | qfai.config.yaml が既に存在する状態で `qfai init`       | qfai.config.yaml はスキップされ、既存の内容が保持される                                                                         | 冪等性チェック       |
| EX-0001-0004 | BR-0001-0004 | .qfai/ が存在する状態で `qfai init`                     | 既存ファイルは変更されず、コンソールに [SKIP] メッセージが表示される                                                            | 冪等性チェック       |
| EX-0001-0005 | BR-0001-0005 | .qfai/ が存在するが specs/ が欠落した状態で `qfai init` | specs/ のみ新規作成され、他の既存ディレクトリは変更なし                                                                         | 部分初期化           |
| EX-0001-0006 | BR-0001-0006 | 古い skills/ がある状態で `qfai init --force`           | skills/ 配下が最新版に上書きされる                                                                                              | 強制更新             |
| EX-0001-0007 | BR-0001-0007 | skills.local/custom.md がある状態で `qfai init --force` | skills.local/custom.md は変更されずに残る                                                                                       | skills.local/ 保護   |
| EX-0001-0008 | BR-0001-0008 | 空ディレクトリで `qfai init --dry-run`                  | ファイルは一切作成されない。ファイルシステムに変更なし                                                                          | ドライラン           |
| EX-0001-0009 | BR-0001-0009 | 空ディレクトリで `qfai init --dry-run`                  | [CREATE] .qfai/assistant/ のような出力が表示される                                                                              | 出力フォーマット確認 |
| EX-0001-0010 | BR-0001-0009 | .qfai/ 存在状態で `qfai init --dry-run`                 | [SKIP] qfai.config.yaml のような出力が表示される                                                                                | スキップ表示         |
| EX-0001-0011 | BR-0001-0010 | 空ディレクトリで `qfai init`                            | .claude/skills/, .github/skills/, .codex/skills/, .agents/skills/ に symlink が生成される                                       | symlink 生成         |
| EX-0001-0012 | BR-0001-0011 | 生成された symlink のターゲットを確認                   | symlink ターゲットが .qfai/assistant/skills/ への相対パスで解決される                                                           | symlink ターゲット確認 |
| EX-0001-0013 | BR-0001-0012 | 10_workflow.md が存在する状態で `qfai init`             | 10_workflow.md が .qfai/.legacy/ に移動される                                                                                   | レガシー退避         |
| EX-0001-0014 | BR-0001-0013 | 非推奨ファイルが存在しない状態で `qfai init`            | .qfai/.legacy/ ディレクトリは作成されない                                                                                       | レガシー非存在       |
| EX-0001-0015 | BR-0001-0014 | 書き込み権限なしディレクトリで `qfai init`              | code と message と suggested_action を含むエラーメッセージが表示される                                                          | エラーメッセージ品質 |
| EX-0001-0016 | BR-0001-0015 | `qfai init --help`                                      | コマンドの使用方法・オプション（--force, --dry-run）が表示される                                                                | ヘルプ表示           |
| EX-0001-0017 | BR-0001-0018 | macOS で `qfai init` を実行                             | 全 skill symlink（.claude/skills/, .github/skills/, .codex/skills/, .agents/skills/）が正しく作成される                         | macOS Happy path     |
| EX-0001-0018 | BR-0001-0019 | Windows Developer Mode ON で `qfai init` を実行         | symlink が正常に作成される（fs.symlink type: 'dir'/'file'）                                                                    | Windows 正常         |
| EX-0001-0019 | BR-0001-0025 | Windows Developer Mode OFF で `qfai init` を実行        | Developer Mode 有効化の案内エラーメッセージが表示され、処理が中断される                                                        | Windows エラー       |
| EX-0001-0020 | BR-0001-0016 | .claude/commands/ が既に存在しない状態で `qfai init --force` | エラーなく完了し、commands prune 処理はスキップされる                                                                       | prune 対象なし       |
| EX-0001-0021 | BR-0001-0026 | `qfai init` を2回実行                                   | 2回目は既存の正しい symlink をスキップし、再作成しない                                                                          | 冪等性               |
| EX-0001-0022 | BR-0001-0027 | 壊れた symlink（ターゲット不在）が存在する状態で `qfai init` | 壊れた symlink が削除され、正しい symlink が再作成される                                                                    | 壊れた symlink 修復  |
| EX-0001-0023 | BR-0001-0021 | .github/agents/architect.agent.md の symlink を確認     | ターゲットが .qfai/assistant/agents/architect.md への symlink（名前変換 OK）                                                    | agent 命名変換       |
| EX-0001-0024 | BR-0001-0024 | Git リポジトリ外で `qfai init` を実行                   | git config 処理がスキップされ、symlink 生成は正常に完了する                                                                     | Git 外実行           |
| EX-0001-0025 | BR-0001-0029 | copilot-instructions.md に .github/prompts/ 参照がある状態で `qfai init` | .github/prompts/ が .github/skills/ に更新される                                                                | 参照先更新           |
| EX-0001-0026 | BR-0001-0028 | 旧ラッパー（非symlink の qfai-* ディレクトリ）が存在する状態で `qfai init --force` | 旧ラッパーが削除され、symlink に置き換えられる                                                          | 旧ラッパー prune     |
