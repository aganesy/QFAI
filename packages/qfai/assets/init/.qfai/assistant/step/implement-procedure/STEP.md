---
name: implement-procedure
owner: qfai-implement
purpose: Write an authorized operational procedure within existing policy.
requires: [common-gate-run]
roles: [doc-steward]
routing-profile: default
---

# implement-procedure

## What this is for

Write instructions a person can follow within the project's existing policy.
Do not invent a business flow, code, tests, specifications or contracts to
support this document.

## Reads

- The request and work order: resolve the authorized write scope and target
  documents before editing.
- The existing policy and procedures governing the actions: preserve their
  authority limits and required checks.
- For every document edit, read `.agents/rules/documentation-clarity.md`.

## Before writing

If the needed edit belongs to policy, a story, a contract or QFAI assistant
instructions, stop before writing and name its owning stage. Markdown does not
confer ownership of those surfaces.

If required facts or values are missing, stop the dependent work and report
what is needed to resume. Never invent values, commands or permission.

## Procedure

1. Identify the inputs, actions, commands, required values, order, failure
   conditions and recovery steps the request needs.
2. Check them against existing policy and actual known facts. Write only the
   authorized documents within the work order's scope.
3. Keep the instructions usable: name the actor, prerequisites, expected
   result, stop conditions and recovery for each action.
4. Run the applicable document lint and link checks through
   `.qfai/assistant/step/common-gate-run/STEP.md`. A check applies when a
   Standard commands entry (normally `Lint` or `Format`) runs a checker over
   the changed files' type; where you cannot tell, run the entry and record its
   result. Where no entry does, record "no applicable checker" in the stage
   report: it is neither a pass nor UNRUN, and it is not required. A defined
   check that reports it checked none of the changed files is recorded with its
   output as run; it is not a pass for those files, and it is not "no
   applicable checker". This does not narrow the gate set under
   `common-gate-run` step 1; it covers only a check that does not exist. Keep
   actual evidence;
   unavailable required checks remain UNRUN with their blocker and resume
   condition. Follow the plan's existing independent code review and closing
   verification stages.

## Action authority

Authoring does not authorize execution. Do not perform publication, deletion,
login or permission expansion while writing their instructions. Those actions
need separate authority and their own applicable route. Required values are
facts to verify, not authority to act.

## Stage report

Report the changed paths, the procedure authored and the checks actually
performed with their evidence. State that the documented actions were not
executed; their outcome is unobserved. Record unavailable checks as UNRUN,
with the blocker, owner and condition for resuming. Static instructions do not
prove an adopter's operation succeeded.

## Gate

The authorized document is complete and consistent with existing policy.
Applicable lint and link checks have actual results through
`common-gate-run`; failures and unavailable checks prevent completion. Where
no checker covers the changed files, the stage report records "no applicable
checker", which neither passes nor blocks the gate.
Protected edits and uncovered actions were stopped before writing or acting.
