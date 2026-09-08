# Version Discipline

An AI agent never decides which version this project releases. The user
decides, and the decision has to reach the agent explicitly before any release
artifact is touched. This applies to every AI coding agent working in the
repository.

## Default: the user names the version in the conversation

Unless the project has adopted the optional convention below, the only thing
that authorizes a release edit is an explicit instruction naming the exact
version. Without it an agent must not set the version field in the packaging
manifest, add a `CHANGELOG.md` release heading, or create a `chore(release):`
commit, whatever the branch is called. This cannot be checked structurally, so
it depends on review.

## Optional: pin the version in the branch name

> **Adoption status: not adopted.** Remove this note only once the project has
> decided to use branch-name pins. While it stands, a branch name is just a
> name and never authorizes a release edit.

Some projects encode the decision in the branch name (`feature/vX.Y.Z`,
`release/vX.Y.Z`) so that tooling can check it. A branch name carries that
meaning **only** where the project has said so. Elsewhere the same shape may
name an API version, a milestone, or a dependency being upgraded, and reading
it as consent lets an agent release on its own.

Where the convention is adopted, a pin is the user's release authorization. An
agent may align the release artifacts to that exact version without asking
again:

- set the version field in the packaging manifest to the pinned value;
- rename the `## [Unreleased]` section of `CHANGELOG.md` to
  `## [X.Y.Z] - YYYY-MM-DD` and re-insert an empty `## [Unreleased]`;
- commit that as `chore(release): X.Y.Z`.

Do this once, when the pull request is being made ready to merge, not on every
feature commit.

## Always requires an explicit instruction

Even on a pinned branch of a project that adopted the convention, an agent must
not, on its own initiative:

- choose a version different from the pin (ask before changing the pin itself);
- create or push a release tag;
- publish the package to a registry;
- amend or force-push a release commit;
- merge the release pull request;
- run an all-in-one `version` command that tags as a side effect. Edit the
  manifest directly instead.

Where the convention is not adopted, or on an unpinned branch, editing the
version field, adding a `CHANGELOG.md` release heading, and creating a
`chore(release):` commit each need an explicit instruction as well.

## Correct flow

1. Land the `feat` / `fix` / `docs` / `refactor` commits.
2. Record the changes under `## [Unreleased]` in `CHANGELOG.md`.
3. Wait for the user to name the version. Only in a project that adopted the
   pin convention, on a branch that carries a pin, may an agent align the
   release artifacts as described above. It stops there.

## Scope

This is the master copy for every AI coding agent in this repository.
Tool-specific instruction files point here instead of restating it. Edit this
file when the rule changes.
