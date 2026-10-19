---
name: triage-close
owner: qfai-triage
purpose: "Record how a request ended and every follow-up request it found, and close it without changing any tracked file."
requires: []
roles: [requirements-analyst]
routing-profile: default
---

# triage-close

The last step of a route that makes no tracked change. It says how the request ended
and what is left for someone else to do.

## Reads

- The request, and the results of the steps that ran before this one.
- The answers the operator gave to any question an earlier step put.

## Outcomes

| Outcome         | Means                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------- |
| `no-work`       | The request asks for nothing the project should do                                       |
| `other-owner`   | Only an operator, an upstream project or another project can change it                   |
| `answered`      | The question was answered                                                                |
| `duplicate`     | An existing item already covers the request, and is linked                               |
| `awaiting-info` | The missing facts did not arrive                                                         |
| `accepted`      | The proposal was accepted                                                                |
| `declined`      | The proposal was declined                                                                |
| `deferred`      | The proposal was put off, with the reason                                                |
| `decided`       | The design question was decided and recorded                                             |
| `split`         | The request was split into child requests                                                |
| `handed-off`    | A person was given an operation to run, and its result is recorded                       |
| `verified`      | A written test plan was followed and its result is recorded                              |
| `cleaned`       | Authorized temporary targets are absent and tracked contents and the index are unchanged |

## Procedure

1. Pick exactly one outcome from the table above.
   Use `cleaned` only after `triage-owned-cleanup` passed its gate with the
   absence and unchanged-content and index evidence recorded. A denial,
   partial failure or missing check leaves cleanup unfinished, not closed as
   `cleaned`. This outcome says nothing about a product change or test plan.
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

- No file git tracks. Name any ignored record's location in the stage
  report, separately from tracked changes.
- The stage report states the outcome and each follow-up's goal and reason.
  When the release change is produced outside this run (by a release workflow
  or bot), the stage report records the release approval with what was
  approved, who approved it, when, and the chosen option's label, and lists
  the row as a pending follow-up; the next change that touches `decisions.md`
  appends its row.
  For a re-route, retain the plan's branch outcome, the selected route and
  the request extraction in the session handoff. A re-route does not close
  the request.

## Gate

The reviewer, or the stage worker where the work order names none, confirms one outcome is recorded with the evidence behind it,
every follow-up the earlier steps found is listed with its goal and reason,
no follow-up was routed or started, and no tracked file was changed by any
triage step. The report never says a tracked change is done. The `cleaned`
outcome confirms only the temporary cleanup's completed gate.

Outside triage steps, the only tracked-file changes allowed are the records
the route's discussion stage names and the approval row, if any, that
`qfai-run` writes in `decisions.md` under its step 7 before `triage-handoff` runs.
