# Relevant Test Suite

## Selection

Start with the test selector that carries the current QFAI:EX annotation. Include the nearest unit, component, or integration tests for the changed production module and the acceptance tests that use a changed contract or fixture. Follow imports and test data consumers rather than selecting only by filename.

Test commands follow the Standard commands rule, `.qfai/assistant/rule/shared-skill-operating-baseline.md#standard-commands-mandatory`.

## Cadence

While implementing, run only the selected example test: at RED, at GREEN, and after refactor. The relevant suite, the other gates and `npx qfai validate` run once, in the verify stage, over the integrated source revision the reviewers receive.

Record command, exit code, summary, and source revision for every run. A prior run remains history; it does not prove a later tree.
