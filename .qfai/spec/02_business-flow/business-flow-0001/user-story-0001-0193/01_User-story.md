# US-0001-0193: Repair a bug the stories already describe without uncovering an example

## User Story

- Goal: As an operator, I report a defect against behaviour a story already states, and the run repairs it against that story. A missing test is written against the example that states the case, or against one example appended under the existing criterion when none does, and a regression an existing test catches is fixed in production code.
- Non-goals: An example that loses its annotating test; a change to a criterion or a rule statement for a change that did not happen.
- Notes: discussion-20260923171450572#DUS-002,
  discussion-20260923171450572#REQ-0005,
  discussion-20260923171450572#REQ-0006,
  discussion-20260923171450572#REQ-0034,
  discussion-20260923171450572#REQ-0039,
  discussion-20260923171450572#REQ-0046,
  discussion-20260923171450572#REQ-0047. The run side: which branch a diagnosis selects and what `accept` refuses. The diagnose-only operation and the production fix are US-0001-0208's and US-0001-0209's, and defect example seeding is US-0001-0213's.

## Source Provenance

- Story block: `.qfai/evidence/migration-spec-to-story/retired/main-sync-20260926/spec-0018/02_User-stories.md#us-0018-0002`, which `main` added as US-0018-0002 of its spec-0018. `decisions.md#DEC-0744` records the carry, and `.qfai/evidence/migration-spec-to-story/main-sync-20260926-spec-0018-id-map.csv` maps every item.
