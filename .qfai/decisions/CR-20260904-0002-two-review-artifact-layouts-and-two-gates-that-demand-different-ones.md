# Change Request

- ID: `CR-20260904-0002`
- Title: `validate and certify demand mutually exclusive review-artifact layouts`
- Raised by: `claude-code (issue #1078 investigation)`
- Raised at: `2026-09-04T05:00:00Z`
- Class: `intent`
- Status: `approved`
- Approved by: `yusuke_senaga`
- Approved at: `2026-09-04T05:20:00Z`
- Approved option: `record-only (defer the canonical-artifact decision)`
- Scope extended at: `2026-09-04T07:10:00Z` (approved by `yusuke_senaga`) — see
  **Scope extension: guard the reachability** below
- Applied at: `2026-09-04T05:45:00Z`
- Superseded by: `-`

## Context

`validate --profile prototyping` and `qfai prototyping certify` require reviewer
artifacts in mutually exclusive places for a multi-spec frozen set:

| gate                                 | layout                                   | payload                                                                                                       |
| ------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `validate` reviewer-deliverable gate | flat `iter-NN/review.json`               | `EvaluatorReview` (`iterIndex`, `reviewerId`, `scores`, `proseCritique`, `pivotDirective`, `evidenceRefs`, …) |
| `certify` multi-spec branch          | `iter-NN/spec-NNNN/<screen>.review.json` | `ReviewerPayload` (`specId`, `screenId`, `cycle`, `ordinalAxes`, `impressions`, …)                            |

A project that satisfies `certify` fails `validate` with
`prototypingEvidence.review.missing` on every non-seed iteration.
`QFAI-PROT-002` is on `core/prototyping/mode.ts`'s hard-error list so
exploration mode does not soften it, and `certify` refuses to seal unless
`validate.json#counts.error === 0`. Uncertifiable either way.

This CR does **not** resolve which artifact is canonical. That decision is
deferred by the approval above; the CR exists because recording the deferral
touches `08_Open-questions.md`, which
`constitution/drift-protocol.md#core-rule` lists as upstream SSOT.

## Measured, so the deferral rests on facts

On `main` at `aa7bcd23`:

- `iterationReviewPathPerSpec` — **zero production callers**.
- `reviewerDispatch.ts` — **zero production callers**.
- `prototypingIterate.ts:828-839` freezes `frozenSpecsCovered` single-spec on
  purpose, and its comment names this contradiction as the reason: _"certify
  already hard-fails any multi-spec frozen set on the flat-iter layout, so
  persisting the full UI-bearing union here would render every normal
  multi-spec run uncertifiable."_ That freeze is the only thing holding the two
  gates apart — and what makes multi-spec prototyping unreachable.
- `scores` **is** `ordinalAxes`: the same four axes on the same four-value
  ordinal scale. `layoutAntiPatternsDetected` and `designMdViolations` are
  identical. Issue #1078 claimed otherwise and is corrected on the issue.
- `pivotDirective`, `evidenceRefs` and `reviewerId` are **absent from
  `ReviewerPayload` entirely**, so adopting the per-spec layout while keeping
  the flat gate's obligations means extending a contract-declared closed
  schema, not writing a mapping.

## Blocked downstream items

| Item           | Kind            | Why it depends on the artifact                                               |
| -------------- | --------------- | ---------------------------------------------------------------------------- |
| `OQ-0012-0006` | `open-question` | Per-spec iter-dir wire-in cannot land until the canonical artifact is chosen |
| `OQ-0012-0007` | `open-question` | Reviewer-dispatch wire-in has no stable target until then                    |
| `OQ-0012-0008` | `open-question` | `parseEvaluatorReview` runtime wire-in reads whichever wins                  |

- Not blocked: no ledger row, test or contract changes. This CR records a
  deferral; `src/` and `.qfai/contracts/**` are untouched.
- Overlapping open CRs: `none`

## Impact scope

- Specs: `spec-0012` (`08_Open-questions.md` only)
- Plans: `-`
- Tests: `-`
- Contracts: `-` (a change would be needed under options A and C; neither is
  chosen here)
- Schema: `-`

## Decision needed from user

Which review artifact is canonical — per-spec, flat, or both — or defer?

**Answered: defer.** Record the measured contradiction and leave code and
contracts as they are, paying the decision cost when a multi-spec frozen set is
actually needed.

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd 0012` rerun scope: **`confirm-only`**. One open-question entry is
   appended by hand under the approval above; no acceptance criterion, business
   rule, example or test case changes, so there is no derivation to re-run.
2. Downstream ledger sweep: none. No `spec-0012` ledger row changes status,
   test file or selector.

## Resolution

Applied by hand under the approval above, `confirm-only`:

- `.qfai/specs/spec-0012/08_Open-questions.md` — `OQ-0012-0013` appended,
  disposition `deferred`, recording the contradiction, the five measured facts,
  the three options with their real costs, and the trigger that ends the
  deferral (the first multi-spec frozen set, or the OQ-0012-0006 / 0007
  wire-in).
- No other artifact is edited. In particular the single-spec freeze in
  `prototypingIterate.ts` stays exactly as it is: it is the mitigation, and
  `OQ-0012-0013` is the record that its comment is load-bearing.

## Scope extension: guard the reachability

Approved separately, 2026-09-04. The canonical-artifact decision stays
deferred — nothing below changes it — but the deferral is now **guarded**
rather than resting on a comment.

Before this, three things held the contradiction apart and only two of them
could fail:

| held apart by                                                     | covered?                                                                     |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `certify` exits 64 for a multi-spec frozen set on the flat layout | yes — `frozenSpecsCovered: ["0012", "0007"]` in `prototypingCertify.test.ts` |
| the flat gate reports `prototypingEvidence.review.missing`        | yes — `prototypingEvidence.test.ts`                                          |
| `iterate` freezes `frozenSpecsCovered` single-spec                | yes — `TC-0012-0388` seeds a second UI-bearing spec and asserts one entry    |
| **the per-spec entry points have no production caller**           | **no — nothing failed when that changed**                                    |

The last row was the gap: a wire-in of `iterationReviewPathPerSpec` or
`dispatchReviewerToPair` would make the contradiction live on real projects,
and no test would say so. `OQ-0012-0013` named that as the trigger ending the
deferral, but naming a trigger is not detecting it.

`packages/qfai/tests/unit/reviewLayoutContradiction.test.ts` adds two rows:

1. no production module calls either per-spec entry point;
2. the reviewer-deliverable gate still calls `iterationReviewPath` (the flat
   helper) and does not call `iterationReviewPathPerSpec` — so the gate cannot
   move to the per-spec layout without the record being updated.

Neither row asserts the contradiction is acceptable. Each failure message says
the decision now has to be made, names this CR and `OQ-0012-0013`, and says the
guard should be moved or deleted as that decision requires — rather than telling
the reader to revert.

Existing coverage is not duplicated: the three covered rows above already have
behaviour tests, and this file asserts none of them.

The rows find call sites with the TypeScript parser rather than by reducing the
source and matching a regex. The first draft did the latter and two things were
wrong with it: no module in `src/` names either helper with an argument list in
prose, so the reduction was doing no work at all here; and matching `NAME(`
also matched the DECLARATIONS, which forced an exemption for the declaring
modules — an exemption that would then have hidden a caller added _inside_ one
of them, a plausible way for a wire-in to begin. A declaration is not a
`CallExpression` and comments never enter the AST, so the parser needs neither
exemption. Same lesson as #1061 and #1089.

Verified by mutation, since a guard meant to sit dormant is exactly the kind
whose broken predicate goes unnoticed:

| mutation                                                        | result          |
| --------------------------------------------------------------- | --------------- |
| a production module starts calling `iterationReviewPathPerSpec` | **row 1 fails** |
| the gate stops calling `iterationReviewPath`                    | **row 2 fails** |
| restored                                                        | **both pass**   |
