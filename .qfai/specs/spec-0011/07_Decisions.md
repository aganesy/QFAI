# 07 Decisions

1 items.

## Decisions

### DR-0011-0001: TDD Ledger Backfill from Migrated Coverage (v1.7.15)

- Decision: TDD-0001..0008 のテストは既存実装 (v1.7.x) に対する backfill として Exception パターンで確定する
- Context: test-list.md は 06_Test-Cases.md から auto-generate された skeleton ledger で、Test file=TBD/Selector=migrated のまま放置されていた
- Rationale: TC-0011-0001..0008 are carried by `packages/qfai/tests/integration/implementSkillSpec0011.test.ts`, which is the file the eight ledger rows name and which carries their annotations. Each case reads the shipped `qfai-implement` SKILL.md and holds the rule its test case states. None of them runs the skill, so the rows stay at `exception` rather than `done`.
- Correction: this rationale previously named `skillRoster.test.ts`, `completionContract.test.ts`, `evidenceContract.test.ts`, `parallelDispatch.test.ts` and `uixDetection.test.ts` as the coverage the exception rested on. Those files test the sub-agent roster, the completion and evidence contracts, the dispatch rules and the UI-bearing classification; none of them carries a `TC-0011-0001..0008` annotation, so the exception read as granted on coverage that was not there.
