# Version Discipline

An AI agent never decides which version this project releases. That decision
belongs to the user, and it has to reach the agent explicitly before any
release artifact is touched. This applies to every AI coding agent working in
the repository.

## How the user states the version

1. **Pin it in the branch name** (recommended) — a branch such as
   `feature/vX.Y.Z` or `release/vX.Y.Z` carries the decision in a form that
   tooling can check.
2. **State it in the conversation** — an explicit instruction naming the exact
   version. This cannot be verified structurally, so it depends on review.

A pin is the user's release authorization. With a pin in place, an agent may
align the release artifacts to that exact version without asking again:

- set the version field in the packaging manifest to the pinned value;
- rename the `## [Unreleased]` section of `CHANGELOG.md` to
  `## [X.Y.Z] - YYYY-MM-DD` and re-insert an empty `## [Unreleased]`;
- commit that as `chore(release): X.Y.Z`.

Do this once, when the pull request is being made ready to merge — not on every
feature commit.

## Always requires an explicit instruction

Even on a pinned branch, an agent must not, on its own initiative:

- choose a version different from the pin (ask before changing the pin itself);
- create or push a release tag;
- publish the package to a registry;
- amend or force-push a release commit;
- merge the release pull request;
- run an all-in-one `version` command that tags as a side effect — edit the
  manifest directly instead.

On an unpinned branch, editing the version field, adding a `CHANGELOG.md`
release heading, and creating a `chore(release):` commit each need an explicit
instruction as well.

## Correct flow

1. Land the `feat` / `fix` / `docs` / `refactor` commits.
2. Record the changes under `## [Unreleased]` in `CHANGELOG.md`.
3. On a pinned branch, align the release artifacts as described above and stop
   there. On an unpinned branch, wait for the user.

## Scope

This file is the master copy shared by every AI coding agent working in this
repository. Tool-specific instruction files reference it instead of restating
it, so edit this file when the rule changes.
