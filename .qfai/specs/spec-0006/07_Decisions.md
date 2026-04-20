# 07 Decisions

## Decisions

1 item.

### DR-0006-0001: --fail-on 未指定時は常に exit 0

- --fail-on が指定されない場合、doctor は常に exit 0 で終了する
- Why: doctor は診断ツールであり、デフォルトでビルドを失敗させるべきではない

### DR-0006-0002: TDD Ledger Backfill from Migrated Coverage (v1.7.15)

- Decision: TDD-0001..0010 のテストは既存実装 (v1.7.x) に対する backfill として Exception パターンで確定する
- Context: test-list.md は 06_Test-Cases.md から auto-generate された skeleton ledger で、Test file=TBD/Selector=migrated のまま放置されていた
- Rationale: doctor コマンドは tests/cli/doctor.test.ts で既に広範にカバー済み。one-shot GREEN で exception に確定する
