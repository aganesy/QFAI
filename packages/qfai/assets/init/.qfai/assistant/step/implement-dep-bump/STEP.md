---
name: implement-dep-bump
owner: qfai-implement
purpose: "Raise a dependency to a new version and check that the runtime, the version floors the project declares, and every call into it still hold."
requires: [common-steering-refresh, common-gate-run]
roles:
  - devops-ci-engineer
  - frontend-engineer
  - backend-engineer
routing-profile: default
---

# implement-dep-bump

The request names a dependency and, usually, the version to reach or the
advisory to clear.

## Reads

- The dependency's release notes and changelog between the current and the
  target version.
- For an advisory, the advisory itself and the versions it names as fixed.
- The project's manifest, its lockfile and the commands of `common-gate-run`.

## Procedure

1. Pick the target: the version the request names, or the lowest version the
   advisory names as fixed.
2. Read the release notes in between for breaking changes, a raised runtime
   requirement and removed or renamed APIs.
3. Check the runtime the new version needs against what the project declares,
   such as the `engines` field. When the new version needs more than the
   project declares, stop: raising that is a change for the operator to
   decide.
4. Update the manifest and the lockfile with the project's package manager.
   Never edit a lockfile by hand.
5. Change each call the release notes break. Keep a range the project
   publishes to its own users as wide as the new version allows.
6. Run the relevant suite.

## What it writes

- The manifest, the lockfile and any adapted call, listed in `changedFiles`.
- A record of the versions, the breaking changes read and how each was met, in the stage report.

## Gate

The step is done when the target version is installed, the runtime check and
every breaking change are recorded as met, and the relevant suite passes.
