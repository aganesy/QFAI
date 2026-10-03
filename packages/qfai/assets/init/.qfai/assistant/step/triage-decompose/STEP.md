---
name: triage-decompose
owner: qfai-triage
purpose: "Split a request into child requests, each with its goal and the children it depends on, for triage-close to record as follow-ups."
requires: []
roles: [requirements-analyst, delivery-planner, requirements-reviewer]
routing-profile: requirements-heavy
---

# triage-decompose

A request too large or too mixed to handle as one becomes several child
requests. Each child is then handled as a request of its own.

## Reads

- The request, and the discussion or diagnosis records that ran before this
  step.

## Procedure

1. Split the request so each child has one goal that can be handled on its own.
2. For each child, state its goal, the reason it exists, and the children it
   depends on. A dependency is stated only where one child cannot start before
   another ends.
3. Check the children against the request: together they cover it, and none
   adds what the request did not ask for.
4. Hand the children to `triage-close`, which records each as a follow-up.
   Route none of them here.

The split is this step's decision point. Where the run stops there for the
operator, put the proposed children to them before recording them.

## What it writes

- No file git tracks.
- The children, each with its goal, reason and dependencies, in the result.

## Gate

The reviewers confirm the children together cover the request and add nothing
to it, each dependency is real, no child was routed, and no tracked file
changed.
