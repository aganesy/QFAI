# 02 User Stories

## US Catalog

- US-0009-0001: Repository Analysis
- US-0009-0002: Config Glob Tuning
- US-0009-0003: Steering Population
- US-0009-0004: Evidence Sampling Confirmation
- US-0009-0005: Tool Selection Documentation

## US-0009-0001: Repository Analysis

As a QFAI user, I want the configure skill to analyze my repository's test frameworks and locations, so that traceability globs are accurate from the start.

## US-0009-0002: Config Glob Tuning

As a QFAI user, I want `qfai.config.yaml` updated with precise testFileGlobs and exclude globs, so that `qfai validate` can trace tests without false positives or misses.

On the story tree, I also want `paths.specsDir: .qfai/spec` written when my config has no such key. With the `rule/ skill/ agent/ prompt/` assistant tree, I want the per-skill agent assignments and review profiles I ask to change written to `qfai.config.yaml` as overrides, so that my project's settings live in one file and every default I did not change keeps following the package.

## US-0009-0003: Steering Population

As a QFAI user, I want steering files (product.md, tech.md, structure.md, manifest.md) populated with verified repository facts, so that downstream skills have accurate project context.

On the story tree, I want the five files that take that content refreshed instead — `01_policy/objective.md`, `01_policy/initiative.md`, `01_policy/principle.md`, `<paths.contractsDir>/tech.md` and `<paths.contractsDir>/structure.md` — with each fact stated in one of them only, so that no fact is kept in two places.

## US-0009-0004: Evidence Sampling Confirmation

As a QFAI user, I want to see 5-15 sample test files matching the proposed globs, so that I can confirm the configuration is correct before proceeding.

## US-0009-0005: Tool Selection Documentation

As a QFAI user, I want the chosen test tools per layer documented with rationale and a minimum runnable path, so that CI and local development are actionable.
