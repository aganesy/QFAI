# US-0002-0027: Run all package tests in manual Windows CI

## User Story

As a QFAI maintainer, I want to run the existing unfiltered package test command across all Vitest workspace projects on native Windows at a pull request's current head, so that I can inspect whole-suite results and the specific full-flow test's result and duration while the regular CI checks remain authoritative.

## Non-goals

- Replacing the regular test matrix, normal Windows parity or required aggregate verdict.
- Adding a required status context, a test layer or a shipped workflow.
- Selecting arbitrary commands, changing test cases, assertions or timeouts, or running local tests.
- Claiming a historical root cause or general performance result from workflow registration, a subset or one run.
