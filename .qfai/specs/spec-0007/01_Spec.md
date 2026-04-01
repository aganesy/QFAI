# 01 Spec

- Spec: spec-0007
- Parent: CAP-0007
- Consolidates: old spec-0005

## Consumer View

- Primary SSOT for execution: `spec-0007/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: guardrails コマンドの全機能（list, extract, check）
- Out: validate/init/report/doctor

## Applicable NFR

- NFR-0040: エラーメッセージ品質 - 各 Issue に code, message, suggested_action
- NFR-0042: CLI ヘルプ - 各コマンドに `--help` で使用方法表示

## Applicable Policy

- Policy: なし（ガードレール固有のポリシーは未定義）

## Evidence Summary

- Evidence: ガードレール一覧出力、抽出結果出力、整合性チェック結果出力

## Relevant Requirements

- REQ-0040: ガードレール一覧 - `qfai guardrails list` で全ガードレールを一覧表示する
- REQ-0041: ガードレール抽出 - `qfai guardrails extract --keyword <keyword>` でキーワードフィルタリング
- REQ-0042: ガードレール整合性チェック - `qfai guardrails check` で成果物との整合性チェック
- REQ-0043: extract --max 制限 - `--max` でガードレール抽出の上限を制御する（デフォルト 20）
- REQ-0044: 複数パス指定 - `--paths` で検索対象パスを複数指定できる

## Entry points

- US range in this spec: US-0007-0001..US-0007-0003
- Primary actors: AI エージェント、QA エンジニア
- Notes: スペック作成・修正時のドリフト防止を目的としたガードレール管理機能

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
