# 07 Decisions

## Decisions

1 item.

### DR-0005-0001: validate.json 不在時の exit code

- validate.json が存在しない場合は exit 2（バリデーション失敗の exit 1 と区別）
- Why: ユーザーが "validate を先に実行する必要がある" ことを明確に区別するため

### DR-0005-0002: TDD Ledger Backfill from Migrated Coverage (v1.7.15)

- Decision: TDD-0001..0009 のテストは既存実装 (v1.7.x) に対する backfill として Exception パターンで確定する
- Context: test-list.md は 06_Test-Cases.md から auto-generate された skeleton ledger で、Test file=TBD/Selector=migrated のまま放置されていた
- Rationale: report コマンドは tests/cli/report.test.ts と tests/core/report.test.ts で既に広範にカバー済み。report.ts モジュールの構造検証で正当性を追加確認。one-shot GREEN で exception に確定する
