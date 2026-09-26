# US-0003-0004: レガシー警告

## User Story

- Parent: CAP-0006
- Goal: レガシーファイルレイアウト（旧バージョンの残存物）を検出して警告する
- Non-goals: レガシーファイルの自動マイグレーション

## Legacy Source Scope

- In: doctor コマンドの全機能（設定チェック、ディレクトリチェック、パス解決チェック、レガシー警告、--format text|json、--fail-on、--out）
- Out: validate/init/report/guardrails

## Source Provenance

- Spec scope: the Scope section of retired spec-0006
- Story block: `us-0006-0004` of retired spec-0006
