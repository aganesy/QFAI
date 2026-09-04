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

## Scope extension: guard the reachability

Approved separately, 2026-09-04. The canonical-artifact decision stays
deferred — nothing here changes it — but the deferral is now **guarded** rather
than resting on a comment.

Before this, four things held the contradiction apart and only three could fail:

| held apart by                                                     | covered?                                                                     |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `certify` exits 64 for a multi-spec frozen set on the flat layout | yes — `frozenSpecsCovered: ["0012", "0007"]` in `prototypingCertify.test.ts` |
| the flat gate reports `prototypingEvidence.review.missing`        | yes — `prototypingEvidence.test.ts`                                          |
| `iterate` freezes `frozenSpecsCovered` single-spec                | yes — `TC-0012-0388` seeds a second UI-bearing spec and asserts one entry    |
| **the per-spec layout is not reachable from production code**     | **no — nothing failed when that changed**                                    |

The last row was the gap. `OQ-0012-0013` named that reachability as the trigger
ending the deferral, but naming a trigger is not detecting it.

`packages/qfai/tests/unit/reviewLayoutContradiction.test.ts` adds three rows:

1. **no production module takes a runtime edge into
   `core/prototyping/iterationPaths.ts` or `core/prototyping/reviewerDispatch.ts`**
   — static import, re-export, namespace import, or a dynamic `import("…")` —
   beyond the layout-neutral cleanup helpers `findStaleIterDirs` /
   `deleteStaleIterDirs`. Measured on the tree at the time: **zero** such edges,
   so the invariant is "still zero" rather than an allowlist of tolerated ones;
2. **the exported surface of those two modules is pinned** — the supply side, so
   a forwarding `export const x = iterationReviewPathPerSpec` is caught where it
   is written rather than only where it is used;
3. **`validateIterationReviewArtifacts` still reads the flat layout** and has not
   taken up the per-spec surface — resolved through the import binding, so an
   alias of the same helper is still the same helper.

Neither the contradiction nor its deferral is asserted to be acceptable. Each
failure message names the decision, this CR and `OQ-0012-0013`, and says the
guard should be moved or deleted as that decision requires — rather than telling
the reader to revert.

Existing coverage is not duplicated: the three covered rows above already have
behaviour tests, and this file asserts none of them.

### Why module edges rather than call shapes

Two earlier drafts chased the shape of the use — `name(…)`, then that plus
aliases and namespaces — and review found a further evasion each time: an
`export *` barrel, and a forwarding export inside the declaring module that has
no call at all. Chasing shapes loses, because there is always one more.

The module edge is the choke point: nothing in those modules can be used without
an edge into them, whatever it is later renamed to, assigned into or
re-published through, and a barrel chain is caught at its first link where the
barrel itself takes the edge.

Two false-positive directions are excluded deliberately, because a guard that
blocks a change which cannot make the contradiction live is as broken as one
that misses a change that can:

- **type-only imports** (`import type { X }` and `import { type X }`) bind
  nothing at runtime;
- **an alias of the flat helper** in the gate is the same helper, so row 3
  resolves the callee through the import binding instead of comparing names.

### Verified by mutation

A guard meant to sit dormant is exactly the kind whose broken predicate goes
unnoticed, so every row was run against the thing it guards actually happening,
and against the shapes it must tolerate. All sixteen rows behaved as specified:

| shape                                         | expected  | result |
| --------------------------------------------- | --------- | ------ |
| plain / aliased / namespace import            | red       | red    |
| assigned-then-called                          | red       | red    |
| named re-export                               | red       | red    |
| `export *` barrel reached by `import * as`    | red       | red    |
| forwarding export inside the declaring module | red       | red    |
| new internal wrapper                          | red       | red    |
| gate drops the flat helper                    | red       | red    |
| gate adopts the per-spec helper               | red       | red    |
| `import type` / `import { type … }`           | **green** | green  |
| flat helper imported under an alias           | **green** | green  |
| a cleanup helper wired in                     | **green** | green  |
| baseline, and after restore                   | green     | green  |

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
