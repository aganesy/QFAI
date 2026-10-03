---
name: implement-refactor
owner: qfai-implement
purpose: "Move code into a better structure while every test stays green, adding no example and changing no behaviour."
requires:
  - common-steering-refresh
  - common-gate-run
roles:
  - frontend-engineer
  - backend-engineer
  - implementation-reviewer
  - qa-gatekeeper
  - completion-reviewer
routing-profile: implementation-heavy
---

# implement-refactor

The request changes how the code is arranged, not what it does. Nothing in
the story tree changes, so the step adds no example and runs no RED.

## Reads

- The request, or the work order.
- `.agents/rules/minimal-implementation.md`.
- The commands of `common-gate-run`.

## Procedure

1. Run the relevant suite before touching anything. It passes. When it does
   not, stop and report the failing tests: a refactor cannot show it kept
   behaviour that was already broken.
2. Move in small steps: rename, extract, inline, move a file. Run the suite
   after each one.
3. A test may change only where it names something that moved, such as an
   import path. What a test asserts does not change.
4. Delete code nothing calls and nothing declares.
5. Run the Lint, Typecheck and Build commands at the end.

## When behaviour has to change

When finishing the move would change what the code does, stop before
changing it and report a branch:

- `branch: { outcome: "behaviour-change", route: "add-feature" }` when the
  change adds behaviour and nobody relies on the old;
- `branch: { outcome: "behaviour-change", route: "change-compatibility" }`
  when callers or users rely on what would change.

## What it writes

- The moved code, and a test's reference to a moved name, listed in
  `changedFiles`.
- A record of each move and each suite run, in the stage report.

## Gate

The step is done when the suite passed before and after every move, no
assertion changed, the project gates pass, and the qa-gatekeeper observed the
last run.
