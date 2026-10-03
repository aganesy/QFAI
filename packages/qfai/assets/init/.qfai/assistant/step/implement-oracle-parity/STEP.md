---
name: implement-oracle-parity
owner: qfai-implement
purpose: "Build a check that runs the same inputs through the project and through the outside reference it should match, and lists every difference."
requires: [common-steering-refresh, common-gate-run]
roles:
  - test-design-analyst
  - frontend-engineer
  - backend-engineer
  - devops-ci-engineer
  - completion-reviewer
  - qa-gatekeeper
  - implementation-reviewer
routing-profile: runtime-heavy
---

# implement-oracle-parity

The expected behaviour is set outside the project: a standard, a language
specification, a browser, a reference implementation or another backend. This
step builds the check that compares the two, so the diagnosis works from
observed differences rather than from reading.

## Reads

- The report: the request, or the work order, naming the reference.
- The reference itself: its published test vectors, its conformance suite, or
  a build of it that runs here.
- The commands of `common-gate-run`.

## Procedure

1. Name the reference and its version. Use its published vectors or
   conformance suite before writing inputs of your own.
2. Pick the inputs: the reported case, its neighbours, and the edge cases the
   reference documents.
3. Write the check beside the project's tests. It runs each input through
   both sides and compares the outputs field by field.
4. Run it and list every difference with its input and both outputs.
5. When the reference cannot run here, compare against its recorded outputs
   and record where they came from.

## What it writes

- The check and its inputs, listed in `changedFiles`. The step changes no
  production code.
- A record of the reference and its version, and of each difference, in the stage report.

## Gate

The step is done when the check runs, the reported difference is among the
ones it lists, no production code changed, and the qa-gatekeeper observed the
run.
