---
category: specialties
update-frequency: occasional
dependencies: [development-principles-checklist.md, development-principles-metrics.md]
version: 1.0.0
---

# Quality Automation Guide

What to look at when measuring and automating the development principles.

## Priority of Automated Checks

1. Lint/Format: Always pass ESLint and Prettier.
2. Types: Catch type breakage before the build with `pnpm check-types`.
3. Tests: Run unit, integration and E2E tests as separate CI steps, and on failure stop until the cause is identified.
4. Metrics: Watch changes in coverage, performance and bundle size.

## Operation

- Turn a problem caught by automation into a ticket, and leave a measure to prevent recurrence (a rule or an example).
- For long-running jobs, consider caching or incremental execution.
