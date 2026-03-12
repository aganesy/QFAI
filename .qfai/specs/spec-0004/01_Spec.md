# 01 Spec

- Spec: spec-0004
- Parent: CAP-0004

## Consumer View

- Primary SSOT for execution: `spec-0004/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: doctor コマンドの全機能（設定チェック、ディレクトリチェック、パス解決チェック、レガシー警告、--format json、--fail-on）
- Out: validate/init/report/guardrails/prototyping

## Applicable NFR

- NFR-0040: エラーメッセージ品質 - 各 Issue に code, message, suggested_action
- NFR-0041: 日本語サポート - doctor コマンドの日本語メッセージ対応
- NFR-0042: CLI ヘルプ - 各コマンドに `--help` で使用方法表示

## Applicable Policy

- Policy: \_policies/01_Objective.md, \_policies/07_Constraints.md

## Evidence Summary

- Evidence: doctor コマンド実行結果の診断出力スナップショット（テキスト / JSON）

## Relevant Requirements

- REQ-0030: 診断ツール - `qfai doctor` で設定ファイル、ディレクトリ構造、パス解決の診断を実行する
- REQ-0031: 診断 JSON 出力 - `qfai doctor --format json` で機械可読な診断結果を出力する

## Entry points

- US range in this spec: US-0004-0001..US-0004-0005
- Primary actors: 開発者
- Notes: `qfai doctor` で設定・構造の診断を実行し、バリデーション前に問題を特定・修正する

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
