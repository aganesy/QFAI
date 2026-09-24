# US-0003-0005: JSON 診断出力

## User Story

- Parent: CAP-0006
- Goal: `--format json` で machine-readable な診断結果を出力する。`--out` でファイル出力も可能
- Non-goals: カスタム出力スキーマ

## Legacy Source Scope

- In: doctor コマンドの全機能（設定チェック、ディレクトリチェック、パス解決チェック、レガシー警告、--format text|json、--fail-on、--out）
- Out: validate/init/report/guardrails

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0006/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0006/02_User-stories.md#us-0006-0005`
