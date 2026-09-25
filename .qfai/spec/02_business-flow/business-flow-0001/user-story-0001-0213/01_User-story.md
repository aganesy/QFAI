# US-0001-0213: Seed a diagnosed missing example under an existing criterion

## User Story

- Goal: As an operator fixing a bug the stories already describe in general but
  no example states, I want the case the diagnosis found to be added as one
  example under the criterion it matched, cited by the rule that enforces that
  criterion's examples, so that the defect is fixed against the existing
  specification without changing a criterion or a rule statement.
- Non-goals: changing a story, a criterion or a rule statement; seeding when an
  example already states the case, which needs no SDD stage; writing the test,
  which a later stage does.
- Notes: discussion-20260923171450572#DUS-002 and #REQ-0047. The Change request
  row every SDD-kind stage of a run appends is stated in US-0001-0214.

## Source Provenance

- Story block: US-0013-0016, which `main` added to spec-0013 (archived pre-merge
  pack at `.qfai/evidence/migration-spec-to-story/retired/spec-0013/`; main's
  text at `origin/main:.qfai/specs/spec-0013/02_User-stories.md`).
  `decisions.md#DEC-0745` records the carry.
