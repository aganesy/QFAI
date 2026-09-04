# Change Request

- ID: `CR-20260904-0002`
- Title: `validate requires the flat review artifact; certify accepts the per-spec one, so a per-spec-only writer satisfies neither`
- Raised by: `claude-code (issue #1078 investigation)`
- Raised at: `2026-09-04T05:10:24+09:00`
- Class: `intent`
- Status: `approved`
- Approved by: `yusuke_senaga`
- Approved at: `2026-09-04T05:20:00+09:00`
- Approved option: `record-only (defer the canonical-artifact decision)`
- Scope extended at: `2026-09-04T07:10:00+09:00` (approved by `yusuke_senaga`) — see
  **Scope extension: the guard is deferred to #1093** below
- Applied at: `2026-09-04T11:35:00+09:00` (commit `f69ea5f` — see **Timestamps**)
- Superseded by: `-`

## Context

`validate --profile prototyping` and `qfai prototyping certify` read different
reviewer artifacts:

| gate                                 | reads                                                            | payload                                                                                                       |
| ------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `validate` reviewer-deliverable gate | flat `iter-NN/review.json`                                       | `EvaluatorReview` (`iterIndex`, `reviewerId`, `scores`, `proseCritique`, `pivotDirective`, `evidenceRefs`, …) |
| `certify`                            | `iter-NN/spec-NNNN/<screen>.review.json` once that layout exists | `ReviewerPayload` (`specId`, `screenId`, `cycle`, `ordinalAxes`, `impressions`, …)                            |

They are not mutually exclusive in every configuration: an iteration carrying
**both** satisfies both gates. What neither gate tolerates is per-spec artifacts
**without** the flat one — `certify` validates the per-spec files, `validate`
reports `prototypingEvidence.review.missing`, `QFAI-PROT-002` is on
`core/prototyping/mode.ts`'s hard-error list so exploration mode does not soften
it, and `certify` refuses to seal unless `validate.json#counts.error === 0`.

This CR does **not** resolve which artifact is canonical. That is deferred by
the approval above; the CR exists because recording the deferral touches
`08_Open-questions.md`, which `constitution/drift-protocol.md#core-rule` lists
as upstream SSOT.

## Reachability, measured

`certify` branches on `hasPerSpecSubdir` **before** it reads the frozen set, so
once an iteration carries per-spec artifacts it validates those alone — for a
single-spec frozen set as much as a multi-spec one. `validate` keeps requiring
the flat `iter-NN/review.json`. So the contradiction is live for an iteration
that `validate` audits — recorded, non-seed — which carries per-spec artifacts
and no flat one:

> per-spec present AND flat absent, on a recorded non-seed iteration

Two consequences worth stating, because earlier revisions of this CR got both
wrong:

- **it does not need a multi-spec frozen set**, so the single-spec freeze in
  `prototypingIterate.ts` and `TC-0012-0388` do not prevent it;
- **dual-write is not the contradiction.** Keeping the flat artifact and adding
  per-spec ones satisfies both gates, so the two layouts are not mutually
  exclusive in every configuration — only per-spec-_only_ is. The wire-in can
  land on a dual-write path without this decision being made first.

Field correspondence, since the issue's own claim was wrong: `scores` **is**
`ordinalAxes` (same four axes, same four-value scale), and
`layoutAntiPatternsDetected` / `designMdViolations` are identical.
`pivotDirective`, `evidenceRefs` and `reviewerId` have **no** per-spec
counterpart, which makes "accept both" a contract change rather than a mapping.

## Blocked downstream items

| Item           | Kind            | Why it depends on the artifact                                         |
| -------------- | --------------- | ---------------------------------------------------------------------- |
| `OQ-0012-0006` | `open-question` | the per-spec iter-dir wire-in has to pick a layout, or ship dual-write |
| `OQ-0012-0007` | `open-question` | the reviewer-dispatch wire-in writes whichever is chosen               |
| `OQ-0012-0008` | `open-question` | `parseEvaluatorReview`'s runtime wire-in reads whichever wins          |

- Not blocked: no ledger row, test, code or contract change. This CR records a
  deferral and ships no guard.
- Overlapping open CRs: `none`

## Impact scope

- Specs: `spec-0012` — `08_Open-questions.md` only
- Tests, code, contracts, schema: none

## Decision needed from user

Which review artifact is canonical — per-spec, flat, or both?

**Answered: defer.** Record the contradiction and leave code and contracts as
they are, paying the decision cost when a wire-in needs it.

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd 0012` rerun scope: **`confirm-only`**. One open-question entry is
   appended by hand under the approval above; no acceptance criterion, business
   rule, example or test case changes.
2. Downstream ledger sweep: none.

## Scope extension: the guard is deferred to #1093

Approved separately, 2026-09-04, to stop the deferral resting on a comment. It
is **not delivered here**: seven drafts across nine review rounds were each
refuted, because a correct guard needs a fixture that exercises the
`(spec, screen)` dispatch path and that path does not exist —
`dispatchReviewerToPair` has zero production callers, and the wire-in is
`OQ-0012-0007`.

**#1093** carries the seven refuted drafts and the requirements a correct guard
must satisfy. It is built with the wire-in, against behaviour rather than
against a prediction of it.

## Resolution

Applied by hand under the approval above, `confirm-only`:

- `.qfai/specs/spec-0012/08_Open-questions.md` — `OQ-0012-0013` appended,
  disposition `deferred`, recording the contradiction, the reachability
  condition above, the three options with their costs, and the trigger.
- No other artifact is edited. The single-spec freeze in `prototypingIterate.ts`
  stays as it is — but it is **not** a mitigation for this contradiction, and
  `OQ-0012-0013` says so.

Also noted and not chased: the `TC-0012-0388` ledger row cites `DR-0012-0028`,
which exists (`07_Decisions.md:115`, "MAX_ITERATIONS = 10") but decides the
iteration budget and says nothing about the frozen-set expectation — so it does
not cover the divergence between that TC and its implementing test, which
asserts one spec ID where the TC asks for two.

## Timestamps

All times in the header are **JST (`+09:00`)**, the zone this repository's local
clock and the CR ID's date are in. They were first written as a JST wall clock
stamped `Z`, which names an instant nine hours later than the real one; on the
scope extension that recorded an approval after the commit applying it.

| field               | value                       | anchor                                                                      |
| ------------------- | --------------------------- | --------------------------------------------------------------------------- |
| `Raised at`         | `2026-09-04T05:10:24+09:00` | the correction comment on issue #1078                                       |
| `Approved at`       | `2026-09-04T05:20:00+09:00` | the conversation turn — the one estimate, bounded by the two rows around it |
| `Scope extended at` | `2026-09-04T07:10:00+09:00` | the conversation turn approving it                                          |
| `Applied at`        | `2026-09-04T11:35:00+09:00` | commit `f69ea5f`, which carries the **final** outcome                       |

`Applied at` names the final outcome deliberately. The scope extension's result
reversed twice — `1a6dfee7` added a guard, later commits replaced it, `f69ea5f`
removed it and moved the requirement to #1093 — so an earlier commit would
describe this CR as resolved before its result existed.
