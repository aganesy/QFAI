# US-0003-0008: stale review-pack TTL archival

## User Story

- Parent: CAP-0006
- Goal: `qfai doctor --clean` が `.qfai/review/<ts>/` の中で TTL (既定 14 日 / DR-0264、`qfai.config.yaml#review.staleTtlDays` で設定可能) を超過した pack を `.qfai/review/_archive/<ts>/` へ move する。archival は NEVER delete; restore は手動 `mv` 戻し。`qfai validate --profile review` は `_archive/` を out-of-scope とし top-level pack のみ scan する。in-scope pack の `QFAI-REVIEW-003/004/005` 挙動は不変。
- Non-goals: pack の自動削除、`_archive/` 内 pack の validate scan、復元 CLI subcommand

## Legacy Source Scope

- In: doctor コマンドの全機能（設定チェック、ディレクトリチェック、パス解決チェック、レガシー警告、--format text|json、--fail-on、--out）
- Out: validate/init/report/guardrails

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0006/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0006/02_User-stories.md#us-0006-0008`
