---
name: common-review-cycle
owner: common
purpose: "Run a review the route or the parent skill calls for: dispatch the independent reviewers, repair and re-review until every blocking reviewer passes, and report the result."
requires: []
roles: []
---

# common-review-cycle

A route runs this only where its plan marks a stage `review: spec` or
`review: code`, after that stage's last step: the specification review when the
stage changed a story-tree or contract file, and the code review over the
route's whole diff. No other stage of a route is reviewed. A parent skill
invoked by name runs it once, after its last step. Each run reviews its target
against one revision.

The reviewer rules themselves are
`.qfai/assistant/rule/shared-skill-delegation-baseline.md#reviewer-gate-baseline`
and `.qfai/assistant/rule/review-convergence.md`. This step does not restate
them; it is the procedure that applies them.

## Reads

- **The reviewer set.** Invoked by name: the union of the reviewers the profiles
  of the steps that ran require, as
  `.qfai/assistant/rule/shared-skill-operating-baseline.md#running-steps-mandatory`
  states, resolved through `.qfai/assistant/rule/agent-selection.md`, plus each
  conditional reviewer whose condition holds. In a run: the work order's
  `requiredReviewerRoles`, as issued.
- **Under `review:heavy`.** When the work order's `modifiers` hold it, its
  `requiredReviewerRoles` also hold the reviewers of the `heavy` review
  profile, and every one of them is blocking; drop none. The stage report
  lists every decision the stage adopted.
- **The review target.** Every path and ID the stage wrote or changed, and the
  source it was written from.
- **The stage's gate result**, fresh on the revision the reviewers will read.
- **The stage's grilling record** (`common-grilling-record`), where the stage
  held a session.
- **The previous cycle's answered demands**, when this is not the first cycle.

## Cycle

1. **Gate first.** Run the stage's own validate gate through `common-gate-run`
   on the snapshot the reviewers will read, and require exit 0 with zero
   errors. `<paths.outDir>/validate.log` is written by the CLI on every run; its
   `run_log:` line must name the newest `run-*/` directory. No shell
   redirection is needed.
2. **Build the request.** Name the scope, the target files and the review
   focus. Carry prior answers and newly answered demands into the next cycle's
   request before dispatching reviewers, under
   `.qfai/assistant/rule/review-convergence.md#answered-demands-must`. Where
   the stage holds a grilling record, include it: the reviewer rules on it and
   should not have to look for it.
3. **Dispatch.** Send each reviewer a work order in the shared template, with
   the invocation's run start. An agent that authored, edited or recommended a
   decision in the reviewed artifact is not its independent reviewer; inside a
   run, `actorHistory` says who that is. Require every field of the shared
   reviewer response template.
4. **On a blocking REVISE**, fix the finding in its owning source with the
   smallest edit that resolves it, and leave unaffected content alone. An
   upstream finding is not repaired here: stop under
   `.qfai/assistant/rule/drift-protocol.md`. Then rerun the gate.
   - Then rerun that reviewer, and any reviewer whose scope the fix changed.
5. **Complete** only when every routed blocking reviewer returns `PASS` on the
   same final revision. A reviewer returns `PASS` or `REVISE`; there is no third
   verdict. A pending response is not `PASS`. The round budget and
   its escalation are
   `.qfai/assistant/rule/review-convergence.md#round-budget-must`.

## Rounds of tested results

Where the stage records test observations, a blocking finding opens a new round
for the affected test.

- Keep the earlier observation and the response that rejected it. Append the
  changed test, revision, command, result and review response.
- Never relabel an old result as current.
- After changing a test or its fixture, verify its oracle again before asking
  for review.
- Where a production change alone answered the finding, rerun the selected test
  and the relevant suite, keep the original RED subject and report the new
  result.

## Writes

- In the stage report: each reviewer's verdict and revision, the findings, the
  repairs, the rerun commands and the final blocking verdicts.

## Gate

Every routed blocking reviewer returned `PASS` on the final revision, and the
stage report names each verdict. Anything short of
that is reported with the open findings, not as a pass.
