# Relevant Test Suite

## Selection

Start with the test selector that carries the current QFAI:EX annotation. Include the nearest unit, component, or integration tests for the changed production module and the acceptance tests that use a changed contract or fixture. Follow imports and test data consumers rather than selecting only by filename.

Take Test commands from the Standard commands section of <paths.contractsDir>/tech.md. If the section provides only a whole-project command, use it as written. A narrower command is used only when that section or the test runner's checked-in configuration declares it.

## Cadence

Run the example selector at RED, GREEN, and after refactor. At a flow checkpoint, run the relevant suite and the scoped validation command. Re-run dependent flows after an integrated shared-module change. The final gate uses the integrated source revision that reviewers receive.

Record command, exit code, summary, and source revision for every run. A prior run remains history; it does not prove a later tree.
