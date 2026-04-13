# 07 Decisions

1 items.

### DR-0015-0001: TDD Ledger Backfill from Migrated Coverage (v1.7.15)

- Decision: TDD-0001..0011 のテストは既存実装 (v1.7.x) に対する backfill として Exception パターンで確定する
- Context: test-list.md は 06_Test-Cases.md から auto-generate された skeleton ledger で、Test file=TBD/Selector=migrated のまま放置されていた
- Rationale: agent delegation framework は agent-catalog.yml, agent-routing.yml, review-profiles.yml, review-gate.rules.yml, agentDefinition validator, reviewGate validator で実装済み。one-shot GREEN で exception に確定する
