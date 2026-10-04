---
name: implement-retire
owner: qfai-implement
purpose: "Delete a mechanism the project decided to retire: its code, its tests, its configuration and its documents, with no test added to prove it is gone."
requires:
  - common-gate-run
roles:
  - frontend-engineer
  - backend-engineer
  - devops-ci-engineer
  - doc-steward
  - implementation-reviewer
  - qa-gatekeeper
routing-profile: implementation-heavy
---

# implement-retire

The decision to retire the mechanism was made before this step, and recorded.
This step carries it out.

## Reads

- The recorded decision to retire it, and what it says about anything public:
  a command, a key, an option, an exported name.
- The commands of `common-gate-run`.

## Procedure

1. Find every reference to the mechanism by its names: code, tests,
   configuration and its defaults, registration lists, help text, and
   documents.
2. Delete each one. Delete the tests of the mechanism with it.
3. Add no test asserting that the mechanism is gone. A later change that
   brings it back is reviewed on its own.
4. Where a story or contract of the project still states the mechanism, the
   step does not edit it. Return `needs_repair` with a debt naming the file,
   owned by `qfai-sdd`.
5. Run the relevant suite, then the Lint, Typecheck and Build commands. Each
   passes.

## What it writes

- The deleted and changed files, listed in `changedFiles`.
- A record of each reference found and what happened to it, in the stage report.

## Gate

The step is done when no reference to the mechanism remains outside the
story tree, no absence test was added, the project gates pass, and the
qa-gatekeeper observed them.
