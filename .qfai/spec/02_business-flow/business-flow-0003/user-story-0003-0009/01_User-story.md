# US-0003-0009: doctor --autoremediate mode

## User Story

- Parent: CAP-0006
- Goal: `qfai doctor --autoremediate` が safe な範囲で detect AND fix する: (a) active skill manifest の `runtimeDependencies` (CLI-MANIFEST / REQ-0159) に対する `npm install`、(b) `--clean` TTL-archive (REQ-0153 / US-0003-0008)、(c) `qfai.config.yaml` に欠落した default-keyed フィールドの書き込み。既定で interactive `--yes` 確認が必須、`--yes` flag で確認 skip、`--dry-run` は副作用なしで preview。CI 環境では `--autoremediate=off` を既定とし "autoremediate disabled in CI" line を明示出力する。
- Non-goals: 非 default-keyed フィールドの書き換え、user-authored config 値の上書き、CI での暗黙 install

## Legacy Source Scope

- In: doctor コマンドの全機能（設定チェック、ディレクトリチェック、パス解決チェック、レガシー警告、--format text|json、--fail-on、--out）
- Out: validate/init/report/guardrails

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0006/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0006/02_User-stories.md#us-0006-0009`
