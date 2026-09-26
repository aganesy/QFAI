# US-0003-0012: Doctor failure threshold

## User Story

- Parent: CAP-0006
- Goal: As an operator, I can choose `qfai doctor --fail-on error` or `--fail-on warning` and receive an exit status that reflects that threshold, so advisory findings do not unexpectedly fail an error-only check.
- Non-goals: Changing any check's severity or silently treating an unreadable configuration as a passing diagnostic.

## Legacy Source Scope

- In: doctor コマンドの全機能（設定チェック、ディレクトリチェック、パス解決チェック、レガシー警告、--format text|json、--fail-on、--out）
- Out: validate/init/report/guardrails

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0006/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0006/02_User-stories.md#us-0006-0012`
