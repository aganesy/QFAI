---
name: common-review-cycle
owner: common
purpose: "Review what a stage wrote, once, after its last step: build the review pack, dispatch the independent reviewers once, fix or answer every finding, and seal the result."
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

- **The reviewer set.** The specification review: `requirements-reviewer`,
  joined by `architecture-reviewer` when a contract changed. The code review of
  the whole diff: `implementation-reviewer`. On a flow a UI contract with
  screens serves, `product-surface-reviewer` joins either review.
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

Start from the templates under
`.qfai/assistant/skill/qfai-discussion/templates/review/` and replace the
producer, scope, target and review focus with this stage's. The `summary.json`
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
4. **Address every finding** once: fix it in its owning source with the
   smallest edit that resolves it, or record a reasoned answer beside it. An
   upstream finding is not repaired here: stop under
   `.qfai/assistant/rule/drift-protocol.md`. Rerun the gate after the fixes.
   No reviewer is rerun.
5. **Complete** once every reviewer has responded and every finding is fixed or
   answered. A finding the author cannot fix goes in the stage's final report;
   a critical decision goes to the user
   (`.qfai/assistant/rule/review-convergence.md#one-review-must`).

## summary.json

- In-flight responses are `PASS` or `REVISE`.
- A REVISE is written as `status: "FAIL"` when `summary.json` is written. Do
  not invent a third verdict.
- Serialized reviewer statuses are `PASS`, `FAIL` and `NA`.
- `overall_status` is `PASS` when every finding is fixed or answered, and
  `FAIL` while one is neither.
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

Every routed reviewer responded once, every finding is fixed or answered, the
recorded seals recompute, and the evidence names each verdict and each answer. A
finding the author cannot fix is in the stage's final report, and a critical
decision has gone to the user.
