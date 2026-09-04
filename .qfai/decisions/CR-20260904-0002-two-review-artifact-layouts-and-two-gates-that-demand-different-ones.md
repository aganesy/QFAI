# Change Request

- ID: `CR-20260904-0002`
- Title: `validate and certify demand mutually exclusive review-artifact layouts`
- Raised by: `claude-code (issue #1078 investigation)`
- Raised at: `2026-09-04T05:10:24+09:00`
- Class: `intent`
- Status: `approved`
- Approved by: `yusuke_senaga`
- Approved at: `2026-09-04T05:20:00+09:00`
- Approved option: `record-only (defer the canonical-artifact decision)`
- Scope extended at: `2026-09-04T07:16:04+09:00` (approved by `yusuke_senaga` before
  that commit) — see
  **Scope extension: guard the reachability** below
- Applied at: `2026-09-04T05:34:35+09:00`
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

## Scope extension: guard the reachability — measured, and not needed

Approved separately, 2026-09-04, to stop the deferral resting on a comment. The
work was done and the answer is that **no new guard is warranted**: the trigger
is already detected by an existing test. This section records the measurement so
the conclusion is checkable rather than asserted, and so nobody repeats it.

### The contradiction needs a multi-spec frozen set

`certify` hard-fails only a **multi-spec** frozen set on the flat layout; a
single-spec one takes an info-skip. So while `frozenSpecsCovered` is frozen
single-spec, no project can reach the state where `validate` and `certify`
disagree. `prototypingIterate.ts` freezes it single-spec on purpose, and its
comment cites this contradiction as the reason.

### That freeze is already pinned

`TC-0012-0388` seeds a second UI-bearing spec and asserts the frozen set stays
one entry. Measured by lifting the freeze — making the frozen set
multi-element — and running both candidates:

|                   | `TC-0012-0388` | a purpose-built reachability test |
| ----------------- | -------------- | --------------------------------- |
| baseline          | green          | green                             |
| **freeze lifted** | **red**        | **green**                         |
| restored          | green          | green                             |

The existing test catches it. The purpose-built one does not, because it watched
for the per-spec layout being _produced_, which is downstream of the freeze
rather than the freeze itself.

### And the proxies were wrong in their own right

Four structural drafts were tried and each was defeated in review — by an
import alias, by an `export *` barrel, by a dynamic `import()`, and finally by
the observation that `cli/commands/prototypingCertify.ts:702` composes
`iter-NN/spec-NNNN/<screen>.review.json` from a template string with **zero**
edges into `core/prototyping/iterationPaths.ts`. That last one was not another
evasion but a category error: "no module edge" meant "these two helper modules
are unused", never "the per-spec layout is unreachable", and the counterexample
was in the tree throughout.

The behavioural draft that replaced them asserted "no `iter-NN/spec-NNNN/`
directory is produced". Review showed that is not the trigger either: a
**dual-write** migration that keeps the flat `review.json` and adds per-spec
artifacts satisfies both gates, so the assertion would have blocked a safe
compatible migration. The trigger is the flat artifact ceasing to be satisfied,
not a per-spec directory existing.

### Conclusion recorded instead of a guard

The reachability is detected by `TC-0012-0388`, and `TC-0012-0388` is a
`spec-0012` test case — so lifting the freeze cannot be done quietly: it reddens
that test, and changing the test is an upstream SSOT edit requiring its own
Change Request. The control the scope extension was meant to add already exists,
and it is stronger than a test, because it forces the conversation rather than
only failing.

Nothing in `src/`, `.qfai/contracts/**` or the test suite changes for this CR.

## Timestamps

All times above are **JST (`+09:00`)**, which is this repository's local zone and
the zone the CR ID's date is taken from. They were first written as a JST wall
clock stamped with `Z`. Codex caught the consequence on PR #1092: `Scope
extended at: 2026-09-04T07:10:00Z` sat about 8h52m AFTER commit `1a6dfee7`
(`2026-09-03T22:17:50Z`), so the record claimed the extension was approved after
the change that applied it.

Each value is anchored to something checkable rather than estimated:

| field               | value                       | anchor                                |
| ------------------- | --------------------------- | ------------------------------------- |
| `Raised at`         | `2026-09-04T05:10:24+09:00` | the correction comment on issue #1078 |
| `Applied at`        | `2026-09-04T05:34:35+09:00` | commit `cdeebe5e` author time         |
| `Scope extended at` | `2026-09-04T07:16:04+09:00` | commit `1a6dfee7` author time         |

`Approved at` is the only estimate. The approval is a conversation turn and
leaves no artifact, so it is bounded below by `Raised at` and above by
`Applied at`, and the value sits inside that interval. It is not a logged
instant and should not be read as one.
