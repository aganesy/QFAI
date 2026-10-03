---
name: common-review-cycle
owner: common
purpose: "Run a review the route or the parent skill calls for: dispatch the independent reviewers once, fix or answer every finding, and report the result."
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

- **The reviewer set.** In a route, the specification review:
  `requirements-reviewer`, joined by `architecture-reviewer` when a contract
  changed; the code review of the whole diff: `implementation-reviewer`. On a
  flow a UI contract with screens serves, `product-surface-reviewer` joins
  either review. A parent skill invoked by name uses the reviewers its own
  `## Review` section names, such as `qfai-discussion`'s.
- **The review target.** The specification review: every path and ID the
  stage it follows wrote or changed, and the source it was written from. The
  code review: the route's whole diff against the revision the route started
  from, so the code and tests earlier stages wrote are read with the change note.
- **The stage's gate result**, fresh on the revision the reviewers will read.
- **The stage's grilling record** (`common-grilling-record`), where the stage
  held a session.
- **Answers an earlier stage recorded**, when an earlier stage's review already
  answered findings on the same artifact.

## Cycle

1. **Gate first.** Run the stage's own validate gate through `common-gate-run`
   on the snapshot the reviewers will read, and require exit 0 with zero
   errors. `<paths.outDir>/validate.log` is written by the CLI on every run; its
   `run_log:` line must name the newest `run-*/` directory. No shell
   redirection is needed.
2. **Build the request.** Name the scope, the target files and the review
   focus. Put the answers an earlier stage recorded on the same artifact into
   this review's request before dispatching reviewers, under
   `.qfai/assistant/rule/review-convergence.md#answered-demands-must`. Where
   the stage holds a grilling record, include it: the reviewer rules on it and
   should not have to look for it.
3. **Dispatch.** Send each reviewer a work order in the shared template, with
   the invocation's run start. An agent that authored, edited or recommended a
   decision in the reviewed artifact is not its independent reviewer; inside a
   run, `actorHistory` says who that is. Require every field of the shared
   reviewer response template.
4. **Address every finding** once: fix it in its owning source with the
   smallest edit that resolves it, or record a reasoned answer beside it. An
   upstream finding is not repaired here: stop under
   `.qfai/assistant/rule/drift-protocol.md`. Rerun the gate after the fixes.
   No reviewer is rerun.
5. **Complete** once every reviewer has responded and every finding is fixed or
   answered. A reviewer returns `PASS` or `REVISE`; there is no third verdict. A finding the author cannot fix goes in the stage's final report;
   a critical decision goes to the user
   (`.qfai/assistant/rule/review-convergence.md#one-review`).

## Rounds of tested results

Where the stage records test observations, the fix of a blocking finding
records the affected test again; no second review follows.

- Keep the earlier observation and the response that rejected it. Append the
  changed test, revision, command, result and review response.
- Never relabel an old result as current.
- After changing a test or its fixture, verify its oracle again before
  recording the fix.
- Where a production change alone answered the finding, rerun the selected test
  and the relevant suite, keep the original RED subject and report the new
  result.

## Writes

- In the stage report: each reviewer's verdict and revision, the findings, the
  repairs, the rerun commands and the final blocking verdicts.

## Gate

Every routed reviewer responded once, every finding is fixed or answered, and
the stage report names each verdict and each answer. A finding the author
cannot fix is in the stage's final report, and a critical decision has gone to
the user.
