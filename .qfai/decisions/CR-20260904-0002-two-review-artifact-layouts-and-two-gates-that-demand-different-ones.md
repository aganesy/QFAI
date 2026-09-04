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

Approved separately, 2026-09-04, to stop the deferral resting on a comment. It
took six review rounds to find the condition that is actually correct, and the
wrong answers are recorded here because each was plausible.

### The condition

`validate`'s reviewer-deliverable gate requires the flat `iter-NN/review.json`.
`certify` branches on `hasPerSpecSubdir` **first**: once a per-spec layout
exists it validates `iter-NN/spec-NNNN/<screen>.review.json` alone — for a
single-spec frozen set as much as a multi-spec one. So the gates contradict as
soon as an iteration carries per-spec artifacts **without** the flat one:

> per-spec present AND flat absent -> the contradiction is live

A **dual-write** migration — flat kept, per-spec added — satisfies both gates
and must not be blocked.

`packages/qfai/tests/cli/commands/prototypingIterate.test.ts` asserts that
implication over every `iter-NN` directory after a cycle-0 and a cycle-1 run.

### Verified in all three directions

An implication needs all three legs checked, and two earlier drafts of this PR
shipped a guard that failed one of them:

| produced state                  | expected  | result    |
| ------------------------------- | --------- | --------- |
| flat only (status quo)          | green     | green     |
| **per-spec, no flat**           | **red**   | **red**   |
| **dual-write: per-spec + flat** | **green** | **green** |
| restored                        | green     | green     |

### The five wrong answers, and what refuted each

| draft                                            | refuted by                                                                                                                                                                                                                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| calls to two entry points                        | an **import alias** — `src/` carries 51 aliased named imports                                                                                                                                                                                                            |
| + aliases, namespaces                            | an **`export *` barrel** — `src/` carries 30 star re-exports                                                                                                                                                                                                             |
| + barrels, forwarding exports                    | a **dynamic `import()`** — used in 9 modules, and `prototypingIterate.ts` already loads six sibling `core/prototyping/*` modules that way                                                                                                                                |
| module edges into the declaring modules          | a **category error**: `prototypingCertify.ts:702` composes `iter-NN/spec-NNNN/<screen>.review.json` from a template string with **zero** edges into `iterationPaths.ts`. "No module edge" meant "these two helper modules are unused", never "the layout is unreachable" |
| behavioural: "no per-spec directory is produced" | **dual-write.** That assertion blocks the safe compatible migration; the trigger is the flat artifact ceasing to be satisfied, not a per-spec directory existing                                                                                                         |
| "no guard needed — `TC-0012-0388` covers it"     | **two mistakes at once**, below                                                                                                                                                                                                                                          |

### Why "TC-0012-0388 covers it" was wrong

It was tempting: lifting the single-spec freeze reddens `TC-0012-0388`, while
the purpose-built test stayed green. Both premises behind the conclusion were
false.

1. **The contradiction does not need a multi-spec frozen set.** `certify`
   branches on the per-spec layout before it looks at the frozen set, so a
   single-spec per-spec-only writer contradicts `validate` immediately — with
   `TC-0012-0388` green throughout.
2. **Amending `TC-0012-0388` would not require a Change Request.** Its upstream
   TC (`06_Test-Cases.md:623-629`) asks for **both** spec IDs of the 2-spec
   fixture in `frozenSpecsCovered`, and `tdd/test-list.md:69` says "full
   UI-bearing set", while the implementing test asserts one ID. The test
   contradicts its own TC, so lifting the freeze to match the TC restores
   conformance rather than departing from it. The "it forces the decision"
   argument rested on that.

Noted in passing and not chased here: that ledger row cites `DR-0012-0028`,
which is not present under `.qfai/specs/spec-0012/`.

Nothing in `src/` or `.qfai/contracts/**` changes for this CR.

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
