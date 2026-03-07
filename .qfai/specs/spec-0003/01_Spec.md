# 01 Spec

- Spec: spec-0003
- Parent: CAP-0003

## Consumer View

- Primary SSOT for execution: `spec-0003/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: report コマンドの全機能（--format md|json、--base-url、--run-validate、validate.json 入力）
- Out: validate/init/doctor/guardrails/prototyping

## Applicable NFR

- NFR-0040: エラーメッセージ品質 - 各 Issue に code, message, suggested_action
- NFR-0042: CLI ヘルプ - 各コマンドに `--help` で使用方法表示
- NFR-0012: 冪等性 - 同一入力に対して同一出力を保証

## Applicable Policy

- Policy: _policies/01_Objective.md, _policies/07_Constraints.md

## Evidence Summary

- Evidence: report コマンド実行結果のレポート出力スナップショット（Markdown / JSON）

## Relevant Requirements

- REQ-0020: レポート生成（Markdown） - `qfai report --format md` でエグゼクティブサマリー、イシュー一覧、トレーサビリティマトリックスを出力
- REQ-0021: レポート生成（JSON） - `qfai report --format json` で構造化レポートデータを出力する
- REQ-0022: リポジトリリンク付与 - `qfai report --base-url` でファイルパスにリポジトリ URL リンクを付与する
- REQ-0023: 内部バリデーション実行 - `qfai report --run-validate` でレポート生成前にバリデーションを内部実行する

## Entry points

- US range in this spec: US-0003-0001..US-0003-0004
- Primary actors: プロジェクトリード
- Notes: `qfai report` でバリデーション結果を人間可読な形式で出力する

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
