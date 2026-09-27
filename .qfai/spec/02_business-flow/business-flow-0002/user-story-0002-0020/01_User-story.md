# US-0002-0020: Retire the duplicate validate workflow without weakening the required check

## User Story

As a maintainer, I want the repository's own duplicate of the shipped validate workflow deleted and its full-profile run folded into the `build` job that already has a locally built binary, so that exactly one workflow runs on a pull request, one install and one build per pull request disappear, and the run under review exercises the change under review.

## Non-goals

- Repointing the copy at the shipped file, which would resolve to the published package because the root manifest declares no dependency on it.
- Keeping both copies.
- Deleting the copy before an automated gate covers the shipped set.
