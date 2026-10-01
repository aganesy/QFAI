# US-0002-0018: A workflow-hygiene lint lane that pull requests actually run

## User Story

As a maintainer, I want a repository script run from the lint aggregate that pull requests execute to assert the hygiene rule set over `.github/workflows/**` and the shipped workflows tree, list the rules it checked and exit non-zero naming the offending file, job and rule, so that the hardening properties are a gate rather than a habit.

## Non-goals

- Adopting an external workflow linter and its pinned toolchain.
- Placing the lane in the release-only gate aggregate, which no pull request runs.
- Asserting the shipped third-party action count as zero, which would fail on the one action the shipped pin policy keeps.
- Authoring or hardening the shipped workflow files themselves, which belong to the init capability.
