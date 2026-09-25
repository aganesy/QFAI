# US-0001-0207: Implement as a stage of a run

## User Story

- Goal: As an operator who asked for a feature once, I want `/qfai-implement`
  to take its work order from the run, work only the examples of the flow the
  order binds and resume where a long stage stopped, so that the run reaches
  verification without my choosing the flow or typing a stage.
- Non-goals: deciding the plan; adding an example; judging whether the run is
  complete.
- Notes: discussion-20260923171450572#DUS-001 (its implement side, with the
  seam-only work order the acceptance stage asks for),
  discussion-20260923171450572#REQ-0013,
  discussion-20260923171450572#REQ-0034,
  discussion-20260923171450572#REQ-0038,
  discussion-20260923171450572#REQ-0051,
  discussion-20260923171450572#REQ-0052,
  discussion-20260923171450572#REQ-0056.

## Source Provenance

- Story block: US-0011-0009, which `main` added to spec-0011 (archived pre-merge
  pack at `.qfai/evidence/migration-spec-to-story/retired/spec-0011/`; main's
  text at `b5d357c14:.qfai/specs/spec-0011/02_User-stories.md`).
  `decisions.md#DEC-0745` records the carry.
