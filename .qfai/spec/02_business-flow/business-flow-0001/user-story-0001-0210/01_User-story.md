# US-0001-0210: Fix a defective example test with example coverage untouched

## User Story

- Goal: As an operator whose bug report traces to a broken test that checks an
  example, I want `/qfai-implement` to fix that test while it keeps checking the
  same EX, so that the tree still says what the obligation is.
- Non-goals: fixing a test that checks a BF or an AC, which `/qfai-atdd` does;
  changing what the test expects.
- Notes: discussion-20260923171450572#DUS-003 (its example-level half),
  discussion-20260923171450572#REQ-0048.

## Source Provenance

- Story block: US-0011-0012, which `main` added to spec-0011 (archived pre-merge
  pack at `.qfai/evidence/migration-spec-to-story/retired/spec-0011/`; main's
  text at `origin/main:.qfai/specs/spec-0011/02_User-stories.md`).
  `decisions.md#DEC-0745` records the carry.
