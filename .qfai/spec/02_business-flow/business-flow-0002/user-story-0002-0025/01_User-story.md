# US-0002-0025: Safe branch catch-up with CI pin resealing

## User Story

As a QFAI maintainer, I want one repository command to merge the remote default branch into my working branch, resolve only proven digest conflicts and changelog conflicts that only add entries under `## [Unreleased]`, and reseal the CI pins, so that catch-up preserves semantic changes and publishes only when I explicitly request a push.

## Non-goals

- A command shipped to adopting projects.
- Automatic resolution of semantic, foreign or membership-changing conflicts, apart from entries both sides added under the changelog's `## [Unreleased]` heading.
- Rebase, force push, reset, merge abort or automatic dependency installation.
- Running builds, tests or CI waits, weakening a gate, or treating new digests as test evidence.
