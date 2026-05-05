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

| Level         | Meaning                                                |
| ------------- | ------------------------------------------------------ |
| `weak`        | fails the axis. Distracting flaws, clearly off-target. |
| `acceptable`  | meets baseline. No critical flaws but unremarkable.    |
| `strong`      | clearly above baseline. Memorable on this axis.        |
| `exceptional` | best-in-class. Use sparingly.                          |

## BR-0017-0005: Layout-Anti-Pattern Cap (UX-loop redesign)

- AC-Refs: AC-0017-0005, AC-0017-0018

If `layoutAntiPatternsDetected.length > 0` for an iter, then `informationArchitecture` is bounded above by `acceptable`. The reviewer must not assign `strong` or `exceptional` while any `lap-*` is matched. `lap-007` (state-not-represented) and `lap-008` (no-back-affordance) are reviewer-judged semantic patterns; the rest are surface-checkable. (UX-loop redesign: replaces the deprecated `slopPatternsDetected → originality cap` rule — see 09_delta.md OP-0002.)

## BR-0017-0006: Pivot Directive Rules (UX-loop redesign)

- AC-Refs: AC-0017-0006, AC-0017-0021

Reviewer emits `pivotDirective` per these rules:

- `pivot` when the last 3 iters all have `informationArchitecture ∈ {weak, acceptable}` AND the latest iter has `layoutAntiPatternsDetected.length > 0`
- `continue` when at least 2 of 4 axes (informationArchitecture / navigationFlow / usability / functionality) improved vs. the prior iter
- `refine` otherwise (improvement stalled or partial, no actionable layout anti-pattern signal)
- default: `refine`

**Improvement ordering (UX-loop redesign)**: improvement on an axis is defined as `ordinalIndex(current) > ordinalIndex(prior)` where `ordinalIndex` maps `weak=0, acceptable=1, strong=2, exceptional=3`. Equal levels are NOT improvements (e.g. `strong → strong` does not count). Decreases (`strong → acceptable`) are also not improvements. The `continue` branch fires only when ≥2 of the 4 axes strictly increase by this ordering. (UX-loop redesign: makes the AC-0017-0021 / BR-0017-0006 "improved" predicate well-defined.)

(UX-loop redesign: pivot trigger moved from "low originality streak" to "low IA streak + latest lap-* signal"; see 09_delta.md OP-0005.)

## BR-0017-0007: Stop Condition (UX-loop redesign)

- AC-Refs: AC-0017-0007, AC-0017-0008, AC-0017-0017, AC-0017-0019

`/qfai-prototyping` stops when one of:

- All 4 axes (informationArchitecture / navigationFlow / usability / functionality) of the latest iter are `exceptional` AND `layoutAntiPatternsDetected.length === 0` AND `designMdViolations.length === 0` (`stopReason: "axes-exceptional"`, exit 64)
- Latest iter `index === 14` (`stopReason: "max-iterations"`, exit 65)
- DESIGN.md sha256 mismatch on cycle ≥1 (`stopReason: "design-md-hash-mismatch"`, exit 2; forces re-run from cycle 0)

No other path triggers stop. LLM subjective DONE is forbidden. (UX-loop redesign: convergence gate now requires `designMdViolations` empty and `layoutAntiPatternsDetected` empty; new exit-2 path on DESIGN.md hash mismatch — see 09_delta.md OP-0003 / OP-0006.)

## BR-0017-0008: DESIGN.md As Brand Compliance Input (UX-loop redesign)

- AC-Refs: AC-0017-0011, AC-0017-0015, AC-0017-0019, AC-0017-0020, AC-0017-0023

`DESIGN.md` (root) is consumed by reviewer and generator as the **brand compliance source of truth**. Reviewer compares each iter against `DESIGN.md` tokens (color / font / radius / shadow) via `findDesignMdViolations(html, designMd)`. A non-empty `designMdViolations` is fail-closed evidence and blocks convergence (exit 64). The legacy `reference-pool.yaml` "deviate from" framing is removed — `DESIGN.md` provides positive brand compliance, not deviation pressure. (UX-loop redesign: replaces BR-0017-0008's prior "deviate-from reference-pool" rule — see 09_delta.md OP-0007.)

## BR-0017-0009: Design System As DESIGN.md Mirror (UX-loop redesign)

- AC-Refs: AC-0017-0011, AC-0017-0015

`design-system.yaml` is an **output** of `/qfai-prototyping`, generated post-loop as a **deterministic mirror of `DESIGN.md` tokens** (not extracted from final iter HTML measurements). The reviewer does not score against `design-system.yaml`; brand compliance is evaluated via `findDesignMdViolations` against `DESIGN.md` directly. `/qfai-implement` reads `design-system.yaml` as a downstream contract that is byte-equivalent to the brand SSOT. (UX-loop redesign: extraction-from-HTML semantics replaced with mirror-of-DESIGN.md — see 09_delta.md OP-0004.)

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

## BR-0017-0013: DESIGN.md SSOT and Lock (UX-loop redesign)

- AC-Refs: AC-0017-0015, AC-0017-0016, AC-0017-0017

Root `DESIGN.md` is the brand SSOT. `/qfai-discussion` emits the draft. `/qfai-sdd` Phase 0 validates structural sections (color tokens, typography, radius, shadow tables) and writes a sha256 hash of the byte content into `.qfai/contracts/design/DESIGN.md.lock.yaml`. `qfai prototyping iterate --cycle 0` records `prototyping.json#designMdSha256 = sha256(DESIGN.md)` and verifies it matches `DESIGN.md.lock.yaml`. `qfai prototyping iterate --cycle <n>` for n ≥ 1 verifies the on-disk hash matches the recorded one; mismatch raises `QFAI-PROT2-031` and exits 2.

## BR-0017-0014: Layout-Anti-Pattern Catalog (UX-loop redesign)

- AC-Refs: AC-0017-0018, AC-0017-0021

The active layout-anti-pattern catalog is fixed at `lap-001..008`:

| ID      | Pattern                  | Detection                                                  |
| ------- | ------------------------ | ---------------------------------------------------------- |
| lap-001 | orphan-page              | Reachable URL with no inbound links from any rendered page |
| lap-002 | deadend-flow             | Multi-step flow without a terminal success/cancel state    |
| lap-003 | modal-stack-trap         | Modal-on-modal with no escape affordance                   |
| lap-004 | hidden-primary-action    | Primary CTA buried below fold or behind icon-only button   |
| lap-005 | no-empty-state           | List/feed component with no zero-data illustration or copy |
| lap-006 | mystery-meat-icon        | Icon-only control without label/tooltip                    |
| lap-007 | state-not-represented    | Critical state (loading/error/empty) absent (reviewer)     |
| lap-008 | no-back-affordance       | Sub-page lacks back/up navigation (reviewer)               |

Surface-checkable patterns (lap-001..006) are mechanically detected. lap-007 and lap-008 are reviewer-judged semantic patterns. Reintroducing legacy `slop-*` tokens as active anti-patterns is forbidden (history-only).

## BR-0017-0015: designMdViolations Pure Function (UX-loop redesign)

- AC-Refs: AC-0017-0019, AC-0017-0020

`findDesignMdViolations(html: string, designMd: ParsedDesignMd): DesignMdViolation[]` is a pure deterministic function (no I/O, no clock). It checks four token categories:

- `color`: every CSS color literal in `html` must match a token from `designMd.colors`
- `font`: every `font-family` reference must match `designMd.fonts`
- `radius`: every `border-radius` value must match `designMd.radii`
- `shadow`: every `box-shadow` value must match `designMd.shadows`

Each violation is `{category, expected, found, location}`. The reviewer copies the function output verbatim into `review.json#designMdViolations`. A non-empty array blocks convergence (BR-0017-0007).

## BR-0017-0016: Legacy Contracts Removed (UX-loop redesign)

- AC-Refs: AC-0017-0022, AC-0017-0023, AC-0017-0024

The following are removed from the active contract surface and validator codepaths:

- contracts: `brand-design.yaml`, `exploration-brief.yaml`, `reference-pool.yaml`
- discussion sidecars: `30_exploration_brief.md`, `31_reference_pool.md`, `32_design_anti_goals.md`
- visual-aesthetic anti-slop tokens (active): `slop-001-shadcn-zinc`, `slop-003-linear-stripe`, `slop-008-glass-card`, `slop-009-mono-emoji`, `slop-010-rounded-2xl-shadow-lg`
- design-contract validator IDs (active): old DCON-005..016 series. New active IDs are DCON-030 (DESIGN.md presence), DCON-031 (DESIGN.md.lock.yaml hash integrity), DCON-032 (design-system.yaml mirrors DESIGN.md).

Legacy DCON-018-related rules (brand-design hash gate, reference-pool deviation gate) are absorbed into the DESIGN.md compliance gate (BR-0017-0008 / BR-0017-0015) and removed.
