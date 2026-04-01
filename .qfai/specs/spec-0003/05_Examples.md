# 05 Examples

## Purpose

- Concretize BR into executable examples.
- Every EX must reference one BR via `BR-Ref`.

## Example Table (required)

| EX-ID        | BR-Ref       | Input                                                       | Expected                                                                          |
| ------------ | ------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| EX-0003-0001 | BR-0003-0001 | 空ディレクトリで `qfai init`                                | `.qfai/` 配下に全サブディレクトリと qfai.config.yaml が生成される                 |
| EX-0003-0002 | BR-0003-0001 | 既存 `.qfai/` がある状態で `qfai init`                      | 既存ファイルは skip、欠落ファイルのみ追加。レポートに skipped パスが表示される    |
| EX-0003-0003 | BR-0003-0002 | `qfai init --force`、skills.local/ にカスタムスキルあり     | skills/ は上書き、skills.local/ は保護される                                      |
| EX-0003-0004 | BR-0003-0003 | `qfai init --dry-run`                                       | 作成予定ファイル一覧が表示、実ファイルは作成されない                              |
| EX-0003-0005 | BR-0003-0004 | `qfai init` 実行後の skill symlink 確認                     | `.claude/skills/qfai-*` が `../../.qfai/assistant/skills/qfai-*` への相対 symlink |
| EX-0003-0006 | BR-0003-0006 | `qfai init` 実行後の agent symlink 確認                     | `.claude/agents/<name>.md` がファイル symlink、README.md は通常ファイル           |
| EX-0003-0007 | BR-0003-0011 | `qfai init --force`、旧 commands/prompts あり               | `qfai-*.md` と `qfai-*.prompt.md` が削除される                                    |
| EX-0003-0008 | BR-0003-0008 | Windows (Developer Mode OFF) で `qfai init`                 | EPERM エラー + Developer Mode 案内メッセージ                                      |
| EX-0003-0009 | BR-0003-0009 | 新規リポジトリで `qfai init`                                | `.github/instructions/` に 2 ファイルが作成される                                 |
| EX-0003-0010 | BR-0003-0009 | instructions ファイルが存在する状態で `qfai init`           | 既存ファイルは skip、レポートに skipped 表示                                      |
| EX-0003-0011 | BR-0003-0009 | instructions ファイルが存在する状態で `qfai init --force`   | `--force` でも上書きされない                                                      |
| EX-0003-0012 | BR-0003-0010 | 新規リポジトリで `qfai init`、instructions が作成された場合 | stdout にアクティベーションガイダンス表示                                         |
| EX-0003-0013 | BR-0003-0012 | 複数回 `qfai init` 実行                                     | 正しい symlink は skip、壊れた symlink は再作成                                   |

## EX-0003-0014: Coverage Placeholder for BR-0003-0005

- BR-Ref: BR-0003-0005
- Given the consolidated rule BR-0003-0005
- When layer coverage is evaluated
- Then at least one example exists for BR-0003-0005

## EX-0003-0015: Coverage Placeholder for BR-0003-0007

- BR-Ref: BR-0003-0007
- Given the consolidated rule BR-0003-0007
- When layer coverage is evaluated
- Then at least one example exists for BR-0003-0007
