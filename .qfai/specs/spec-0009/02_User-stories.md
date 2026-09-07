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

## US-0009-0003: Steering Population

As a QFAI user, I want steering files (product.md, tech.md, structure.md, manifest.md) populated with verified repository facts, so that downstream skills have accurate project context.

## US-0009-0004: Evidence Sampling Confirmation

As a QFAI user, I want to see 5-15 sample test files matching the proposed globs, so that I can confirm the configuration is correct before proceeding.

## US-0009-0005: Tool Selection Documentation

As a QFAI user, I want the chosen test tools per layer documented with rationale and a minimum runnable path, so that CI and local development are actionable.
