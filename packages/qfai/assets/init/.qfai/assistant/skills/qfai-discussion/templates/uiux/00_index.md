# uiux/ Sidecar Index

## Purpose

Manifest of all UI/UX sidecar artifacts produced during a UI-bearing discussion.

## File Inventory

| File                        | Purpose                                      | Required |
| --------------------------- | -------------------------------------------- | -------- |
| 00_index.md                 | This manifest                                | Yes      |
| 30_exploration_brief.md     | Exploration brief and design intent          | Yes      |
| 31_reference_pool.md        | Exploration references and local translation | Yes      |
| 32_design_anti_goals.md     | Anti-goals and recurrence prevention         | Yes      |
| 33_exploration_rubric.md    | Evaluator rubric                             | Yes      |
| 34_evaluator_calibration.md | Evaluator calibration examples               | Yes      |
| 40_screen_contracts.md      | Screen interaction contracts (11 fields)     | Yes      |
| 50_review_input_bundle.md   | Review input bundle                          | Yes      |

## Completeness Rule

All required files (8 files) MUST be present for a UI-bearing pack. Partial generation is not permitted (BR-0026-0002).

## Forbidden Legacy Files

The following files are NOT part of the canonical family and must NOT be created in new packs:

- `30_option_comparison.md` — replaced by `30_exploration_brief.md`
- `31_selected_anchor_screen.md` — replaced by `31_reference_pool.md` + `selected-direction.yaml`
- `40_contracts.md` — replaced by `40_screen_contracts.md`
- `50_review_bundle.md` — replaced by `50_review_input_bundle.md`
- `60_critique_loop.md` — removed (critique integrated into review bundle)
