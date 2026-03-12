# 01 Spec

- Spec: spec-0006
- Parent: CAP-0006

## Consumer View

- Primary SSOT for execution: `spec-0006/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: prototyping コマンドの全機能（--autogen-ui-fidelity, --base-url, UI コントラクト期待値抽出, DOM クローリング, data-qfai マーカー検出, evidence.json 出力, skeleton モード）
- Out: validate/init/report/doctor/guardrails

## Applicable NFR

- NFR-0040: エラーメッセージ品質 - 各 Issue に code, message, suggested_action
- NFR-0042: CLI ヘルプ - 各コマンドに `--help` で使用方法表示
- NFR-0012: 冪等性 - 同一入力に対して同一出力を保証

## Applicable Policy

- Policy: なし（プロトタイピング固有のポリシーは未定義）

## Evidence Summary

- Evidence: `.qfai/evidence/prototyping.json` への UI フィデリティ証跡出力

## Relevant Requirements

- REQ-0050: UI フィデリティ自動生成 - `qfai prototyping --autogen-ui-fidelity` で jsdom による DOM クローリングで UI フィデリティ証跡を生成する
- REQ-0051: UI コントラクト期待値抽出 - `.qfai/contracts/ui/` からの YAML パースで期待ラベル・エレメントを抽出する
- REQ-0052: エレメントマーカー検出 - `data-qfai` 属性によるエレメントマーカーを DOM から検出する

## Entry points

- US range in this spec: US-0006-0001..US-0006-0005
- Primary actors: フロントエンドエンジニア、AI エージェント
- Notes: UI コントラクトとプロトタイプ実装の整合性を自動検証するための機能群

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
