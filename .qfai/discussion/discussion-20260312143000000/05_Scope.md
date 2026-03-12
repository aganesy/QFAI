# 05_Scope

## In Scope

- Capability 1: `.claude/commands/` と `.github/prompts/` の qfai-\* ファイル廃止
- Capability 2: `.claude/skills/`, `.agents/skills/`, `.codex/skills/`, `.github/skills/` に qfai-\* ディレクトリシンボリックリンクを配置
- Capability 3: `.claude/agents/`, `.github/agents/` に qfai agent ファイルシンボリックリンクを配置
- Capability 4: `qfai init` での `git config core.symlinks true` 自動設定
- Capability 5: `init.ts` の `syncIntegrationWrappers()` を symlink 生成方式に書き換え
- Capability 6: `copilot-instructions.md` の参照先更新
- Capability 7: Windows 環境での symlink 失敗時のエラーハンドリング

## Out of Scope

- Item 1: pr-fix / pr-merge skill のリファクタ（`.qfai/assistant/skills/` に存在しないため対象外）
- Item 2: agent 定義ファイル（`.qfai/assistant/agents/*.md`）の内容変更
- Item 3: README.md ファイルの symlink 化（通常ファイルのまま維持）
- Item 4: CI/CD 変更のうち、symlink 移行と AskUserQuestion Protocol に直接関係しない追加改修
- Item 5: `.github/instructions/` ディレクトリの変更
- Item 6: 新規 skill の追加

## Constraints

- Technical constraints: Windows で symlink 作成には Developer Mode または管理者権限が必要
- Operational constraints: `qfai init --force` による migration パスが必要
- Legal / compliance constraints: なし

## Success Criteria

| Criterion | Measurement                                       | Target                                    | Priority |
| --------- | ------------------------------------------------- | ----------------------------------------- | -------- |
| SC-001    | qfai-\* symlink の正しいターゲット解決            | 全 9 skill × 4 ディレクトリ = 36 symlinks | must     |
| SC-002    | agent symlink の正しいターゲット解決              | 全 agent × 2 ディレクトリ                 | must     |
| SC-003    | macOS/Linux での `qfai init` 成功率               | 100%                                      | must     |
| SC-004    | Windows Developer Mode ON での `qfai init` 成功率 | 100%                                      | must     |
| SC-005    | Windows Developer Mode OFF での graceful failure  | エラーメッセージ表示                      | should   |
| SC-006    | 旧ラッパーの完全削除（`--force` 時）              | commands + prompts + 旧ディレクトリ = 0   | must     |

## Assumptions

- Assumption 1: Claude Code は `.claude/skills/<name>/SKILL.md` を skill として認識し、`.claude/commands/` がなくても `/qfai-*` スラッシュコマンド相当の機能を提供する。
- Assumption 2: GitHub Copilot は `.github/skills/<name>/SKILL.md` を skill として認識する。
- Assumption 3: 各 AI ツール（Claude Code, Codex, GitHub Copilot, Claude Agent SDK）はシンボリックリンクを透過的に解決してファイル内容を読める。
- Assumption 4: QFAI 利用者の多くは macOS または Linux を使用しており、Windows 利用者は Developer Mode を有効にできる。
