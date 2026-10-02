---
name: triage-close
owner: qfai-triage
purpose: "Record how a request ended and every follow-up request it found, and close it without changing any tracked file."
requires: []
roles: [requirements-analyst, completion-reviewer]
routing-profile: default
---

# triage-close

The last step of a route that makes no change. It says how the request ended
and what is left for someone else to do.

## Reads

- The request, and the results of the steps that ran before this one.
- The answers the operator gave to any question an earlier step put.

## Outcomes

| Outcome         | Means                                                                  |
| --------------- | ---------------------------------------------------------------------- |
| `no-work`       | The request asks for nothing the project should do                     |
| `other-owner`   | Only an operator, an upstream project or another project can change it |
| `answered`      | The question was answered                                              |
| `duplicate`     | An existing item already covers the request, and is linked             |
| `awaiting-info` | The missing facts did not arrive                                       |
| `accepted`      | The proposal was accepted                                              |
| `declined`      | The proposal was declined                                              |
| `deferred`      | The proposal was put off, with the reason                              |
| `decided`       | The design question was decided and recorded                           |
| `split`         | The request was split into child requests                              |
| `handed-off`    | A person was given an operation to run, and its result is recorded     |
| `verified`      | A written test plan was followed and its result is recorded            |

## Procedure

1. Pick exactly one outcome from the table above.
2. List each follow-up request: work the route found and does not do, such as
   a gap in the documentation an answer exposed, or each child request of a
   split. Each follow-up states its goal and the reason it exists. A child that
   depends on another names that child in its reason.
3. Route nothing. A follow-up is recorded here and handled as a request of its
   own; no step is added to the run for it.

## Re-routing

Two routes let this step send the request on instead of closing it:

- After a request for information, the answers arrived: report the outcome
  `info-received` with a new extraction of the request that includes them, so
  the decision rules route it again.
- After a decision to accept a proposal: report the outcome `adopted`, naming
  the route that builds it.

Any other route closes here.

## What it writes

- No file git tracks. A record it writes that git ignores is named in
  `artifactRefs`, not in `changedFiles`.
- Inside a workflow run, the result carries `closure` as
  `{ outcome, followUps }`, each follow-up `{ goal, reason }`. A re-route
  carries `branch` as `{ outcome, route, extraction }` instead.
- Invoked by name, the report states the outcome and lists each follow-up.

## Gate

The reviewer, or the stage worker where the work order names none, confirms one outcome is recorded with the evidence behind it,
every follow-up the earlier steps found is listed with its goal and reason,
no follow-up was routed or started, and no tracked file changed. The report
never says a change is done.
