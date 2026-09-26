# 07 Decisions

1 items.

## Decisions

### DR-0009-0001: TDD Ledger Backfill from Migrated Coverage (v1.7.15)

- Decision: TDD-0001..0008 のテストは既存実装 (v1.7.x) に対する backfill として Exception パターンで確定する
- Context: test-list.md は 06_Test-Cases.md から auto-generate された skeleton ledger で、Test file=TBD/Selector=migrated のまま放置されていた
- Rationale: 対応する実装は既に production で稼働・テスト済み。config.ts の testFileGlobs/testFileExcludeGlobs と SKILL.md テンプレートが全 TC 要件をカバー。TDD strict cycle を今から回すのは ceremonial。one-shot GREEN で実装の正当性を再確認し exception に確定する
