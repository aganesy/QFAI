# 01 Spec

- Spec: spec-0001
- Parent: CAP-0001

## Consumer View

- Primary SSOT for execution: `spec-0001/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: init コマンドの全機能（ディレクトリ生成、設定ファイル生成、ラッパー生成、--force、--dry-run、レガシー退避）
- Out: validate/report/doctor/guardrails/prototyping

## Applicable NFR

- NFR-0012: 冪等性 - 同一入力に対して同一出力を保証
- NFR-0040: エラーメッセージ品質 - 各 Issue に code, message, suggested_action
- NFR-0042: CLI ヘルプ - 各コマンドに `--help` で使用方法表示

## Applicable Policy

- Policy: \_policies/01_Objective.md, \_policies/07_Constraints.md

## Evidence Summary

- Evidence: init コマンド実行結果のディレクトリ構造スナップショット

## Relevant Requirements

- REQ-0001: プロジェクト初期化 - `qfai init` で `.qfai/` ディレクトリ構造、設定ファイル、ラッパーを生成する
- REQ-0002: 初期化の冪等性 - 2回目以降の `qfai init` は既存ファイルをスキップし、新規ファイルのみ追加する
- REQ-0003: 強制更新 - `qfai init --force` でスキルファイルを最新版に上書き更新する（skills.local/ は保護）
- REQ-0004: ドライラン - `qfai init --dry-run` で変更内容をプレビューし、実際のファイル操作を行わない
- REQ-0005: マルチツールラッパー生成 - Claude Code, GitHub Copilot, Codex, Anthropic Agents 用のラッパーファイルを生成する
- REQ-0006: レガシーファイル退避 - 非推奨ファイル（10_workflow.md 等）の検出・退避を行う

## Entry points

- US range in this spec: US-0001-0001..US-0001-0006
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
