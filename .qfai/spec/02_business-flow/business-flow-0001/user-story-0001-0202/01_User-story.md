# US-0001-0202: A stage skill picked up by free text hands over

## User Story

- Goal: As an operator, I want a stage skill that the host picks for a
  free-text request to pass the request to `qfai-run` instead of starting work,
  while a stage I invoke by name still runs on its own and ends at that stage,
  so that nothing is edited outside a run and the direct `/qfai-*` path keeps
  working.
- Non-goals: the entry skill `qfai-run` and the workflow control core
  (`.qfai/spec/03_contract/cli/qfai-workflow.md`); what `qfai init` installs;
  the Operations table each skill's own `references/orchestrated-mode.md`
  declares.
- Notes: discussion-20260923171450572#DUS-008,
  discussion-20260923171450572#REQ-0050,
  discussion-20260923171450572#REQ-0051,
  discussion-20260923171450572#REQ-0052,
  discussion-20260923171450572#REQ-0053,
  discussion-20260923171450572#NFR-0007. The set of skills this story governs
  is every skill a built-in plan names, read from
  `.qfai/spec/03_contract/cli/workflow-files.md#vocabulary`, never typed as a
  list.

## Source Provenance

- Story block: spec-0001 US-0001-0010, which `main` added to spec-0001 (archived
  pre-merge pack at `.qfai/evidence/migration-spec-to-story/retired/spec-0001/`;
  main's text at `b5d357c14:.qfai/specs/spec-0001/02_User-stories.md`).
  `decisions.md#DEC-0745` records the carry.
