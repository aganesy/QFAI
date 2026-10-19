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
routing-profile: default
---

# implement-retire

The decision to retire the mechanism was made before this step, and recorded.
This step carries it out.

## Reads

- The recorded decision to retire it, and what it says about anything public:
  a command, a key, an option, an exported name.
- The commands of `common-gate-run`.
- `.agents/rules/action-reversibility.md`, before an action that deletes, pushes, publishes or
  is visible to others.

## Procedure

1. Find every reference to the mechanism by its names: code, tests,
   configuration and its defaults, registration lists, help text, and
   documents.
2. Delete each one. Delete the tests of the mechanism with it.
3. Add no test asserting that the mechanism is gone. A later change that
   brings it back is reviewed on its own.
4. Where a story or contract of the project still states the mechanism, the
   step does not edit it. Return `needs_repair` and name the file in the stage
   report, with `qfai-sdd` as its owner. Resume after that owner resolves the
   story or contract through its own route.
5. Run the relevant suite. It passes.

## Retiring a feature

In the `retire-feature` route, the user asked to remove a feature, or a concept
across the project's surfaces, and the specification stage before this step
already removed or rewrote the stories, examples and contract rules that stated
it. That rewritten specification is the recorded decision. When a contract rule
still cites an example that stage removed, the step changes nothing: it returns
`needs_repair` naming the rule, with `qfai-sdd` as its owner.

The step removes the feature from code, configuration and documents as the
procedure says, and rewords what still names it to match the specification.
In this route, step 2 of the procedure is narrowed:

- A test is deleted only when every example its example annotations name was
  removed in the specification stage's diff. The stage report lists each
  deleted test with the example IDs it was deleted for.
- A test that annotates any example the specification keeps stays. The step
  changes its assertions to what the rewritten specification states, and
  moves its example annotation to the rewritten example.
- A test that refers to the feature but annotates no removed example is not
  deleted. The stage report lists it.

No test is added, neither for the removal nor for the new wording.

## What it writes

- The deleted and changed files, listed in the stage report.
- A record of each reference found and what happened to it, in the stage report.

## Gate

The step is done when no reference to the mechanism remains outside the
story tree, no absence test was added, and the relevant suite passes.
