# 01 Spec

- Spec: spec-0005
- Parent: CAP-0005

## Consumer View

- Primary SSOT for execution: `spec-0005/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: guardrails コマンドの全機能（list, extract, check）
- Out: validate/init/report/doctor/prototyping

## Applicable NFR

- NFR-0040: エラーメッセージ品質 - 各 Issue に code, message, suggested_action
- NFR-0042: CLI ヘルプ - 各コマンドに `--help` で使用方法表示

## Applicable Policy

- Policy: なし（ガードレール固有のポリシーは未定義）

## Evidence Summary

- Evidence: ガードレール一覧出力、抽出結果出力、整合性チェック結果出力

## Relevant Requirements

- REQ-0040: ガードレール抽出 - `qfai guardrails` で list/extract/check 操作を提供する

## Entry points

- US range in this spec: US-0005-0001..US-0005-0003
- Primary actors: AI エージェント、QA エンジニア
- Notes: スペック作成・修正時のドリフト防止を目的としたガードレール管理機能

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.
- Missing: required constraints or policy are unclear.
- Trade-off: performance vs security vs DX must be decided.

### Escalation Targets (Read-only, decision basis)

- specs/\_policies/01_Objective.md
- specs/\_policies/02_Initiative.md
- specs/\_policies/07_Constraints.md
- specs/\_policies/08_Decisions.md
