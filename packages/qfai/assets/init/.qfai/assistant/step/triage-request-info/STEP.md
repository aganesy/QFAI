---
name: triage-request-info
owner: qfai-triage
purpose: "Ask for the facts a request is missing as structured questions, and record the deadline for the answers."
requires: []
roles: [discovery-analyst]
routing-profile: default
---

# triage-request-info

A request that lacks a version, the steps to reproduce or the expected result
cannot be handled. This step asks for exactly what is missing.

## Reads

- The request, and any item it names.
- What the project can settle on its own: its supported versions, its
  documented behaviour.

## Procedure

1. List each fact the request lacks that its handling needs. A fact the
   project can look up is looked up, not asked.
2. Put each missing fact as one question, in the shape its answer has: a
   choice where the candidates can be listed, such as a supported version, and
   a plain request for the value otherwise.
3. Record the deadline after which the request is closed as `awaiting-info`.

## What it writes

- No file git tracks.
- Inside a workflow run, the outcome is `awaiting_input` and `questions` holds
  one `fact` question per missing fact. The answers reach `triage-close`.
- Invoked by name, the questions are put as
  `.qfai/assistant/rule/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`
  states, and the report names the deadline.

## Gate

The reviewer confirms every question asks for a fact the handling needs and the
project could not look up, each is in the shape its answer has, the deadline is
recorded, and no tracked file changed.
