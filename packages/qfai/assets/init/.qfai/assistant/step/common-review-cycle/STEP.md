---
name: common-review-cycle
owner: common
purpose: "Review what a stage wrote, once, after its last step: build the review pack, dispatch the independent reviewers, repair and re-review until every blocking reviewer passes, and seal the result."
requires: []
roles: []
---

# common-review-cycle

A stage runs this once, after its last step. It reviews everything the stage's
steps wrote in this invocation, against one revision.

The reviewer rules themselves are
`.qfai/assistant/rule/shared-skill-delegation-baseline.md#reviewer-gate-baseline`
and `.qfai/assistant/rule/review-convergence.md`. This step does not restate
them; it is the procedure that applies them.

## Reads

- **The reviewer set.** Invoked by name: the union of the reviewers the profiles
  of the steps that ran require, as
  `.qfai/assistant/rule/shared-skill-operating-baseline.md#running-steps-mandatory`
  states, resolved through `.qfai/assistant/rule/agent-selection.md`, plus each
  conditional reviewer whose condition holds. In a plan: the review the
  plan names after the stage, `spec` or `code`, with the reviewers
  `qfai-run` names for it.
- **Under `review:heavy`.** When the work order's `modifiers` hold it, its
  `requiredReviewerRoles` also hold the reviewers of the `heavy` review
  profile, and every one of them is blocking; drop none. The stage evidence
  lists every decision the stage adopted, for the completion report.
- **The review target.** Every path and ID the stage wrote or changed, and the
  source it was written from.
- **The stage's gate result**, fresh on the revision the reviewers will read.
- **The stage evidence file** (`common-evidence-record`), including its
  `## Grilling Session` block and Work Orders Summary.
- **The previous cycle's answered demands**, when this is not the first cycle.

## Where the pack goes

A stage whose owner has a pack producer writes a review pack. Every other stage
records the reviewer responses in its evidence file's reviewer results and Work
Orders Summary instead.

| Owner             | `producer`   | `target.kind` | `target.path`                                          |
| ----------------- | ------------ | ------------- | ------------------------------------------------------ |
| `qfai-discussion` | `discussion` | `discussion`  | `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS`        |
| `qfai-sdd`        | `sdd`        | `flow`        | `<paths.specsDir>/02_business-flow/business-flow-NNNN` |
| `qfai-implement`  | `implement`  | `flow`        | `<paths.specsDir>/02_business-flow/business-flow-NNNN` |
| `qfai-atdd`       | `atdd`       | `flow`        | `<paths.specsDir>/02_business-flow/business-flow-NNNN` |
| any other owner   | none         | none          | no pack                                                |

`producer` decides which stage gate judges the pack, and a `target.kind` the
path contradicts is a finding. Neither the SDD nor the discussion gate judges an
`implement` or `atdd` pack; a full run judges every pack.

One pack per flow. A stage that changed several flows writes one pack for each.

## The pack

The directory is `.qfai/review/review-YYYYMMDDhhmmssSSS/`: `review-` and a
17-digit timestamp. Any other spelling is not listed as a pack, and a tree with
no packs only warns, so the cycle would pass `--fail-on error` unreviewed.

| File                   | What it holds                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| `review_request.md`    | `Producer: <producer>`, the scope, the target files, answered demands, review focus, required reviewers |
| `R01_<reviewer>.md`, … | One reviewer response each, in the shared reviewer response template                                    |
| `summary.json`         | The cycle's result, written when the cycle completes                                                    |

Write the producer, scope, target and review focus of this stage into
`review_request.md`. The `summary.json`
fields and the value its `version` takes are
`.qfai/assistant/skill/qfai-implement/references/review-artifact-layout.md`.

## Cycle

1. **Gate first.** Run the stage's own validate gate through `common-gate-run`
   on the snapshot the reviewers will read, and require exit 0 with zero
   errors. `<paths.outDir>/validate.log` is written by the CLI on every run; its
   `run_log:` line must name the newest `run-*/` directory. No shell
   redirection is needed.
2. **Build the request.** Carry prior answers and newly answered demands into
   the next cycle's `review_request.md` before dispatching reviewers, under
   `.qfai/assistant/rule/review-convergence.md#answered-demands-must`. Where
   the stage evidence has a `## Grilling Session` block, copy it in: the
   reviewer rules on it and should not have to look for it.
3. **Dispatch.** Send each reviewer a work order in the shared template, with
   the invocation's run start. An agent that authored, edited or recommended a
   decision in the reviewed artifact is not its independent reviewer; inside a
   run, `actorHistory` says who that is. Require every field of the shared
   reviewer response template. `Reviewed revision` follows
   `.qfai/assistant/skill/qfai-implement/references/evidence-revision.md`, and
   `Audited evidence hash` follows `.qfai/assistant/rule/audited-evidence-hash.md`
   wherever ATDD or implementation evidence is audited.
4. **On a blocking REVISE**, fix the finding in its owning source with the
   smallest edit that resolves it, and leave unaffected content alone. An
   upstream finding is not repaired here: stop under
   `.qfai/assistant/rule/drift-protocol.md`. Then rerun the gate.
   - Then rerun that reviewer, and any reviewer whose scope the fix changed.
   - Each new cycle gets a new pack.
5. **Complete** only when every routed blocking reviewer returns `PASS` on the
   same final revision. A pending response is not `PASS`. The round budget and
   its escalation are
   `.qfai/assistant/rule/review-convergence.md#round-budget-must`.

## summary.json

- In-flight responses are `PASS` or `REVISE`.
- A REVISE is written as `status: "FAIL"` when `summary.json` is written. Do
  not invent a third verdict.
- Serialized reviewer statuses are `PASS`, `FAIL` and `NA`.
- `overall_status` is `PASS` only when every routed blocking reviewer passed
  and no unresolved `FAIL` remains.
- A cycle that received no response still gets a summary: `overall_status`
  `FAIL` and an empty `reviewers` list.
- `revision_form` and `revision` name the state the verdicts describe. A stale
  verdict does not clear a changed target.
- Keep rerun history append-only.

## Seal

Once a pack has its final responses and `summary.json`, seal it as
`.qfai/assistant/skill/qfai-implement/references/evidence-revision.md#review-pack-seal`
sets out, and record the pack path and seal **outside the pack**, in the stage
evidence. The pack is immutable after sealing; a later attempt gets a new pack
and a new seal.

Before reporting completion, recompute every recorded seal, and recompute the
audited hash of the evidence subject the completion reviewer read. A mismatch
means something moved after the verdict: request a fresh review of the current
subject. A passing validate run does not replace this check.

## Rounds of tested evidence

Where the stage's evidence records test observations, a blocking finding opens
a new round for the affected test.

- Keep the earlier observation and the response that rejected it. Append the
  changed test, revision, command, result and review response.
- Never rewrite a sealed pack, and never relabel an old result as current.
- After changing a test or its fixture, verify its oracle again before asking
  for review. Where the behaviour already passes, use the owner's controlled
  falsifiability path; for an acceptance test that is
  `.qfai/assistant/skill/qfai-atdd/references/red-provenance.md`.
- Where a production change alone answered the finding, rerun the
  selected test and the relevant suite, keep the original RED subject and
  record the new result.
- The round block's own fields are the owner's:
  `.qfai/assistant/skill/qfai-implement/references/round-evidence.md` for an
  example, the acceptance evidence file for a business flow or criterion.

## Writes

- The pack, where the owner has a producer.
- In the stage evidence: each reviewer's verdict and revision, the findings, the
  repairs, the rerun commands, the pack path and seal, and the final blocking
  verdicts.

## Gate

Every routed blocking reviewer returned `PASS` on the final revision, the
recorded seals recompute, and the evidence names each verdict. Anything short of
that is reported with the open findings, not as a pass.
