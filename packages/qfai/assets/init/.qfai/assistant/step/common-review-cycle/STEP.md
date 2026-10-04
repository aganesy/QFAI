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
- **The latest results the run recorded**, such as the test runs and gate
  results. The review runs no gate of its own.
- **Answers an earlier stage recorded**, when an earlier stage's review already
  answered findings on the same artifact.

## Cycle

1. **Build the request.** Name the scope, the target files and the review
   focus. Put the answers an earlier stage recorded on the same artifact into
   this review's request before dispatching reviewers, under
   `.qfai/assistant/rule/review-convergence.md#answered-demands-must`.
2. **Dispatch.** Send each reviewer a work order in the shared template. An
   agent that authored, edited or recommended a decision in the reviewed
   artifact is not its independent reviewer; inside a run, `actorHistory` says
   who that is. Each reviewer returns a verdict, `PASS` or `REVISE`, and its
   findings, in the shared reviewer response template.
3. **Address every finding** once: fix it in its owning source with the
   smallest edit that resolves it, or record a reasoned answer beside it, and
   rerun the tests a fix touches. An upstream finding is not repaired here:
   stop under `.qfai/assistant/rule/drift-protocol.md`. No reviewer is rerun.
4. **Complete** once every reviewer has responded and every finding is fixed or
   answered. A finding the author cannot fix goes in the stage's final report;
   a critical decision goes to the user
   (`.qfai/assistant/rule/review-convergence.md#one-review`).

## Writes

- In the stage report: each reviewer's verdict, the findings, and how each was
  fixed or answered.

## Gate

Every routed reviewer responded once, every finding is fixed or answered, and
the stage report names each verdict and each answer. A finding the author
cannot fix is in the stage's final report, and a critical decision has gone to
the user.
