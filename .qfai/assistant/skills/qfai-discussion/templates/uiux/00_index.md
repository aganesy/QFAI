# uiux/ Sidecar Index

## Purpose

Manifest of all UI/UX sidecar artifacts produced during a UI-bearing discussion.

## File Inventory

Brand-level intent (product intent, brand signals, anti-goals,
reference pool framed as deviate-from inputs) lives in root
`DESIGN.md` (front-matter + `# Brand Philosophy` body), not in this
sidecar family.

| File                        | Purpose                                      | Required |
| --------------------------- | -------------------------------------------- | -------- |
| 00_index.md                 | This manifest                                | Yes      |
| 33_exploration_rubric.md    | Evaluator rubric                             | Yes      |
| 34_evaluator_calibration.md | Evaluator calibration examples               | Yes      |
| 40_screen_contracts.md      | Screen interaction contracts (11 fields)     | Yes      |
| 50_review_input_bundle.md   | Review input bundle                          | Yes      |

## Completeness Rule

All required files MUST be present for a UI-bearing pack alongside root
`DESIGN.md`. Partial generation is not permitted.

## Forbidden Legacy Files

The following files are NOT part of the canonical family and must NOT be created in new packs:

- `30_option_comparison.md` — replaced by root `DESIGN.md`
- `31_selected_anchor_screen.md` — replaced by root `DESIGN.md`
- `40_contracts.md` — replaced by `40_screen_contracts.md`
- `50_review_bundle.md` — replaced by `50_review_input_bundle.md`
- `60_critique_loop.md` — removed (critique integrated into review bundle)
