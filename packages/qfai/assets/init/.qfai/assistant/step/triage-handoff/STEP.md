---
name: triage-handoff
owner: qfai-triage
purpose: "Give a person the steps and preconditions of an operation only they can run, and record its result."
requires: []
roles: [devops-ci-engineer, completion-reviewer]
routing-profile: default
---

# triage-handoff

Some operations need a person: renewing a key or a certificate, republishing a
package, anything paid for or tied to an account. This step prepares the
operation and records what happened.

## Reads

- The request, and the inspection record that ran before this step.
- The project's release and operations documents.

## Procedure

1. Write the operation as numbered steps a person can follow, each naming the
   account or host it runs on.
2. State the preconditions: access needed, what must be true first, and how to
   tell the operation worked.
3. Put the operation to the person who runs it, and wait for the result. The
   run's release approval is asked before this step.
4. Record the result the person reports.

Run none of the operation here: no push, publication, tag or change to an
account.

## What it writes

- No file git tracks.
- The steps, the preconditions and the reported result, in the result and the
  report.

## Gate

The reviewer confirms the steps can be followed as written, every precondition
is stated, the result is recorded as the person reported it, and nothing was
run on their behalf.
