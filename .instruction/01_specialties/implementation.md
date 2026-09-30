---
category: specialties
update-frequency: occasional
dependencies: [00_universal/thinking.md, 00_universal/quality.md]
version: 1.0.0
---

# Implementation Guide

Common rules for writing code safely.

## Basics

- Confirm the purpose and completion criteria at the start, and decide the test strategy along with them.
- Reuse existing types, utilities and patterns first.
- Split changes into small pieces, and test at each stage.

## Code Style

- Enforce type safety and avoid `any`. Validate inputs with a schema.
- Separate the normal and error flows, and keep nesting shallow with early returns.
- Keep logs specific and minimal. Include no secrets.

## Testing

- Add or update tests close to the places where behaviour changes.
- Write a reproduction test before fixing, and confirm that it passes afterwards.
- If a test cannot be run, state the reason and an alternative way to confirm.

## Documentation

- Include the reason for the change, its impact and the test results in the PR or report.
- If the existing README or design documents need additions, remember to update them.
