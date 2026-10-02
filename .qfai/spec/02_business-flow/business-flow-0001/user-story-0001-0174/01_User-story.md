# US-0001-0174: Cross-skill documentation realignment to implementation

## User Story

As a QFAI maintainer, I want every `references/*.md` and each affected SKILL.md rewritten to match the chosen implementation in the same atomic change that lands it, with `qfai validate --report` reporting every stale reference left at HEAD as a warning, so that cross-skill documentation does not drift from the shipped behavior.
