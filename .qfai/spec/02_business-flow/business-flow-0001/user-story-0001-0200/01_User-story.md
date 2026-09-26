# US-0001-0200: Run only on a host that can carry the run

## User Story

- Goal: As an operator, a run starts only on a host that can fetch a skill, delegate to a real sub-agent, relay a question and run the tests. A host that cannot is told so at once, instead of failing halfway.
- Non-goals: Gating runtime on the release's support claim; automation on Copilot.
- Notes: discussion-20260923171450572#DUS-009,
  discussion-20260923171450572#REQ-0058,
  discussion-20260923171450572#REQ-0059. Installing the skills and their host links is US-0001-0203's.

## Source Provenance

- Story block: `.qfai/evidence/migration-spec-to-story/retired/main-sync-20260926/spec-0018/02_User-stories.md#us-0018-0009`, which `main` added as US-0018-0009 of its spec-0018. `decisions.md#DEC-0744` records the carry, and `.qfai/evidence/migration-spec-to-story/main-sync-20260926-spec-0018-id-map.csv` maps every item.
