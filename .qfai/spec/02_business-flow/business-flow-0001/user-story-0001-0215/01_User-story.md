# US-0001-0215: Verify as the final stage of a run

## User Story

- Goal: As an operator who asked for a feature once, I want `/qfai-verify` to
  run the final gates as a stage of the run and send each finding to the stage
  that owns it, so that completion rests on this run's own verdict and no stage
  patches what another stage owns.
- Non-goals: deciding whether the run is complete, which `finish` does; copying
  the report under the run, which the workflow core does; repairing a story, a
  contract, a test or production code.
- Notes: discussion-20260923171450572#DUS-001 (its verify side),
  discussion-20260923171450572#REQ-0035,
  discussion-20260923171450572#REQ-0039,
  discussion-20260923171450572#REQ-0051,
  discussion-20260923171450572#REQ-0052,
  discussion-20260923171450572#REQ-0060,
  discussion-20260923171450572#REQ-0063. `verify.json` keeps its path, fields
  and values.

## Source Provenance

- Story block: US-0014-0021, which `main` added to spec-0014 (archived pre-merge
  pack at `.qfai/evidence/migration-spec-to-story/retired/spec-0014/`; main's
  text at `origin/main:.qfai/specs/spec-0014/02_User-stories.md`).
  `decisions.md#DEC-0745` records the carry.
