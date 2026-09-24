# Version Discipline — This Repository

Read with `version-discipline.md`. That file describes the branch-name pin as an
optional convention and marks it not adopted. **This repository has adopted it**,
and the rest of this file is what that means here.

## The pinned branch

A branch named `<type>/v<X.Y.Z>[-<slug>]` carries a pin — `feature/v1.8.8`,
`release/v1.9.0`, `hotfix/v1.10.2-foo`. The leading `v` is required.

The guard reads a pin from a `v` after `/`, `_`, `-`, or the start of the branch
name. It refuses a pre-release suffix (`-rc`, `-alpha`, `-beta`, `-pre`,
`-next`) or build metadata next to the version: it exits 1 rather than reading
`1.9.0` out of `v1.9.0-rc.1`. Keep to
`<type>/v<X.Y.Z>[-<slug>]` so the pin is unambiguous.

The guard takes MAJOR.MINOR.PATCH only, so `feature/api-2024.10.05`,
`bugfix/issue-1.2.3-typo` and `fix/log4j-2.17.1` carry no pin. Run a pre-release
branch with `VERSION_PIN_SKIP=1`.

## What a pin authorizes

The pin is the user's instruction to release that version, so these three need
no further confirmation:

1. Set `packages/qfai/package.json#version` to the pinned value.
2. Rename `## [Unreleased]` in `CHANGELOG.md` to `## [X.Y.Z] - YYYY-MM-DD` and
   insert a fresh empty `## [Unreleased]`.
3. Commit that as `chore(release): qfai X.Y.Z`.

Do this once, when the pull request is being made ready to merge. Keep appending
to `## [Unreleased]` until then.

Changing the version to anything other than the pin is not authorized. Ask
before changing the pin itself.

## The guard

`packages/qfai/scripts/check-branch-version-pin.sh` reads the pin from the
branch name. It passes when there is none and exits 1 when the pin disagrees
with `packages/qfai/package.json#version`. The CI lint job runs it.

`VERSION_PIN_SKIP=1` disables the guard for a coordinated release the user
has approved where the branch name and the version are deliberately apart.

## On an unpinned branch

Editing the version field, adding a `CHANGELOG.md` release heading and creating
a `chore(release):` commit each need an explicit instruction, as the shipped
rule says. No guard checks a branch with no SemVer in its name.
