# US-0001-0205: Fix a defective acceptance test with example coverage untouched

## User Story

- Goal: As an operator whose bug report traces to a broken E2E, API or
  integration test, I want `/qfai-atdd` to fix that test while it keeps checking
  the same BF or AC, so that the tree still says what the obligation is and
  nothing claims it changed.
- Non-goals: fixing a test that checks an EX, which `/qfai-implement` does;
  changing what the test expects.
- Notes: discussion-20260923171450572#DUS-003 (its acceptance-layer half),
  discussion-20260923171450572#REQ-0048.

## Source Provenance

- Story block: US-0008-0010, which `main` added to spec-0008 (archived pre-merge
  pack at `.qfai/evidence/migration-spec-to-story/retired/spec-0008/`; main's
  text at `b5d357c14:.qfai/specs/spec-0008/02_User-stories.md`).
  `decisions.md#DEC-0745` records the carry.
