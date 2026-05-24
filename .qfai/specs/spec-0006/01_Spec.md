# 01 Spec

- Spec: spec-0006
- Parent: CAP-0006
- Status: active
- Consolidates: old spec-0004

## Consumer View

- Primary SSOT for execution: `spec-0006/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: doctor コマンドの全機能（設定チェック、ディレクトリチェック、パス解決チェック、レガシー警告、--format text|json、--fail-on、--out）
- Out: validate/init/report/guardrails

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
- REQ-0032: --fail-on 制御 - `--fail-on warning|error` で終了コードを制御する
- REQ-0033: --out ファイル出力 - `--out <path>` で診断結果をファイルに出力する
- REQ-0034: root 自動探索 - --root 未指定時は startDir から qfai.config.yaml を自動探索する
- REQ-0107: playwright probe primary - `qfai doctor --profile prototyping` は `node_modules/.bin/playwright` (Windows では `.cmd`/`.bat`/`.ps1` variants) を primary 候補として probe する。`npx --no-install playwright --version` は fallback。`playwright-cli` (`.cmd`/`.bat` variants 含む) は deprecation window 中 accepted で `D-DEPRECATED-PROBE` (severity: warning during window, error at sunset `1.10.0`) を surface する。失敗時 error text は install hint `npm i -D playwright` を含むこと。
- REQ-0122: `skills.integrity` severity downgrade - `qfai doctor` は `skills.integrity` 既定 severity を `warning` にする (`error` ではない)。doctor summary は findings を "errors blocking the active profile" と "warnings advisory of drift" の 2 group に分けて表示し、`skills.integrity` は message 文言にかかわらず後者に属する。

## Entry points

- US range in this spec: US-0006-0001..US-0006-0007
- Primary actors: 開発者
- Notes: `qfai doctor` で設定・構造の診断を実行し、バリデーション前に問題を特定・修正する

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
