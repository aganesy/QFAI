# Change Request

- ID: `CR-20260912-0002`
- Title: `The specs decide convergence by a score the loop does not read, and name a stopReason it never writes`
- Raised by: `claude-code`
- Raised at: `2026-09-12T00:00:00Z`
- Class: `intent`
- Status: `approved`
- Approved by: `claude-code` — under the user's standing instruction to process every issue of this session with its own judgment; NOT a user decision on these options
- Approved at: `2026-09-12T00:00:00Z`
- Approved option: `1`
- Applied at: `2026-09-12T00:00:00Z` — see Resolution
- Superseded by: `-`
- Blocked set: `-`

## Context

The prototype loop stops when the latest iteration has nothing open against it.
`iterationConverged` reads three arrays and no score:

```ts
iter.blockingFindings.length === 0 &&
  iter.layoutAntiPatternsDetected.length === 0 &&
  iter.designMdViolations.length === 0;
```

`shouldStop` returns `"converged"` on that, `"max-iterations"` at index 9, and `null` otherwise.
`StopReason` is `"converged" | "max-iterations" | "license-verify-fail" | "input-error"`.

The specification layer states three things that do not hold.

| Claim                                                                | Where                                                                                                               | What the code does                       |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Convergence is all four UX axes `exceptional`, plus two empty arrays | `spec-0012` `01_Spec.md`, `03_Acceptance-Criteria.md`, `04_Business-Rules.md`, `05_Examples.md`, `06_Test-Cases.md` | reads three arrays; no axis is consulted |
| `stopReason` is `"axes-exceptional"`                                 | the same pack, eight rows, and two CLI contracts                                                                    | writes `"converged"`                     |
| The third blocked-cause category is `axes-below-exceptional`         | `01_Spec.md` REQ-0012-0068, `03_Acceptance-Criteria.md`, `06_Test-Cases.md`                                         | prints `blockingFindings`                |

The second is the one that bites a consumer. `--check-convergence` is specified to exit 0 when
`stopReason === "axes-exceptional"`, and no run records that value, so anyone implementing
against the contract builds for a state the tool cannot produce.

The four axes are still scored by the reviewer and still reported. What changed is that they
stopped deciding the stop; the eight review criteria that replaced the rating produce
`blockingFindings`, which is the third array.

## Why the axes went

A rating is a number painted on a judgement. It cannot be argued with, and it cannot be fixed —
whereas a finding names something and can be. The loop also could not converge honestly while
`exceptional` was required on every axis: the scale's own definition says to use that value
sparingly, and the aggregate was the worst across every screen.

## Options and recommendation

1. **The code is canonical; the specs follow it.** Each row states the three arrays, the
   `stopReason` value the command writes, and `blockingFindings` as the third blocked cause. The
   axes keep the rows that describe them as reported, and lose the rows that make them gate.
2. **Restore the axis gate.** Rejected. It is the defect the rating removal fixed, and the
   review criteria that replaced it have no ordinal to restore.
3. **Rename the emitted value to `axes-exceptional` so the specs become true.** Rejected twice
   over: the name would describe a condition nothing evaluates, and `"converged"` is read by
   `--check-convergence`, `certify`, the sealed-loop guard and the validator, so the rename is a
   breaking change made to avoid editing documents.

**Recommended: 1.** The specification is what a reviewer measures a change against. While it
describes a gate the loop does not apply, a reviewer checking an iterate change against it
reaches the wrong verdict, and nothing surfaces the disagreement until someone runs both.

## Impact scope

| File                                              | Rows                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------ |
| `spec-0012/01_Spec.md`                            | REQ-0012-0063, REQ-0012-0068, REQ-0012-0074, REQ-0012-0077                     |
| `spec-0012/03_Acceptance-Criteria.md`             | the exit-code list, the convergence shape, the blocked-summary criterion       |
| `spec-0012/04_Business-Rules.md`                  | the convergence rule and the `stopReason` rule                                 |
| `spec-0012/05_Examples.md`                        | three worked examples naming the value                                         |
| `spec-0012/06_Test-Cases.md`                      | five cases naming the value or the axis gate                                   |
| `.qfai/contracts/cli/qfai-prototyping.md`         | the convergence predicate and the `stopReason` enum                            |
| `.qfai/contracts/cli/qfai-prototyping-iterate.md` | the `--check-convergence` predicate, the handoff trigger, the blocked category |
| `spec-0012/16_Traceability-ledger.md`             | the coverage row naming the enum                                               |
| `_policies/08_Decisions.md`                       | the parenthetical naming what `QFAI-CRIT-008` is about                         |

Rows already marked `Status: superseded` are left as they are: they record what a retired
criterion said, and rewriting them would destroy the record. So are `09_delta.md` and
`tdd/test-list.md`, which exist to hold what happened.

Two further mismatches surfaced from the guard rather than from reading, both in the same
three-line stop-condition rule in `04_Business-Rules.md`:

- the DESIGN.md hash-mismatch path was given `stopReason: "design-md-hash-mismatch"`, a fifth
  value nothing declares. The exit-2 input gates record `input-error`.
- the max-iterations terminator was stated at `index === 14`, from the retired 15-cycle budget.
  `MAX_ITERATION_INDEX` is 9.

No source change.

## Decision needed from user

None. Every row moves toward what the code does, and the axes keep the rows that describe them
as reported rather than as a gate.

## Approved actions (owner skill rerun plan)

`/qfai-sdd spec-0012` — Phase 2c obligation reconciliation over the rows listed under Impact
scope, plus Phase 4 delta.

## Resolution

Applied under option 1.

Every live row states the three arrays, `stopReason: "converged"`, and `blockingFindings` as the
third blocked cause. A guard reads `STOP_REASONS` out of the source and fails on any spec or CLI
contract naming a `stopReason` value that enum does not carry.
