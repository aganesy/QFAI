---
category: specialties
update-frequency: occasional
dependencies: [00_universal/quality.md]
version: 1.0.0
---

# Testing Guidelines

Basic rules for designing and running tests.

## When a Test Must Be Added

- Always add a reproduction test for a fix that changes behaviour and for any bug fix.
- Also add one to prevent recurrence of an important bug, or when a specification change has a wide impact.

## Test Layers

- **Unit**: Fine-grained logic and validation. Include error cases.
- **Integration**: Behaviour involving external services or a database. Keep contract tests in mind.
- **E2E**: Cover the main user flows at a minimum. Also check authentication and permissions.

This repository's [test directory mapping](../02_project/development.md#test-directory-mapping)
lists the current Vitest projects and QFAI coverage classification.

## Running and Reporting

- Record the command and the result (passed or failed, and a summary of the log on failure).
- If a test cannot be run, state the reason and an alternative.

## Thinking About Coverage

- Write tests first for the important logic and the places most likely to fail.
- Avoid duplicated tests, and keep the upper layers focused on user flows.
