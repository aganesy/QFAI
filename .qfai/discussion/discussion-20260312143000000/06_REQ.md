# 06_REQ

## Requirements Table

| REQ-ID   | Title                             | Description                                                                                                                                                      | Source             | Priority | Status |
| -------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------- | ------ |
| REQ-0001 | commands ディレクトリ廃止         | `.claude/commands/qfai-*.md` を削除し、`qfai init --force` 時に prune する                                                                                       | SRC-0001           | must     | draft  |
| REQ-0002 | prompts ディレクトリ廃止          | `.github/prompts/qfai-*.prompt.md` を削除し、`qfai init --force` 時に prune する                                                                                 | SRC-0001           | must     | draft  |
| REQ-0003 | Skill ディレクトリ symlink 生成   | `.claude/skills/`, `.agents/skills/`, `.codex/skills/`, `.github/skills/` に `.qfai/assistant/skills/qfai-*` への directory symlink を作成                       | SRC-0001, SRC-0002 | must     | draft  |
| REQ-0004 | Agent ファイル symlink 生成       | `.claude/agents/<name>.md` → `.qfai/assistant/agents/<name>.md`、`.github/agents/<name>.agent.md` → `.qfai/assistant/agents/<name>.md` のファイル symlink を作成 | SRC-0001, SRC-0002 | must     | draft  |
| REQ-0005 | git config core.symlinks 自動設定 | `qfai init` 実行時に `git config core.symlinks true` を実行する（Git リポジトリ内の場合のみ）                                                                    | SRC-0001, SRC-0007 | must     | draft  |
| REQ-0006 | init.ts symlink 生成ロジック      | `syncIntegrationWrappers()` を `writeFile()` から `fs.symlink()` に変更。skills は `type: 'dir'`（Windows）/ `type: 'dir'`（Unix）、agents は `type: 'file'`     | SRC-0002, SRC-0008 | must     | draft  |
| REQ-0007 | copilot-instructions.md 更新      | `.github/copilot-instructions.md` 内の `.github/prompts/` 参照を `.github/skills/` に変更する                                                                    | SRC-0009           | must     | draft  |
| REQ-0008 | 旧ラッパー prune 拡張             | `pruneStaleQfaiWrappers()` を拡張し、旧 commands/prompts に加え旧 skill ディレクトリ（symlink ではない qfai-\* ディレクトリ）も prune 対象にする                 | SRC-0002           | must     | draft  |
| REQ-0009 | Windows symlink fallback          | Windows で symlink 作成に失敗した場合、明確なエラーメッセージ（Developer Mode 有効化の案内）を表示し、処理を続行しない                                           | SRC-0008           | should   | draft  |
| REQ-0010 | 相対パスの正規化                  | symlink ターゲットは相対パス（`../../.qfai/assistant/skills/qfai-*`）で指定し、リポジトリの絶対パスに依存しない                                                  | SRC-0007           | must     | draft  |
| REQ-0011 | idempotent init                   | `qfai init` を複数回実行しても、既存の正しい symlink は skip し、壊れた symlink のみ再作成する                                                                   | SRC-0002           | must     | draft  |

## Priority Legend

- `must`: Required for MVP / first release.
- `should`: Important but deferrable.
- `could`: Nice-to-have.
- `wont`: Explicitly excluded from current scope.

## Rules

- Each REQ must have at least one Source (SRC-ID) reference.
- Status: `draft` → `reviewed` → `approved`.
