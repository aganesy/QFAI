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
- Scope extended at: `2026-09-04T07:10:00+09:00` (approved by `yusuke_senaga`; first
  attempt applied in `1a6dfee7`, final outcome in `f69ea5f`) — see
  **Scope extension: guard the reachability** below
- Applied at: `2026-09-04T11:35:00+09:00` (commit `f69ea5f`, the final outcome;
  first applied `2026-09-04T05:34:35+09:00` in `cdeebe5e` — see **Timestamps**)
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
  multi-spec run uncertifiable."_ That freeze was BELIEVED to be what held the
  two gates apart. **It is not** — see the scope extension below: `certify`
  branches on `hasPerSpecSubdir` before it reads the frozen set, so a
  per-spec-only writer contradicts `validate` for a single-spec frozen set as
  well. The freeze makes multi-spec prototyping unreachable; it does not make
  the contradiction unreachable.
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
  deferral and, per the scope extension above, ships no guard; `src/`,
  `.qfai/contracts/**` and the test suite are untouched.
- Overlapping open CRs: `none`

## Impact scope

- Specs: `spec-0012` (`08_Open-questions.md` only)
- Plans: `-`
- Tests: `-` (the scope extension's guard is deferred to a follow-up issue)
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

## Scope extension: guard the reachability — moved out, with a specification

Approved separately, 2026-09-04, to stop the deferral resting on a comment. It
is **not delivered here**, and the reason is worth more than another attempt:

**A correct guard for this trigger cannot be written before the implementation
it guards.** Seven drafts were tried across seven review rounds and each was
refuted — not by carelessness in the draft, but because every one is a guess
about the shape of code that does not exist yet. `dispatchReviewerToPair` has
zero production callers; the wire-in is `OQ-0012-0007`, unimplemented.

The last round made that concrete from both sides at once: the guard's fixture
declares no `.qfai/contracts/ui/*.yaml` screens and injects no
`playwrightRunner`, so the real `(spec, screen)` dispatch path would execute
**zero times** against it and the guard would stay green; and the guard scanned
every `iter-NN` on disk, while `validate` only requires the flat review for
**recorded non-seed** iterations and `certify` only inspects the
`acceptedIterationIndex` directory — so an ordinary migration that creates a
working `iter-01/spec-0001/` before recording the iteration would have reddened
it with neither gate contradicting.

Under- and over-sensitive at once, and correcting either needs a harness for the
unwritten path.

### The seven refuted drafts, as a specification

Each is recorded because together they are the requirement list a correct guard
has to satisfy:

| draft                                                    | refuted by                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| calls to two entry points                                | an **import alias** — `src/` carries 51 aliased named imports                                                                                                                                                                                                                                                                                                                                        |
| + aliases, namespaces                                    | an **`export *` barrel** — `src/` carries 30 star re-exports                                                                                                                                                                                                                                                                                                                                         |
| + barrels, forwarding exports                            | a **dynamic `import()`** — used in 9 modules; `prototypingIterate.ts` already loads six sibling `core/prototyping/*` modules that way                                                                                                                                                                                                                                                                |
| module edges into the declaring modules                  | a **category error**: `prototypingCertify.ts:702` composes `iter-NN/spec-NNNN/<screen>.review.json` from a template string with **zero** edges into `iterationPaths.ts`, so "no edge" meant "these two helpers are unused", never "the layout is unreachable"                                                                                                                                        |
| "no per-spec directory is produced"                      | **dual-write** — flat kept, per-spec added, both gates satisfied. The assertion would have blocked the safe migration                                                                                                                                                                                                                                                                                |
| "no guard needed, `TC-0012-0388` covers it"              | **two false premises**: `certify` branches on `hasPerSpecSubdir` _before_ the frozen set, so a single-spec per-spec-only writer contradicts `validate` immediately; and `TC-0012-0388` contradicts its own TC (`06_Test-Cases.md:623-629` asks for **both** spec IDs of the 2-spec fixture, the test asserts one), so lifting the freeze restores conformance rather than requiring a Change Request |
| "per-spec present AND flat absent", over every `iter-NN` | **scope**: neither gate looks at unrecorded iterations, and the fixture never reaches the dispatch path                                                                                                                                                                                                                                                                                              |

### What a correct guard must satisfy

- fire when an iteration that `validate` audits carries per-spec artifacts and no flat `review.json`;
- **not** fire on dual-write, on unrecorded working directories, or on a cleanup-helper wire-in;
- exercise the real `(spec, screen)` dispatch path — declared screens, an injected runner — rather than a fixture that path never touches;
- be independent of `frozenSpecsCovered`, and of the route used to write the artifacts.

Tracked as a follow-up issue against `OQ-0012-0006` / `0007`, to be built with
the wire-in rather than ahead of it.

### Impact of this CR, as merged

- Specs: `spec-0012` — `08_Open-questions.md` only
- Tests: none
- Code, contracts, schema: none

Also noted and not chased: the `TC-0012-0388` ledger row cites `DR-0012-0028`,
which **does** exist — `07_Decisions.md:115`, "MAX_ITERATIONS = 10 (cycles
0..9)" — but decides the iteration budget and says nothing about the frozen-set
expectation. So the divergence between that TC and its implementing test is not
covered by a recorded deviation, and the citation should not be read as
covering it.

(An earlier revision of this CR claimed the DR was absent. That was wrong: the
search behind it looked in `_policies/08_Decisions.md`, a path this spec does
not have, and its fallback did not run — a search that never happened, read as
evidence of absence. Raised by review on PR #1092.)

## Timestamps

### Applied-at, after the fact

`Applied at` names the commit carrying the **final** outcome, `f69ea5f`, not the
first attempt. The distinction matters here because the scope extension's
outcome reversed twice: `1a6dfee7` added a guard, later drafts replaced it, and
`f69ea5f` removed it and moved the requirement to #1093. A reader taking
`cdeebe5e` (the first CR commit) as the applied time would conclude this CR was
resolved before its result existed.

| commit     | what it applied                                               |
| ---------- | ------------------------------------------------------------- |
| `cdeebe5e` | the original record — the contradiction and the deferral      |
| `1a6dfee7` | the scope extension's first guard, since deleted              |
| `f69ea5f`  | the final outcome: no guard here, requirements moved to #1093 |

Raised by review on PR #1092, after the timezone correction below.

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
