# US-0003-0002: ディレクトリ構造診断

## User Story

- Parent: CAP-0006
- Goal: `qfai doctor` checks that the directories the configuration names exist, resolving each from its `paths.*` key in `qfai.config.yaml` — `paths.specsDir`, `paths.contractsDir` and `paths.discussionDir` among them
- Non-goals: ディレクトリの自動作成

## Legacy Source Scope

- In: doctor コマンドの全機能（設定チェック、ディレクトリチェック、パス解決チェック、レガシー警告、--format text|json、--fail-on、--out）
- Out: validate/init/report/guardrails

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0006/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0006/02_User-stories.md#us-0006-0002`
