# US-0001-0211: Settle one visual decision as a stage of a run

## User Story

- Goal: As an operator whose change needs a visual decision, I want the
  prototype stage of a run to settle that one decision for the business flow the
  run binds, within the existing root `DESIGN.md` and UI contracts, so that the
  run does not stop for a separate `/qfai-prototyping` invocation.
- Non-goals: when the run dispatches the prototype stage, which the plan
  decides; `qfai prototyping iterate` and `certify`, which a run does not
  change; the shared stage-skill rules every skill follows.
- Notes: discussion-20260923171450572#REQ-0051 and #REQ-0052.

## Source Provenance

- Story block: US-0012-0144, which `main` added to spec-0012 (archived pre-merge
  pack at `.qfai/evidence/migration-spec-to-story/retired/spec-0012/`; main's
  text at `origin/main:.qfai/specs/spec-0012/02_User-stories.md`).
  `decisions.md#DEC-0745` records the carry.
