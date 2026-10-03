---
name: verify-external
owner: qfai-verify
purpose: "Ask the reporter, a device or a production-like environment to confirm the fix, and record the answer."
requires: [common-evidence-record]
roles: [orchestrator, qa-strategist]
routing-profile: default
---

# verify-external

Some defects only show on the reporter's machine, on a device or against a
real service. The local gates cannot confirm those fixes, so this step asks
someone who can.

## Reads

- The original report, and the environment it names or that
  `triage-request-info` collected.
- The reproduction the diagnosis recorded.
- The fix, and the verify results in `.qfai/evidence/verify-<run-id>.md`.

## Writes

- The confirmation request.
- In `.qfai/evidence/verify-<run-id>.md`: the request, the answer, who gave it
  and when.

The step sends nothing itself. Contacting the reporter is the operator's.

## Procedure

1. Write the request: the revision or build to try, the steps of the original
   reproduction, what shows the fix works, and what shows it does not.
2. Put the request to the operator as one question that asks for the answer.
   Inside a run, return `awaiting_input` with that question.
3. Record the answer as confirmed, not confirmed with what was observed, or no
   answer.
4. Not confirmed sends the fix back: inside a run, return `needs_repair` with
   the observation in `debts`, owned by `qfai-implement`.
5. No answer is recorded as unconfirmed, and the report says so.

## Gate

- The request names the revision, the steps and both observations.
- The answer is recorded with who gave it and when.
- A fix nobody confirmed is never reported as confirmed.
