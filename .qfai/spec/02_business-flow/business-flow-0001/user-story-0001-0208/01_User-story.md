# US-0001-0208: Diagnose a reported defect without changing product code

## User Story

- Goal: As an operator reporting a defect against behaviour the tree already
  states, I want `/qfai-implement` to reproduce it and name its cause without
  changing any code, so that the run picks the right repair from one verdict.
- Non-goals: repairing anything; adding the missing example, which `/qfai-sdd`
  does; choosing the plan branch a verdict leads to.
- Notes: discussion-20260923171450572#DUS-002,
  discussion-20260923171450572#REQ-0045,
  discussion-20260923171450572#REQ-0046.

## Source Provenance

- Story block: US-0011-0010, which `main` added to spec-0011 (archived pre-merge
  pack at `.qfai/evidence/migration-spec-to-story/retired/spec-0011/`; main's
  text at `b5d357c14:.qfai/specs/spec-0011/02_User-stories.md`).
  `decisions.md#DEC-0745` records the carry.
