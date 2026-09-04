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
| `iterate` freezes `frozenSpecsCovered` single-spec                | yes — `TC-0012-0388`                                                         |
| **`iterate` does not PRODUCE the per-spec layout**                | **no — nothing failed when that changed**                                    |

The last row is the trigger `OQ-0012-0013` names, and naming a trigger is not
detecting it. The moment `iterate` writes `iter-NN/spec-NNNN/`, a real project
holds artifacts that `certify` requires and `validate` rejects, and `certify`
will not seal while `validate` reports errors.

### What ships

One behavioural row, beside `TC-0012-0388` in
`packages/qfai/tests/cli/commands/prototypingIterate.test.ts`: run cycle 0 with
two UI-bearing specs available, then walk `.qfai/evidence/prototyping/` and
assert **no `iter-NN/spec-NNNN/` directory exists** — the exact shape
`certify`'s own `hasPerSpecSubdir` decides on. The row also asserts at least one
`iter-NN` directory was produced, so a run that wrote nothing cannot pass it
vacuously.

Its failure message names this CR and `OQ-0012-0013` and says the decision now
has to be made, rather than asking the reader to revert.

### Why not a structural guard

Three drafts before this one were structural, and each was defeated in review:
by an alias, by an `export *` barrel, by a dynamic `import()`. The fourth
draft — pinning module edges into `core/prototyping/iterationPaths.ts` and
`reviewerDispatch.ts` — was abandoned for a stronger reason than another
evasion: **it measured the wrong thing.**

`cli/commands/prototypingCertify.ts:702` already composes

```ts
`${PROTOTYPING_EVIDENCE_REL}/${acceptedIterDir}/${specDirName}/${screen.screenId}.review.json`;
```

from a template string, with **zero** edges into either declaring module. So
"no module edge" never meant "the per-spec layout is unreachable"; it meant
"these two helper modules are unused", and the counterexample was in the tree
the whole time. A wire-in following that same existing pattern would have left
every structural row green.

The behavioural row cannot be reached around, because it looks at the artifact
rather than at the route taken to produce it.

The structural file is deleted rather than kept alongside. Its remaining row —
"the gate still reads the flat layout" — is redundant: switching the gate to a
per-spec path reddens **27 of the 50** cases in `prototypingEvidence.test.ts`,
which seed flat `review.json` files and assert what the gate reports. A
structural restatement of that would add detection of nothing while carrying the
false-positive risks review kept finding in it.

### Verified by mutation

The wire-in shape from the finding above, injected into `prototypingIterate.ts`:
a template-string `iter-NN/spec-NNNN` directory, touching neither declaring
module.

| state                                    | result    |
| ---------------------------------------- | --------- |
| baseline                                 | **green** |
| per-spec layout produced, no helper used | **red**   |
| restored                                 | **green** |

The first attempt at that mutation reported green for the wrong reason — it
injected before a later step that rewrites the iteration directory, so the probe
directory did not survive the run. Instrumenting settled it (`PROBE created
…/iter-00/spec-0001`, `PROBE perSpec=[]`) and the injection moved past that
step. A mutation that does not redden is either not applied or not observed, and
the difference matters.

### One gap, stated

`tests/cli/commands/prototypingIterate.test.ts` is not in
`tsconfig.tests.json#include`, so the new row is not type-checked. Enumerating
it was measured and rejected for this change: it surfaces **pre-existing** type
errors in that file (`body.iterations` is `unknown` at three call sites) that
have nothing to do with this decision. The row is short and uses only fixture
helpers already exercised by the 104 tests beside it.

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
