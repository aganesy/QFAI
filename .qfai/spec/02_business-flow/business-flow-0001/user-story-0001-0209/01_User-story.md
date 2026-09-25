# US-0001-0209: Fix a regression an existing correct test catches, leaving the covered example covered

## User Story

- Goal: As an operator whose correct, existing test for an example now fails, I
  want `/qfai-implement` to fix the production code against that example, so
  that the example stays covered and nothing claims its obligation changed.
- Non-goals: rewriting the test; filing a change request; adding an example.
- Notes: discussion-20260923171450572#REQ-0045,
  discussion-20260923171450572#REQ-0046. The discussion pack has no story for
  this branch, so the source is its requirement.

## Source Provenance

- Story block: US-0011-0011, which `main` added to spec-0011 (archived pre-merge
  pack at `.qfai/evidence/migration-spec-to-story/retired/spec-0011/`; main's
  text at `b5d357c14:.qfai/specs/spec-0011/02_User-stories.md`).
  `decisions.md#DEC-0745` records the carry.
