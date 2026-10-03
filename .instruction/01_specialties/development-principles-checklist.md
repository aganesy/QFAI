---
category: specialties
update-frequency: occasional
dependencies: [00_universal/quality.md, implementation.md]
version: 1.0.0
---

# Development Principles Checklist (Detailed)

A supplementary checklist for examining SOLID / KISS / YAGNI / DRY in detail.

## Basic Guides

- Quality standards: [../00_universal/quality.md](../00_universal/quality.md)
- Implementation guidelines: [./implementation.md](./implementation.md)
- Project patterns: [../02_project/patterns.md](../02_project/patterns.md)

## Checkpoints

- Is the responsibility single, and can the intent be read from the names and the tests?
- Is the structure easy to extend (can it be adapted through configuration or swapping dependencies)?
- Are interfaces small, without forcing implementers to provide methods they do not need?
- Has duplicated logic been shared? Is there room to turn it into a utility?
- Are the places where the specification may change protected by tests?

## Metrics

- For measurement details, see [development-principles-metrics.md](./development-principles-metrics.md).
