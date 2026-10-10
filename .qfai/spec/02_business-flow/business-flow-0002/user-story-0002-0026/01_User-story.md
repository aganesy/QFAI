# US-0002-0026: Run one pull request test file in manual CI

## User Story

As a QFAI maintainer, I want to run one tracked test file from a chosen Vitest project at a pull request's current head in manual CI, so that I can diagnose that file while the regular checks remain authoritative.

## Non-goals

- Replacing the regular test matrix or its aggregate verdict.
- Adding a required status context, a test layer or a shipped workflow.
- Running local tests or selecting an arbitrary command.
