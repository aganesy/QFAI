# US-0001-0194: Repair a defective test with example coverage untouched

## User Story

- Goal: As an operator, a bug report whose cause is a broken test is fixed at the test, and no example of the bound flow changes whether a test annotates it, because the obligation it states has not changed.
- Non-goals: A test edit that changes what the expectation means; a fix accepted with no independent review or re-run.
- Notes: discussion-20260923171450572#DUS-003,
  discussion-20260923171450572#REQ-0040,
  discussion-20260923171450572#REQ-0047. The run side. The owner that makes the fix is US-0001-0205's or US-0001-0210's.

## Source Provenance

- Story block: `.qfai/evidence/migration-spec-to-story/retired/main-sync-20260926/spec-0018/02_User-stories.md#us-0018-0003`, which `main` added as US-0018-0003 of its spec-0018. `decisions.md#DEC-0744` records the carry, and `.qfai/evidence/migration-spec-to-story/main-sync-20260926-spec-0018-id-map.csv` maps every item.
