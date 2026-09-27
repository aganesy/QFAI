# US-0001-0202: A stage skill picked up by free text hands over

## User Story

As an operator, I want a stage skill that the host picks for a free-text request to pass the request to `qfai-run` instead of starting work, while a stage I invoke by name still runs on its own and ends at that stage, so that nothing is edited outside a run and the direct `/qfai-*` path keeps working.

## Non-goals

- The entry skill `qfai-run` and the workflow control core.
- What `qfai init` installs.
- What each step does.
- How a skill that owns steps runs them when invoked by name.
