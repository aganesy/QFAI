# 04 Business Rules

## BR-0017-0001: One Lineage Per Run

- AC-Refs: AC-0017-0001

A `/qfai-prototyping` run produces exactly one prototype lineage. Parallel candidate generation is forbidden.

## BR-0017-0002: Iteration Indexing

- AC-Refs: AC-0017-0001, AC-0017-0002

Iteration indices are contiguous integers starting at 0. `prototyping.json#iterations[i].index === i` for all `i`. Skipping or reordering raises `QFAI-PROT2-004`.

## BR-0017-0003: Latest Iter Always Accepted

- AC-Refs: AC-0017-0009

`prototyping.json#acceptedIterationIndex` always equals `iterations.length - 1`. The harness does not maintain a "best of history" or revert to a higher-scored prior iter.

## BR-0017-0004: Score Anchors

- AC-Refs: AC-0017-0003

Ordinal score levels apply uniformly across all 4 axes:

| Level | Meaning |
|---|---|
| `weak` | fails the axis. Distracting flaws, clearly off-target. |
| `acceptable` | meets baseline. No critical flaws but unremarkable. |
| `strong` | clearly above baseline. Memorable on this axis. |
| `exceptional` | best-in-class. Use sparingly. |

## BR-0017-0005: Anti-Slop Cap

- AC-Refs: AC-0017-0005

If `slopPatternsDetected.length > 0` for an iter, then `originality` is bounded above by `acceptable`. The reviewer must not assign `strong` or `exceptional` while any slop pattern is matched.

## BR-0017-0006: Pivot Directive Rules

- AC-Refs: AC-0017-0006

Reviewer emits `pivotDirective` per these rules:
- `pivot` when the last 3 iters all have `originality ∈ {weak, acceptable}`
- `continue` when at least 2 of 4 axes improved vs. the prior iter
- `refine` when improvement has stalled but no slop is detected
- default: `refine`

## BR-0017-0007: Stop Condition

- AC-Refs: AC-0017-0007, AC-0017-0008

`/qfai-prototyping` stops when one of:
- All 4 axes of the latest iter are `exceptional` AND `slopPatternsDetected.length === 0` (`stopReason: "axes-exceptional"`)
- Latest iter `index === 14` (`stopReason: "max-iterations"`)

No other path triggers stop. LLM subjective DONE is forbidden.

## BR-0017-0008: Reference Pool Framing

- AC-Refs: AC-0017-0001, AC-0017-0011

`reference-pool.yaml` is consumed by reviewer and generator as **deviate from** input. Similarity to reference items is not rewarded; if observed, it is treated as evidence of slop.

## BR-0017-0009: Design System Direction

- AC-Refs: AC-0017-0011

`design-system.yaml` is an **output** of `/qfai-prototyping` (generated post-loop from final iter), not an input. The reviewer does not score against `design-system.yaml`. `/qfai-implement` reads `design-system.yaml` as a downstream contract.

## BR-0017-0010: Mode And Funnel Are Removed

- AC-Refs: AC-0017-0013

The concepts `mode` (low-cost/standard/full-harness), `round` (r5/r3/r2/r1), `polish/branch` cycles, `concept-fit` evaluation, `100/100 perfect axis` completion, and `best-of-history` are removed from QFAI. Reintroducing any of these strings into `packages/qfai/` is a CI-detectable violation.

## BR-0017-0011: Cross-Skill No-Add Rule

- AC-Refs: AC-0017-0013

The v2.0 redesign adds zero new sidecars under `qfai-discussion/templates/` and zero new contracts under `qfai-sdd/templates/contracts/`. Cross-skill changes are deletion-only or in-place schema simplification.

## BR-0017-0012: Skill Size Constraints

- AC-Refs: AC-0017-0014

SKILL.md and reference file size budgets are enforced at the skill validator level:
- `qfai-prototyping/SKILL.md` ≤ 130 lines
- All `qfai-prototyping/references/*.md` total ≤ 290 lines
- Other skills' SKILL.md must not grow beyond their current size after the redesign (`qfai-discussion ≤ 130`, `qfai-sdd ≤ 320`, `qfai-implement ≤ 350`, `qfai-verify ≤ 510`).
