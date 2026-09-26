# Principles

## Product / Mission

- Summary: QFAI is a quality gate and workflow toolkit for AI-assisted software development.
- Value: Teams can connect written behavior, contracts, tests, and observed evidence before claiming completion.
- Source: `packages/qfai/package.json` and `.qfai/spec/01_policy/objective.md`.

## Axioms (Non-negotiable)

- Every active obligation has one authoritative home in the story tree or an enforcing contract. A linked document cites that home instead of restating it.
- A validation result proves only the scope and revision it actually checked. A partial profile does not establish repository-wide completion.
- Test annotations require executed behavior and an observable assertion. A placeholder or annotation alone is not coverage.
- Independent reviewers report PASS or REVISE against current evidence. Authors do not certify their own work.
- The package ships its own source and assets; this repository does not install itself as a dependency.
- Decision lens: preserve correctness and traceability before reducing workflow steps or runtime cost.
- Sources: `.qfai/assistant/rule/test-layers.md`, `.qfai/assistant/rule/review-convergence.md`, `.agents/rules/minimal-implementation.md`, and `scripts/check-not-a-dependency.mjs`.

## Compatibility vs Change Rubric

- Compatibility: preserve behavior required by the current contract and user-approved decisions. Keep historical source in the migration archive without treating it as an active fallback.
- Change: a breaking correction is acceptable when the active story tree, shipped assets, CLI, and validators are updated together and the affected gates pass.
- Version: only the user selects a package version; branch pins and release changes follow `.agents/rules/version-discipline.md`.
- Sources: `.qfai/spec/decisions.md`, `.qfai/spec/03_contract/contracts.md`, and `.agents/rules/version-discipline.md`.
