# US-0001-0204: Author acceptance tests as a stage of a run

## User Story

- Goal: As an operator who asked for a feature once, I want `/qfai-atdd` to
  take its acceptance work order from the run, write the acceptance tests for
  the flow the run binds and report RED honestly, so that the run moves on to
  implementation without my typing a stage.
- Non-goals: deciding the plan; the seam-only work order itself, which
  `/qfai-implement` serves; judging whether the run is complete.
- Notes: discussion-20260923171450572#DUS-001 (its acceptance side),
  discussion-20260923171450572#REQ-0035,
  discussion-20260923171450572#REQ-0037,
  discussion-20260923171450572#REQ-0038,
  discussion-20260923171450572#REQ-0051,
  discussion-20260923171450572#REQ-0052,
  discussion-20260923171450572#REQ-0056. The seam-only round trip belongs here
  because it starts and ends inside the acceptance stage.

## Source Provenance

- Story block: US-0008-0009, which `main` added to spec-0008 (archived pre-merge
  pack at `.qfai/evidence/migration-spec-to-story/retired/spec-0008/`; main's
  text at `b5d357c14:.qfai/specs/spec-0008/02_User-stories.md`).
  `decisions.md#DEC-0745` records the carry.
