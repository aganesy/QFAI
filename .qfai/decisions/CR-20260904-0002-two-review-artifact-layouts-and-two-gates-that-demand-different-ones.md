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
- Applied at: `2026-09-04T12:21:44+09:00` — when the `confirm-only` rerun's output was
  written to `.qfai/specs/spec-0012/09_delta.md`; see **Timestamps**
- Superseded by: `-`

## Context

`validate --profile prototyping` and `qfai prototyping certify` read different
reviewer artifacts:

| gate                                 | reads                                                                                                                                                                | payload                                                                                                       |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `validate` reviewer-deliverable gate | flat `iter-NN/review.json`                                                                                                                                           | `EvaluatorReview` (`iterIndex`, `reviewerId`, `scores`, `proseCritique`, `pivotDirective`, `evidenceRefs`, …) |
| `certify`                            | `iter-NN/spec-NNNN/<screen>.review.json` once that layout exists — it checks each expected file **exists** (`fileExists`, `:702-705`) and does not parse the payload | the contract declares `ReviewerPayload` (`specId`, `screenId`, `cycle`, `ordinalAxes`, `impressions`, …)      |

They are not mutually exclusive in every configuration: an iteration carrying
**both** satisfies both gates. What neither gate tolerates is per-spec artifacts
**without** the flat one — `validate`
reports `prototypingEvidence.review.missing`, `QFAI-PROT-002` is on
`core/prototyping/mode.ts`'s hard-error list so exploration mode does not soften
it, and `certify` refuses to seal unless `validate.json#counts.error === 0`.

This CR does **not** resolve which artifact is canonical. That is deferred by
the approval above; the CR exists because recording the deferral touches
`08_Open-questions.md`, which `constitution/drift-protocol.md#core-rule` lists
as upstream SSOT.

## Reachability, measured

`validate` requires the flat `iter-NN/review.json` for every recorded non-seed
iteration. `certify` reaches its layout branch (`prototypingCertify.ts:633`)
only after loading `validate.json` (`:286-319`) and reading and validating
`frozenSpecsCovered` (`:586-622`) — so an ordering claim matters here and an
earlier revision of this CR had it backwards.

What that ordering means in practice: a per-spec-only iteration makes `validate`
report `prototypingEvidence.review.missing`, so `certify` stops at its
`validate.json#counts.error` check (`:286-319`) and never reaches the per-spec
presence gate at `:633` at all. The per-spec files that gate would look for are
present, and it only checks that they exist — so they cannot help either way.
The project passes neither command:

> per-spec present AND flat absent, on a recorded non-seed iteration

**On the premise that `validate` re-ran after the layout changed.** `certify`
gates on the **stored** `validate.json` and checks three things about it — that
it exists, that its `profile` is `prototyping`, and that its `counts.error` is
0 (`:286-319`). It establishes no correspondence with the evidence it is about
to seal: no `generatedAt`, no digest, no mtime relation. The only freshness
relation in the file is the upgrade-promotion mtime check at `:1216-1294`, which
compares a gates signal against the certificate rather than the validate result
against the tree, and `:1244-1249` documents the missing link as a known
limitation.

So the sequence "flat present -> `validate` succeeds -> flat removed, per-spec
written -> `certify`" does **not** stop at the `counts.error` gate. The stale
success passes it, `hasPerSpecSubdir` is true, the per-spec files satisfy the
per-spec gate, and `:933-952` seals — `certify` never reads the flat
`iter-NN/review.json` at all (`:663` names it only as the legacy fallback). That
path is a defect in its own right, independent of the layout contradiction this
CR is about, and is filed as **#1107**.

It is stated here because the guard deferred to #1093 must not be designed
against a safety that only holds for a fresh `validate`. "Neither command
passes" is a claim about what the two commands _demand_, not a claim that the
sequence is unreachable.

Two consequences worth stating, because earlier revisions of this CR got both
wrong:

- **it does not need a multi-spec frozen set.** The frozen set is read first,
  but a well-formed single-spec one passes that check and reaches the layout
  branch, which then takes the per-spec path. So the single-spec freeze in
  `prototypingIterate.ts` and `TC-0012-0388` do not prevent this. (A _malformed_
  frozen set exits 2 earlier and never reaches it — a different failure, not a
  mitigation.);
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

- Specs: `spec-0012` — `08_Open-questions.md` (the open question) and `09_delta.md`
  (the `confirm-only` rerun's CR reference)
- Tests, code, contracts, schema: none

## Decision needed from user

Which review artifact is canonical — per-spec, flat, both — or is the choice
deferred and only the contradiction recorded?

**Answered: defer.** Record the contradiction and leave code and contracts as
they are, paying the decision cost when a wire-in needs it.

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd 0012` rerun scope: **`confirm-only`**. One open-question entry is
   appended by hand under the approval above; no acceptance criterion, business
   rule, example or test case changes. Per
   `constitution/drift-protocol.md` step 4, that rerun's output is the CR
   reference recorded in the spec's delta log — see
   `.qfai/specs/spec-0012/09_delta.md`, entry `2026-09-04`.
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
- `.qfai/specs/spec-0012/09_delta.md` — the `2026-09-04` entry recording this CR,
  its mode and its invocation, which is the `confirm-only` rerun's output.
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

| field               | value                       | anchor                                                                                 |
| ------------------- | --------------------------- | -------------------------------------------------------------------------------------- |
| `Raised at`         | `2026-09-04T05:10:24+09:00` | the correction comment on issue #1078                                                  |
| `Approved at`       | `2026-09-04T05:20:00+09:00` | the conversation turn — the one estimate, bounded by the two rows around it            |
| `Scope extended at` | `2026-09-04T07:10:00+09:00` | the conversation turn approving it                                                     |
| `Applied at`        | `2026-09-04T12:21:44+09:00` | the commit that first carried the `confirm-only` rerun's CR reference in `09_delta.md` |

`Applied at` is when the owner-skill rerun completed and the upstream artifacts were
updated, which is what `skills/qfai-sdd/templates/change-request.md` defines it as —
not a commit hash. The
scope extension's outcome reversed three times on PR #1092 — a guard was added,
replaced, then removed with its requirement moved to #1093 — and each reversal made a
previously-correct hash describe this CR as resolved before its result existed. A date
plus the PR is stable under that; a hash is not.

### What moves `Applied at`, and what does not

`Applied at` is when the owner-skill rerun completed and the upstream artifacts
carried the approved change — `skills/qfai-sdd/templates/change-request.md:20`.

Commits after that point corrected **defects in the applied text**: wording that
misstated `certify`'s branch order, a table disagreeing with its header, a
sentence broken by a line-index edit. Those are repairs to the application, not
new applications, and they do not move `Applied at`. What would move it is a
further approved change to an upstream artifact — there has been none.

Recorded because the field was re-pointed four times during review, each time
chasing the newest commit, which is the wrong rule.
