# US-0003-0011: Shipped workflow checks

## User Story

As an adopter, I want `qfai doctor` to report a missing document-schema lane, a shipped workflow that differs from the shipped text, the repository facts the shipped workflows rely on, a document-schema checker that does not run, the jobs the shipped workflows start per pull request event and a workflow file that cannot be parsed, so that the shipped CI works in my repository and I can see what it costs.

## Non-goals

- Comparing an installed workflow with the copy in the package.
- Overwriting, refreshing or removing a shipped workflow.
- Adding a finding to `qfai validate`.
