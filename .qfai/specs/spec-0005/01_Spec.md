# 01 Spec

- Spec: spec-0005
- Parent: CAP-0005
- Consolidates: old spec-0003

## Consumer View

- Primary SSOT for execution: `spec-0005/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: report コマンドの全機能（--format md|json、--base-url、--run-validate、--in、--out、--phase、validate.json 入力、report.md/report.json 出力、spec-pack レポート生成）
- Out: validate/init/doctor/guardrails

## Applicable NFR

- NFR-0040: エラーメッセージ品質 - 各 Issue に code, message, suggested_action
- NFR-0042: CLI ヘルプ - 各コマンドに `--help` で使用方法表示
- NFR-0012: 冪等性 - 同一入力に対して同一出力を保証

## Applicable Policy

- Policy: \_policies/01_Objective.md, \_policies/07_Constraints.md

## Evidence Summary

- Evidence: report コマンド実行結果のレポート出力スナップショット（Markdown / JSON）

## Relevant Requirements

- REQ-0020: レポート生成（Markdown） - `qfai report --format md` でエグゼクティブサマリー、イシュー一覧、トレーサビリティマトリックスを含む report.md を生成する
- REQ-0021: レポート生成（JSON） - `qfai report --format json` で構造化レポートデータを含む report.json を生成する
- REQ-0022: リポジトリリンク付与 - `qfai report --base-url` でファイルパスにリポジトリ URL リンクを付与する
- REQ-0023: 内部バリデーション実行 - `qfai report --run-validate` でレポート生成前にバリデーションを内部実行する
- REQ-0024: validate.json 入力 - デフォルトまたは `--in` で指定した validate.json を入力とする
- REQ-0025: 出力パス制御 - `--out` または config.output.outDir で出力先を制御する
- REQ-0026: spec-pack レポート生成 - writeSpecPackReports() で spec 単位のレポートも出力する
- REQ-0027: phase guard 統合 - --run-validate + --phase refinement の場合に phase guard を適用する

## Entry points

- US range in this spec: US-0005-0001..US-0005-0007
- Primary actors: プロジェクトリード
- Notes: `qfai report` でバリデーション結果を読みやすいレポートとして出力する

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
