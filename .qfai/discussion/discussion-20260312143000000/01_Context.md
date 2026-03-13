# 01_Context

## Metadata

| Key           | Value                              |
| ------------- | ---------------------------------- |
| Discussion ID | discussion-20260312143000000       |
| Date          | 2026-03-12                         |
| Owner         | user                               |
| Source        | Feature request / architecture改善 |

## Goal and Completion Criteria

- Goal: QFAI の skill/agent ラッパーファイルをシンボリックリンクベースのアーキテクチャに移行し、`.claude/commands/` と `.github/prompts/` を廃止する。
- Measurable completion criteria:
  1. `.claude/commands/qfai-*.md` および `.github/prompts/qfai-*.prompt.md` が全て削除されていること。
  2. `.claude/skills/`, `.agents/skills/`, `.codex/skills/`, `.github/skills/` 配下の qfai-\* エントリが `.qfai/assistant/skills/` へのディレクトリシンボリックリンクになっていること。
  3. `.claude/agents/`, `.github/agents/` 配下の qfai agent エントリが `.qfai/assistant/agents/` へのファイルシンボリックリンクになっていること。
  4. `qfai init` が `git config core.symlinks true` を実行すること。
  5. `init.ts` が `writeFile()` の代わりに `fs.symlink()` でラッパーを生成すること。

## Stakeholders

- Primary stakeholders: QFAI フレームワーク開発者、QFAI 利用者（全プラットフォーム）
- Secondary stakeholders: CI/CD パイプライン、GitHub Copilot / Claude Code / Codex / Claude Agent SDK 統合

## Background

- Business context: 現在、各ツール統合ディレクトリ（`.claude/`, `.agents/`, `.codex/`, `.github/`）には、`.qfai/assistant/skills/` を参照するラッパーファイルがスキルごとに生成されている。これらは薄いリダイレクトに過ぎず、スキル本体の更新時にラッパーも再生成する必要がある。シンボリックリンクにすれば、常にマスターを参照するため保守コストが激減する。
- Technical context: Git は symlink をネイティブサポートしている（ファイルモード `120000`）。macOS/Linux では透過的に動作する。Windows では `git config core.symlinks true` と Developer Mode が必要。`init.ts` の `syncIntegrationWrappers()` が現在のラッパー生成を担っている。
- Historical context: v1.3.15 以降、`init.ts` は `buildWrapperEntries()` で `.claude/commands/`, `.github/prompts/`, `.agents/skills/`, `.codex/skills/` にラッパーを生成している。`.claude/commands/` は Claude Code スラッシュコマンド、`.github/prompts/` は GitHub Copilot プロンプトを提供するが、`.claude/skills/` と `.github/skills/` に skill として登録すれば代替可能。

## Inputs

- Existing repository facts:
  - `.qfai/assistant/skills/` に 9 つの qfai スキル（qfai-atdd, qfai-configure, qfai-discussion, qfai-prototyping, qfai-sdd, qfai-tdd-green, qfai-tdd-red, qfai-tdd-refactor, qfai-verify）
  - `.qfai/assistant/agents/` に約 40 のエージェント定義
  - `init.ts` (677行) が全ラッパーを生成
  - `.claude/skills/` に pr-fix, pr-merge（非 QFAI、影響なし）
  - `.github/skills/` に pr-fix, pr-merge（非 QFAI、影響なし）
- External references: Git symlink 仕様、Windows Developer Mode 要件
- Assumptions:
  - Claude Code は `.claude/skills/<name>/SKILL.md` を skill として認識する
  - GitHub Copilot は `.github/skills/<name>/SKILL.md` を skill として認識する
  - AI ツールはシンボリックリンクを透過的に解決してファイル内容を読める

## Key Issues

- Issue 1: Windows でのシンボリックリンク作成には Developer Mode または管理者権限が必要
- Issue 2: GitHub agent ファイル名規約（`.agent.md` サフィックス）とカノニカルファイル名（`.md`）の不一致
- Issue 3: `.github/copilot-instructions.md` が削除予定の `.github/prompts/` を参照している
