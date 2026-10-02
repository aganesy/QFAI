# US-0002-0015: One setup definition with a file-derived Node version

## User Story

As a contributor editing CI, I want the setup preamble defined once and consumed by every own-CI job, with the Node version read from a file rather than restated as a workflow-level literal, so that changing the toolchain is one edit and a stale version comment cannot occur.

## Non-goals

- Shipping this mechanism to adopters: a composite action under the shipped `.github/` fails pack verification.
- A reusable workflow, whose per-job overhead works against the cost objective.
- Deriving the version unconditionally in a shipped template, where a missing adopter version file would make setup fail closed.
