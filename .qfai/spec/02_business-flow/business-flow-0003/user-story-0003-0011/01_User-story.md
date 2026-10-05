# US-0003-0011: Shipped workflow checks

## User Story

As an adopter, I want `qfai doctor` to report a missing document-schema lane, the repository facts the shipped workflows rely on and a document-schema checker that does not run, so that the shipped CI works in my repository.

## Non-goals

- Comparing an installed workflow with the copy in the package.
- Overwriting, refreshing or removing a shipped workflow.
- Adding a finding to `qfai validate`.
