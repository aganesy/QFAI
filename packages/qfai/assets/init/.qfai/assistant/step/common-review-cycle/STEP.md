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

- **The reviewer set.** In a route, each review takes exactly these reviewers,
  each once in that review, with no threshold to judge:
  - one reviewer for its kind: `requirements-reviewer` for the specification
    review, `implementation-reviewer` for the code review of the whole diff;
  - `architecture-reviewer` too, only when the target holds a contract change
    no earlier review of the route read;
  - `product-surface-reviewer` too, only when the target holds a screen change
    no earlier review of the route read: an edit to a UI contract's screen, or
    to the code, tests or styles that render one, or to a path `uiux.surfacePaths`
    declares. An uncertain case counts as a screen change
    (`.qfai/assistant/skill/qfai-implement/references/ui-affecting.md#routing`);
  - no other reviewer. A stage the plan marks with no review gets none.

  A review whose target's only edits resolve the conflicts of a merge or a
  branch update between sides that were each already reviewed gets no
  reviewer. A side is reviewed when it is on the default branch or a review of
  this route or its pull request covered its commits. A resolution that adds
  content neither side had is not conflict-only. The stage report names the
  merge and why no reviewer ran. A parent skill invoked by name uses the
  reviewers its own `## Review` section names, such as `qfai-discussion`'s.

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
   For the code review, name each test the run recorded `red: ci-deferred`:
   the reviewer reads it against the code before the fix and confirms that
   its assertion fails there
   (`.qfai/assistant/skill/qfai-implement/references/red-admissibility.md#ci-only-test-gate`).
2. **Dispatch.** Send each reviewer a work order in the shared template. An
   agent that authored, edited or recommended a decision in the reviewed
   artifact is not its independent reviewer. The session report names its
   authors, editors and decision recommenders, and the independent reviewers.
   Each reviewer returns a verdict, `PASS` or `REVISE`, and its
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
the stage report names each verdict and each answer, or says why the review
dispatched no reviewer. A finding the author
cannot fix is in the stage's final report, and a critical decision has gone to
the user.
