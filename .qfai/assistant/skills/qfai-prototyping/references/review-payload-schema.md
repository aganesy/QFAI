# Review Payload Schema (`<screen>.review.json`)

SSOT for the per-spec / per-screen review payload. The
product-surface-reviewer sub-agent writes it; the prototyping CLI
parses and certifies it. This file is the authority the CLI cites —
keep it and the parser in lock-step.

The schema is **closed**: any key not listed below is rejected, and a
rejected payload is a hard failure, not a warning. A near-miss (extra
key, misspelled field, legacy flat key) fails the whole file.

## Path

```
.qfai/evidence/prototyping/iter-NN/<spec-id>/<screen>.review.json
```

One file per (spec x screen x cycle). `<spec-id>` is the spec
directory name (`spec-NNNN`), `<screen>` is the screen id declared in
that spec's UI contract. `<screen>.review.json` is the **only**
per-(spec x screen) artifact the Reviewer writes — no `.html`, no
`.png`, no `.interaction.json`.

The Reviewer's other output is the per-cycle summary
`iter-NN/review.json` (one per cycle, a different shape — see
`references/reviewer-prompt.md`), which the orchestrator folds into
`prototyping.json#iterations[]`. It is not a per-screen artifact and
is never parsed against this schema.

## Shape (11 required top-level fields)

```ts
type ReviewerPayload = {
  specId: string; // non-empty; the owning spec id
  screenId: string; // non-empty; declared screen id
  cycle: number; // integer, 0..9
  sessionStatus: "ok" | "retryExhausted" | "launchFailed";
  retryCount: number; // non-negative integer; retries actually consumed
  ordinalAxes: {
    informationArchitecture: "weak" | "acceptable" | "strong" | "exceptional";
    navigationFlow: "weak" | "acceptable" | "strong" | "exceptional";
    usability: "weak" | "acceptable" | "strong" | "exceptional";
    functionality: "weak" | "acceptable" | "strong" | "exceptional";
  };
  impressions: {
    // each <= 200 words
    operability: string;
    transitionFeel: string;
    crossScreenContinuity: string;
    userStoryFeel: string;
    acceptanceCriteriaFeel: string;
    menuReachabilityFeel: string;
  };
  layoutAntiPatternsDetected: string[]; // lap-001..lap-008 ids
  designMdViolations: {
    // closed too: `kind` + `found` only, no extra key per element
    kind: "color" | "font" | "radius" | "shadow";
    found: string;
  }[];
  wallTimeSec: number; // non-negative finite; Reviewer-measured
  softWarnings: {
    // enforced: must equal `wallTimeSec > 300` (5 min per session)
    timeBudget: boolean;
  };
};
```

No numeric scores exist on this payload: only ordinal verdicts plus
bounded prose.

## Field rules

| Field                        | Rule                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `specId` / `screenId`        | non-empty strings                                                                                                                                                                                                                                                                                                                                                                          |
| `cycle`                      | integer, `0..9`; both bounds are enforced                                                                                                                                                                                                                                                                                                                                                  |
| `sessionStatus`              | exactly one of `ok` / `retryExhausted` / `launchFailed`                                                                                                                                                                                                                                                                                                                                    |
| `retryCount`                 | non-negative integer                                                                                                                                                                                                                                                                                                                                                                       |
| `ordinalAxes`                | all 4 axes required, each an ordinal verdict; no extra axis                                                                                                                                                                                                                                                                                                                                |
| `impressions`                | all 6 `*Feel` fields required, each a string of at most 200 words                                                                                                                                                                                                                                                                                                                          |
| `layoutAntiPatternsDetected` | array of strings; empty array required for convergence                                                                                                                                                                                                                                                                                                                                     |
| `designMdViolations`         | array of `{kind, found}` (element closed: no other key); filled by the static gate; empty for convergence                                                                                                                                                                                                                                                                                  |
| `wallTimeSec`                | non-negative finite number; informational, no upper bound                                                                                                                                                                                                                                                                                                                                  |
| `softWarnings`               | required, closed, single boolean key `timeBudget`                                                                                                                                                                                                                                                                                                                                          |
| `softWarnings.timeBudget`    | derived, not free-standing: must equal `wallTimeSec > 300` (per-session cap 300 s = 5 min per `(spec, screen)` session, not per spec — a multi-screen spec gets one budget per screen because each pair is dispatched as its own session and writes its own payload). The parser rejects a payload where the two disagree, so an over-budget session cannot be persisted with the flag off |

`menuReachabilityFeel` describing an unreachable menu entry is
accepted — the `*Feel` fields are qualitative critique, not gates.

## Not accepted

These keys belong to the flat per-cycle summary the orchestrator folds
into `prototyping.json#iterations[]`, **not** to this payload. Writing
any of them here fails the file:

`iterIndex`, `reviewerId`, `scores`, `proseCritique`, `pivotDirective`,
`evidenceRefs`, and the retired flat `timeBudgetSoftWarning` string
(use `softWarnings.timeBudget: boolean`).

## `sessionStatus` and the retry policy

`sessionStatus` records the outcome of the Reviewer Playwright session
for this (spec, screen) pair:

- `ok` — the session completed.
- `retryExhausted` — every attempt in the bounded retry budget failed
  (typically transient: timeouts, evaluation errors).
- `launchFailed` — the Reviewer could not be started at all. Kept
  distinct from `retryExhausted` so "we never tried" and "we tried and
  failed" stay separable.

The retry budget is `N = 3` attempts per (spec, screen) pair with
exponential backoff (`base * 2^attemptIndex` ms, `base = 250`).

Who records which status:

- The Reviewer records `sessionStatus` itself whenever it can still
  write a payload for the pair. A session that completed is `ok` —
  including one that only succeeded after earlier failed attempts;
  record the retries consumed in `retryCount` and leave
  `sessionStatus: "ok"`. Never write `retryExhausted` on a run that
  produced a session: that value means every attempt failed, and the
  CLI-side dispatcher likewise reports a late success as `ok`.
- When the pair never produced a session at all, no payload is written:
  the CLI-side dispatch persists `<screen>.review.json` only on a
  successful attempt, so a `launchFailed` / fully-exhausted pair leaves
  **no file**. Do not invent one — an absent payload is the signal.
  A payload that does carry `retryExhausted` / `launchFailed` reviewed
  nothing, so `npx qfai prototyping certify` rejects it (exit `64`) no
  matter what its axes claim.

That is also what separates the two exit `64`s: a converged run has a
parsable payload for every (spec, screen) pair, while a Reviewer
Playwright hard-stop leaves the pair without one and
`npx qfai prototyping certify` names the missing pair on stderr.
certify reads every payload it does find and rejects the run the same
way when one fails this schema — a present-but-unparsable payload is
not evidence.

## What certify checks per payload (all exit 64)

1. The file exists for every (spec, screen) pair in the frozen set.
2. It parses against this closed schema.
3. Its `specId` / `screenId` / `cycle` match the pair and the accepted
   iteration directory it is stored under. A valid payload copied in
   from another screen, spec, or cycle reviews something else and is
   rejected — write each payload for the pair it is filed under.
4. It is converged on its own terms: all 4 `ordinalAxes` are
   `exceptional` and `layoutAntiPatternsDetected` /
   `designMdViolations` are both empty. Convergence is an AND over
   every pair, so a `weak` axis or a single unresolved violation
   rejects the run even when `prototyping.json#reviewerGate.result` is
   already `PASS` — the payloads are the evidence behind that summary,
   and certify refuses to seal a certificate over the contradiction.

Checks 1 to 4 apply to every run that declares UI screens, whether the
frozen set holds one spec or several: a single-spec run does not get a
pass for writing no payload at all.

`npx qfai prototyping certify --check` re-runs checks 2 to 4 over the
payloads the certificate already sealed for the accepted iteration, so
an old certificate cannot keep reporting DONE on evidence this schema
rejects. A failing re-audit exits `2` (`completion-certificate:
MISMATCH`) and names each payload and reason; re-run the cycle that
produced it, then `npx qfai prototyping certify` again.

`impressions.*` prose is not deterministic and MUST NOT be asserted for
exact equality. The stable surfaces are `ordinalAxes.*`,
`layoutAntiPatternsDetected`, `designMdViolations`, and the existence
of `<screen>.review.json` itself.
