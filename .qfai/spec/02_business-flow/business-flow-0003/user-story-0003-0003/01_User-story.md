# US-0003-0003: パス解決診断

## User Story

- Parent: CAP-0006
- Goal: 設定ファイル内の各パス（testsDir, outDir 等）が実際に解決可能かチェック
- Non-goals: パスの自動修正

## Legacy Source Scope

- In: doctor コマンドの全機能（設定チェック、ディレクトリチェック、パス解決チェック、レガシー警告、--format text|json、--fail-on、--out）
- Out: validate/init/report/guardrails

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0006/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0006/02_User-stories.md#us-0006-0003`
