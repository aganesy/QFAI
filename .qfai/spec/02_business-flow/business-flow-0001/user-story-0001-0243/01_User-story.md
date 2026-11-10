# US-0001-0243: Every shipped checker script has a caller

## User Story

As a maintainer of the package, I want a test that fails when a shipped checker script is run by no shipped step, skill, rule or workflow, so that no checker ships beside a procedure that never runs it.

## Non-goals

- Checking that a caller's command line runs successfully.
