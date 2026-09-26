# US-0003-0001: 設定ファイル診断

## User Story

- Parent: CAP-0006
- Goal: `qfai doctor` で qfai.config.yaml の存在と妥当性（必須フィールド、型、値の範囲）をチェックし、結果を表示する
- Non-goals: 設定ファイルの自動修正

## Legacy Source Scope

- In: doctor コマンドの全機能（設定チェック、ディレクトリチェック、パス解決チェック、レガシー警告、--format text|json、--fail-on、--out）
- Out: validate/init/report/guardrails

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0006/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0006/02_User-stories.md#us-0006-0001`
