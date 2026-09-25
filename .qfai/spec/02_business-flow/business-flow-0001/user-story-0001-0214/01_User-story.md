# US-0001-0214: Run `/qfai-sdd` as a stage of a run

## User Story

- Goal: As the workflow harness, I want `/qfai-sdd` to do exactly the work order
  it is handed, for exactly the target the work order names, and to change the
  story tree only on an answer I gave for that stage; and as the operator I want
  a direct `/qfai-sdd` to end at SDD, so that a run stays inside its scope and
  the expert path keeps working as it does today.
- Non-goals: running every flow when a work order names no target; continuing
  from a direct call into implementation; the check the workflow core makes when
  it accepts the stage's result.
- Notes: discussion-20260923171450572#REQ-0013, #REQ-0051, #REQ-0052, #REQ-0053
  and #REQ-0056.

## Source Provenance

- Story block: US-0013-0017, which `main` added to spec-0013 (archived pre-merge
  pack at `.qfai/evidence/migration-spec-to-story/retired/spec-0013/`; main's
  text at `b5d357c14:.qfai/specs/spec-0013/02_User-stories.md`).
  `decisions.md#DEC-0745` records the carry. The Change request criterion is
  not on `main`: it states the settled decision that a run's SDD stage makes its
  Change request row WIP only by the operator's answer.
