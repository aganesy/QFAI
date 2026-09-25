# 01 Spec

- Spec: spec-0005
- Parent: CAP-0005
- Status: active
- Consolidates: old spec-0003

## Consumer View

- Primary SSOT for execution: `spec-0005/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default
- A clause marked "on the story tree" holds where the project's specification is the story-based tree, as `qfai validate` detects it from `paths.specsDir`. A marked clause beside an unmarked one replaces it there, and the unmarked one holds in the spec-pack layout

## Scope

- In: every feature of the report command (`--format md|json`, `--base-url`, `--run-validate`, `--in`, `--out`, `--phase`, validate.json input, report.md/report.json output, spec-pack report generation), and the prototyping observability section (obligations, screenshot/html evidence, review artifact, validate/verify outcome, compatibility wording). On the story tree, the spec-pack reports become one report per business flow, and `--flow BF-NNNN` scopes a run to named business flows
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
- REQ-0026: spec-pack report generation - `writeSpecPackReports()` also writes a report per spec. On the story tree it writes one report per business flow instead, under `<outDir>/business-flow-NNNN/`
- REQ-0027: phase guard 統合 - --run-validate + --phase refinement の場合に phase guard を適用する
- REQ-0028: Prototyping レポートセクション — report.ts に ## Prototyping セクションを追加。recommendationArtifact status, contract readiness, screenshot/html evidence coverage, review artifact, validate/verify outcome, compatibility wording を含む
- REQ-0029: Report Terminology Canonical 統一 (v1.7.14, DR-0294) — レポートの issue カテゴリセクション名を "Compatibility Issues" → "Canonical Issues" に変更。issuesByCategory のキーも "compatibility" → "canonical" に統一。surface inference が不能な場合は "mixed" にフォールバックし warning を付与
- discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0013: on the story tree the per-spec report becomes a per-flow report (US-0005-0007), and `qfai report --flow BF-NNNN` replaces `--spec` (US-0005-0009)

## Entry points

- US range in this spec: US-0005-0001..US-0005-0009
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
