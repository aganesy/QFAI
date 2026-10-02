# US-0001-0175: Reviewer-Gate ingests workflow-hygiene and shipped-shape drift

## User Story

As a reviewer, I want the Reviewer Gate to ingest the two drift findings the workflow-hygiene lane emits, so that a hygiene or shipped-shape regression is surfaced in review rather than only in a CI log.

## Non-goals

- Authoring the workflow-hygiene lane itself.
- The shipped-file rules the lane checks.
- Any change to `qfai validate`'s own check set.
