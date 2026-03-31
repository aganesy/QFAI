# 01 Spec

- Spec: spec-0003
- Parent: CAP-0003
- Consolidates: old spec-0001 (init), spec-0017 (Copilot Review Instructions), spec-0018 (Codex Sub-Agent TOML)

## Consumer View

- Primary SSOT for execution: `spec-0003/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: init コマンドの全機能（ディレクトリ生成、設定ファイル生成、symlink ベースのスキル/エージェント統合、旧ラッパー prune、git config 設定、copilot-instructions.md 生成、Copilot review instructions 配布、Codex サブエージェント TOML 統合、--force、--dry-run、レガシー退避）
- Out: validate/report/doctor/guardrails

## Applicable NFR

- NFR-0012: 冪等性 - 同一入力に対して同一出力を保証
- NFR-0040: エラーメッセージ品質 - 各 Issue に code, message, suggested_action
- NFR-0042: CLI ヘルプ - 各コマンドに `--help` で使用方法表示
- NFR-S0001: ラッパー同期コスト排除 - skill 更新時にラッパー更新が不要
- NFR-S0002: クロスプラットフォーム互換性 - macOS, Linux, Windows (Developer Mode) で動作
- NFR-S0003: Git symlink 追跡の正確性 - `git ls-files -s` で mode `120000` として追跡
- NFR-S0004: エラーメッセージの明確性 - Windows fallback 時にユーザーが対処法を理解可能
- NFR-S0005: 後方互換性 - 旧ラッパー形式のプロジェクトが `--force` で移行可能
- NFR-S0006: init 実行時間 - symlink 生成は既存 writeFile と同等以下の速度

## Applicable Policy

- Policy: \_policies/01_Objective.md, \_policies/07_Constraints.md

## Evidence Summary

- Evidence: init コマンド実行結果のディレクトリ構造スナップショット

## Relevant Requirements

- REQ-0001: プロジェクト初期化 - `qfai init` で `.qfai/` ディレクトリ構造、設定ファイル、ラッパーを生成する
- REQ-0002: 初期化の冪等性 - 2回目以降の `qfai init` は既存ファイルをスキップし、新規ファイルのみ追加する
- REQ-0003: 強制更新 - `qfai init --force` でスキルファイルを最新版に上書き更新する（skills.local/ は保護）
- REQ-0004: ドライラン - `qfai init --dry-run` で変更内容をプレビューし、実際のファイル操作を行わない
- REQ-0005: マルチツール symlink 統合 - Claude Code, GitHub Copilot, Codex, Anthropic Agents 用の symlink を生成する
- REQ-0006: レガシーファイル退避 - 非推奨ファイル（10_workflow.md 等）の検出・削除を行う
- REQ-0007: commands/prompts ディレクトリ廃止 - `--force` 時に旧 `.claude/commands/qfai-*.md` および `.github/prompts/qfai-*.prompt.md` を prune する
- REQ-0008: Skill ディレクトリ symlink 生成 - `.claude/skills/`, `.agents/skills/`, `.codex/skills/`, `.github/skills/` に directory symlink を作成
- REQ-0009: Agent ファイル symlink 生成 - `.claude/agents/<name>.md` および `.github/agents/<name>.agent.md` をファイル symlink として作成
- REQ-0010: git config core.symlinks 自動設定 - Git リポジトリ内の場合に自動設定
- REQ-0011: copilot-instructions.md 生成 - `.github/copilot-instructions.md` を生成する
- REQ-0012: Copilot review instructions 配布 - `.github/instructions/code-review.instructions.md` と `principles.instructions.md` を create-only で配置する
- REQ-0013: instructions の --force 無効 - `--force` でも instructions ファイルは上書きしない
- REQ-0014: instructions アクティベーション案内 - instructions 新規作成時にアクティベーションガイダンスを表示する
- REQ-0015: Windows symlink fallback - EPERM 時に Developer Mode 有効化の案内を含むエラーメッセージを表示する

## Entry points

- US range in this spec: US-0003-0001..US-0003-0014
- Primary actors: AI エージェント統合開発者
- Notes: `npx qfai init` でプロジェクトに QFAI ワークスペースを導入する

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.
- Missing: required constraints or policy are unclear.
- Trade-off: performance vs security vs DX must be decided.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
