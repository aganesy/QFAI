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
per-cycle Reviewer artifact — the Reviewer does not write `.html`,
`.png` or `.interaction.json`.

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
    kind: "color" | "font" | "radius" | "shadow";
    found: string;
  }[];
  wallTimeSec: number; // non-negative finite; Reviewer-measured
  softWarnings: {
    timeBudget: boolean; // true iff wallTimeSec exceeded the per-spec cap
  };
};
```

No numeric scores exist on this payload: only ordinal verdicts plus
bounded prose.

## Field rules

| Field                        | Rule                                                                       |
| ---------------------------- | -------------------------------------------------------------------------- |
| `specId` / `screenId`        | non-empty strings                                                          |
| `cycle`                      | integer, `0..9`; both bounds are enforced                                  |
| `sessionStatus`              | exactly one of `ok` / `retryExhausted` / `launchFailed`                    |
| `retryCount`                 | non-negative integer                                                       |
| `ordinalAxes`                | all 4 axes required, each an ordinal verdict; no extra axis                |
| `impressions`                | all 6 `*Feel` fields required, each a string of at most 200 words          |
| `layoutAntiPatternsDetected` | array of strings; empty array required for convergence                     |
| `designMdViolations`         | array of `{kind, found}`; filled by the static gate; empty for convergence |
| `wallTimeSec`                | non-negative finite number; informational, no upper bound                  |
| `softWarnings`               | required, closed, single boolean key `timeBudget`                          |

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
Exhausting it for every reviewer attempted on the pair is the Reviewer
Playwright hard-stop: the run exits `64` with `sessionStatus` recorded
in the payload, which is what distinguishes it from a converged exit
`64`.

`impressions.*` prose is not deterministic and MUST NOT be asserted for
exact equality. The stable surfaces are `ordinalAxes.*`,
`layoutAntiPatternsDetected`, `designMdViolations`, and the existence
of `<screen>.review.json` itself.
