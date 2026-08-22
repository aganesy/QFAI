# uiux/ Sidecar Index

## Purpose

Manifest of all UI/UX sidecar artifacts produced during a UI-bearing discussion.

## File Inventory

Brand-level intent (product intent, brand signals, anti-goals,
reference pool framed as deviate-from inputs) lives in root
`DESIGN.md` (front-matter + `# Brand Philosophy` body), not in this
sidecar family — on a visual-prototyping surface (`web`, `mobile`,
`desktop`, `mixed`). A cli-only pack has no root `DESIGN.md` at all,
so it has no brand-level intent layer either.

| File                      | Purpose                                  | Required |
| ------------------------- | ---------------------------------------- | -------- |
| 00_index.md               | This manifest                            | Yes      |
| 40_screen_contracts.md    | Screen interaction contracts (11 fields) | Yes      |
| 50_review_input_bundle.md | Review input bundle                      | Yes      |

## Completeness Rule

All three required files above MUST be present for every UI-bearing pack.
Partial generation is not permitted.

Root `DESIGN.md` sits alongside them **only** on a visual-prototyping surface
(`web`, `mobile`, `desktop`, `mixed`). A cli-only pack — `primary_surface: cli`
with no visual surface in `secondary_surfaces` — is complete without it:
`/qfai-discussion` authors no root `DESIGN.md` for such a pack, `/qfai-sdd`
Phase 0 skips the freeze, and `/qfai-prototyping` does not run on `cli`. Do not
report a cli-only pack as incomplete for a missing `DESIGN.md`.

## Forbidden Legacy Files

The following files are NOT part of the canonical family and must NOT be created in new packs:

- `30_option_comparison.md` — replaced by root `DESIGN.md`
- `31_selected_anchor_screen.md` — replaced by root `DESIGN.md`
- `33_exploration_rubric.md` — replaced by `core/prototyping/evaluatorReview.ts#ORDINAL_AXES`
- `34_evaluator_calibration.md` — replaced by `core/prototyping/evaluatorReview.ts#ORDINAL_AXES`
- `40_contracts.md` — replaced by `40_screen_contracts.md`
- `50_review_bundle.md` — replaced by `50_review_input_bundle.md`
- `60_critique_loop.md` — removed (critique integrated into review bundle)
