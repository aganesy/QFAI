---
name: implement-tooling
owner: qfai-implement
purpose: "Change a workflow, a script or a development tool, record whether the change reaches the CI the project ships to others, and record any release-path check that has to wait for the next release."
requires: [common-steering-refresh, common-gate-run]
roles:
  - devops-ci-engineer
routing-profile: default
---

# implement-tooling

The request changes how the project is built, checked or released rather
than what it does: a CI workflow, a lint lane, a build or release script, a
development tool.

## Reads

- The request, and the diagnosis the run carries.
- The workflows and scripts the change touches, and what calls them.
- Where the project ships CI templates or scripts to others, those templates.

## Procedure

1. Make the change.
2. Run what it changed, as far as it runs here: the script, the lint lane, a
   workflow linter the project already carries.
3. Where the project ships CI to others, record one disposition with its
   reason:
   - **transferred** — the shipped templates took the same change;
   - **not applicable** — they cannot take it, and why;
   - **deferred** — they should, and what waits.
4. A part that runs only on a release, such as a tag or publish job, cannot
   be run here. Record it as unverified until the next release, and name the
   check that will show it works.

## What it writes

- The changed workflows, scripts and tool configuration, listed in
  `changedFiles`.
- A record of each command run with its result, the shipped-CI disposition,
  and any release-path check left for the next release, in the stage report.

## Gate

The step is done when every part that can run here ran and passed, the
disposition is recorded where the project ships CI, every part that cannot
run is named with the check that waits for it.
