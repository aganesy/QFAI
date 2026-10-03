---
name: verify-manual
owner: qfai-verify
purpose: "Follow a written test plan on each environment it names, record each check's result, and record each defect found as a follow-up request."
requires: []
roles: [orchestrator, qa-strategist, devops-ci-engineer]
routing-profile: default
---

# verify-manual

Runs a test plan someone wrote, as written. It checks and reports; it fixes
nothing.

## Reads

- The test plan the request names, and the environments it lists.
- The revision under test.

## Writes

- In the stage report: one line per check and environment,
  with its result — pass, fail or unrun — and what was observed.
- One follow-up request `{ goal, reason }` per defect found.

It changes no tracked file.

## Procedure

1. List every check of the plan against every environment it names.
2. Run each check as written, on the revision under test. A check that needs a
   person — a device, a visual judgement — goes to the operator as a question
   with its steps and what to report.
3. Record each result with what was observed. A check on an environment that is
   not available is unrun, never a pass.
4. Record each failed check as a follow-up request. Inside a run, the stage
   result lists them, and `triage-close` records them.

## Gate

- Every check on every environment is recorded as pass, fail or unrun.
- Every failed check is a follow-up request.
- No tracked file changed.
