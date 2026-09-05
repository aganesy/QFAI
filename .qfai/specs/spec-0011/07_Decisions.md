# 07 Decisions

1 items.

## Decisions

### DR-0011-0001: TDD Ledger Backfill from Migrated Coverage (v1.7.15)

- Decision: TDD-0001..0008 のテストは既存実装 (v1.7.x) に対する backfill として Exception パターンで確定する
- Context: test-list.md は 06_Test-Cases.md から auto-generate された skeleton ledger で、Test file=TBD/Selector=migrated のまま放置されていた
- Rationale: TC-0011-0001..0008 は skillRoster.test.ts, completionContract.test.ts, evidenceContract.test.ts, parallelDispatch.test.ts, uixDetection.test.ts で既にカバー済み。SKILL.md テンプレートの構造検証で正当性を追加確認。one-shot GREEN で exception に確定する
