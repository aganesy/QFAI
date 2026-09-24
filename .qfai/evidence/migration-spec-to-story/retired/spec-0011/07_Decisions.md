# 07 Decisions

3 items.

## Decisions

### DR-0011-0003: Separate the implementation cycle from its completion gates

- Date: 2026-09-24
- Status: Adopted

The P7 test unit is an unannotated EX, not a ledger status. EX-0011-0001 keeps the test-first RED/GREEN/refactor cycle under AC-0011-0001 and TC-0011-0001. EX-0011-0017 covers independent qa-gatekeeper confirmation under AC-0011-0003/TC-0011-0003; BR-0011-0015 owns this rule. EX-0011-0018 covers reviewer and checkpoint completion under AC-0011-0006/TC-0011-0006. EX-0011-0019 covers current scoped validation and "nothing to do" under AC-0011-0008/TC-0011-0008. The old EX text is preserved in the P7 retired-source archive. BR-0011-0002 and its status transitions remain retired.

### DR-0011-0001: TDD Ledger Backfill from Migrated Coverage (v1.7.15)

- Decision: TDD-0001..0008 のテストは既存実装 (v1.7.x) に対する backfill として Exception パターンで確定する
- Context: test-list.md は 06_Test-Cases.md から auto-generate された skeleton ledger で、Test file=TBD/Selector=migrated のまま放置されていた
- Rationale: TC-0011-0001..0008 are carried by `packages/qfai/tests/integration/implementSkillSpec0011.test.ts`, which is the file the eight ledger rows name and which carries their annotations. Each case reads the shipped `qfai-implement` SKILL.md and holds the rule its test case states. None of them runs the skill, so the rows stay at `exception` rather than `done`.
- Correction: this rationale previously named `skillRoster.test.ts`, `completionContract.test.ts`, `evidenceContract.test.ts`, `parallelDispatch.test.ts` and `uixDetection.test.ts` as the coverage the exception rested on. Those files test the sub-agent roster, the completion and evidence contracts, the dispatch rules and the UI-bearing classification; none of them carries a `TC-0011-0001..0008` annotation, so the exception read as granted on coverage that was not there.

### DR-0011-0002: Prototype handoff follows the current DCON-008 schema

- Decision: P7 retires the exactly-four-fields BR-0011-0007 and its AC-0011-0009, EX-0011-0008, TC-0011-0011, and TDD-0011. The current DCON-008 producer contract includes `imageSources[]` beside the four implementation fields; BR-0012-0033 governs recording its provenance. `/qfai-implement` consumes the fields it needs and does not redefine the producer schema.
- Context: The old fixed field set predates the later image-source provenance requirement recorded by spec-0012 and the prototyping contract. The obsolete `mustPreserve`/`mayAdapt`/`mustNotCopy` triplet remains removed.
- Rationale: One producer-owned schema avoids contradicting a later, validated field while preserving the implementation handoff's purpose. Historical rows remain in the P7 archive and disposition report.
