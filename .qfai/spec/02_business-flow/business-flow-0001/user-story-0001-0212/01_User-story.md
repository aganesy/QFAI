# US-0001-0212: Stage 1 checks a routing-time CREATE approval instead of asking

## User Story

- Goal: As an operator who approved a new story or a new business flow when the
  run was routed, I want `/qfai-sdd` Stage 1 to check that approval rather than
  ask me again, and to stop rather than guess when the approval is missing, does
  not match or has gone stale.
- Non-goals: asking the CREATE question a second time; letting `--auto`, a mode
  or an agent-written value stand in for my answer; the check the workflow core
  makes when it accepts the stage's result.
- Notes: discussion-20260923171450572#DUS-001, #REQ-0042, #REQ-0043 and
  #REQ-0044. A standalone `/qfai-sdd` triages and asks as it does outside a run.

## Source Provenance

- Story block: US-0013-0015, which `main` added to spec-0013 (archived pre-merge
  pack at `.qfai/evidence/migration-spec-to-story/retired/spec-0013/`; main's
  text at `b5d357c14:.qfai/specs/spec-0013/02_User-stories.md`).
  `decisions.md#DEC-0745` records the carry.
