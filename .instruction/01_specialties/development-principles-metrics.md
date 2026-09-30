---
category: specialties
update-frequency: occasional
dependencies: [development-principles-checklist.md, 00_universal/quality.md]
version: 1.0.0
---

# Metrics for the Development Principles

Rules of thumb for looking at quality quantitatively.

## Recommended Metrics

- Tests: Coverage of the main logic, and whether a reproduction test exists for each failure.
- Complexity: Number of branches and lines per function, and the granularity of responsibilities.
- Duplication: How much similar logic, validation and API calls are repeated.
- Performance: Presence of N+1 queries, effective caching and needless full-table fetches.

## Operation

- Observe regularly in CI, and when a metric worsens, record the cause and the countermeasure.
- Even when a number improves, also check that no risk (specification drift, reduced safety) has crept in.
