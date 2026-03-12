# 12_OQ-Resolution-Log

## Resolution Timeline

| Date       | OQ-ID   | Action   | Summary                                                              | Evidence                       |
| ---------- | ------- | -------- | -------------------------------------------------------------------- | ------------------------------ |
| 2026-03-12 | OQ-0001 | created  | GitHub agent 命名規約（`.agent.md` vs `.md`）の不一致を登録          | init.ts, Git symlink 仕様     |
| 2026-03-12 | OQ-0001 | resolved | symlink 名はターゲット名と一致不要。OS/Git 仕様上問題なし            | Git symlink 仕様              |
| 2026-03-12 | OQ-0002 | created  | copilot-instructions.md が削除予定の `.github/prompts/` を参照       | SRC-0009                       |
| 2026-03-12 | OQ-0002 | resolved | `.github/skills/` に参照先を更新する方針に決定                       | ユーザー確認                   |
| 2026-03-12 | OQ-0003 | created  | pr-fix/pr-merge の symlink 化要否を確認                              | SRC-0002                       |
| 2026-03-12 | OQ-0003 | resolved | `.qfai/assistant/skills/` に存在しないため対象外と決定               | リポジトリ構造確認             |
| 2026-03-12 | OQ-0004 | created  | Windows Developer Mode OFF 時の symlink 失敗ハンドリング             | SRC-0008                       |
| 2026-03-12 | OQ-0004 | resolved | エラーメッセージ表示 + 処理続行しない方針に決定（ユーザー確認済み）   | AskUserQuestion 回答           |
| 2026-03-12 | OQ-0005 | created  | README.md の symlink 化要否を確認                                    | SRC-0002                       |
| 2026-03-12 | OQ-0005 | resolved | 通常ファイルとして維持する方針に決定                                  | アーキテクチャ分析             |

## Rules

- Append-only: never edit or delete previous entries.
- Every disposition change must be logged here.
- Actions: `created`, `resolved`, `deferred`, `rejected`, `reopened`.
