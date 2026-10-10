# Review Payload Schema (`<screen>.review.json`)

SSOT for the per-UI-contract / per-screen review payload. The
product-surface-reviewer sub-agent returns it, the orchestrator writes it,
and the user reads what it finds before confirming the prototype.

The schema is **closed**: any key not listed below is rejected. The
orchestrator checks each payload against it before writing it, and asks the
reviewer again for one that does not conform before the prototype is put to
the user. A near-miss (extra key, misspelled field) fails the
whole file.

## Contents

- Path
- Shape (11 required top-level fields)
- Field rules
- Not accepted
- `sessionStatus` and the retry policy

## Path

```text
.qfai/prototype/iter-NN/<ui-contract-id>/<screen>.review.json
```

One file per (UI contract × screen × iteration). `<ui-contract-id>` is the full
`UI-NNNN` ID, and `<screen>` is declared in that contract's `screens[]`.
`<screen>.review.json` is the **only**
per-(UI contract × screen) artifact written for a review — no `.html`, no
`.png`, no `.interaction.json`.

The Reviewer's other result is the per-iteration summary
`iter-NN/review.json` (one per iteration, a different shape, set by
the reviewer prompt). It is not a per-screen artifact and
is never read against this schema.

## Shape (11 required top-level fields)

```ts
type ReviewerPayload = {
  uiContractId: string; // full UI-NNNN ID
  screenId: string; // non-empty; declared screen id
  cycle: number; // non-negative integer; the iteration index
  sessionStatus: "ok" | "retryExhausted" | "launchFailed";
  retryCount: number; // non-negative integer; retries actually consumed
  // One line each: what is wrong on this screen. Empty means nothing
  // stands between it and shipping.
  blockingFindings: string[];
  impressions: {
    // each <= 200 words
    operability: string;
    transitionFeel: string;
    crossScreenContinuity: string;
    userStoryFeel: string;
    acceptanceCriteriaFeel: string;
    menuReachabilityFeel: string;
  };
  layoutAntiPatternsDetected: string[]; // ids from the layout anti-pattern registry
  designMdViolations: {
    // closed too: `kind` + `found` only, no extra key per element
    kind: "color" | "font" | "radius" | "shadow" | "contrast";
    found: string;
  }[];
  wallTimeSec: number; // non-negative finite; Reviewer-measured
  softWarnings: {
    // enforced: must equal `wallTimeSec > 300` (5 min per session)
    timeBudget: boolean;
  };
};
```

The payload carries findings and bounded prose. It carries no rating:
a rating cannot be acted on, and a gate built on one can be satisfied
by overstating rather than by fixing.

## Field rules

| Field                        | Rule                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `uiContractId` / `screenId`  | full `UI-NNNN` ID / non-empty screen ID                                                                                                                                                                                                                                                                                                                                                         |
| `cycle`                      | non-negative integer, the iteration index                                                                                                                                                                                                                                                                                                                                                       |
| `sessionStatus`              | exactly one of `ok` / `retryExhausted` / `launchFailed`                                                                                                                                                                                                                                                                                                                                         |
| `retryCount`                 | non-negative integer                                                                                                                                                                                                                                                                                                                                                                            |
| `blockingFindings`           | array of strings; each entry is shown to the user                                                                                                                                                                                                                                                                                                                                               |
| `impressions`                | all 6 `*Feel` fields required, each a string of at most 200 words                                                                                                                                                                                                                                                                                                                               |
| `layoutAntiPatternsDetected` | array of strings; each entry is shown to the user                                                                                                                                                                                                                                                                                                                                               |
| `designMdViolations`         | array of `{kind, found}` (element closed: no other key); filled by the reviewer; each entry is shown to the user                                                                                                                                                                                                                                                                                |
| `wallTimeSec`                | non-negative finite number; informational, no upper bound                                                                                                                                                                                                                                                                                                                                       |
| `softWarnings`               | required, closed, single boolean key `timeBudget`                                                                                                                                                                                                                                                                                                                                               |
| `softWarnings.timeBudget`    | derived, not free-standing: must equal `wallTimeSec > 300` (per-session cap 300 s = 5 min per `(UI contract, screen)` session, not per UI contract — a multi-screen contract gets one budget per screen because each pair is dispatched as its own session and writes its own payload). A payload where the two disagree is wrong, so an over-budget session is never written with the flag off |

`menuReachabilityFeel` describing an unreachable menu entry is
accepted — the `*Feel` fields are qualitative critique, not gates.

## Not accepted

These keys belong to the per-iteration summary, **not** to this payload.
Writing any of them here breaks the closed schema:

`iterIndex`, `reviewerId`, `proseCritique`, `pivotDirective`,
and `evidenceRefs`.

## `sessionStatus` and the retry policy

`sessionStatus` records the outcome of the Reviewer Playwright session
for this (UI contract, screen) pair:

- `ok` — the session completed.
- `retryExhausted` — every attempt in the bounded retry budget failed
  (typically transient: timeouts, evaluation errors).
- `launchFailed` — the Reviewer could not be started at all. Kept
  distinct from `retryExhausted` so "we never tried" and "we tried and
  failed" stay separable.

The retry budget is `N = 3` attempts per (UI contract, screen) pair with
exponential backoff (`base * 2^attemptIndex` ms, `base = 250`).

Who records which status:

- The orchestrator dispatches the reviewer for each pair and runs the
  attempts. A session that completed is `ok`, including one that
  succeeded after earlier failed attempts: the reviewer returns
  `sessionStatus: "ok"` with the retries consumed in `retryCount`.
- When the reviewer cannot be started, or every attempt fails, no
  reviewer payload exists. The orchestrator writes the pair's payload
  itself, with `sessionStatus` `launchFailed` or `retryExhausted`,
  `retryCount` the retries consumed, every impression and array empty,
  `wallTimeSec` the time spent, and `softWarnings.timeBudget` derived
  from it.
- A payload that carries `retryExhausted` / `launchFailed` reviewed
  nothing. It adds nothing to the summary, and the user is told that pair
  was not reviewed.

`impressions.*` prose is not deterministic. Do not assert it for
exact equality. The stable surfaces are `blockingFindings`,
`layoutAntiPatternsDetected`, `designMdViolations`, and the existence
of `<screen>.review.json` itself.
