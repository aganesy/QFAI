# UIX-REV: Strategy Review

Review the UI/UX strategy document (`10_implementation_strategy.md`) for completeness and quality.

This review is scoped to strategy completeness only. Selected anchor evaluation belongs to `comparison-review.md`.

## Required Fields

- `surface`
- `selection_required`
- `decision`
- `candidate_options`
- `chosen_option`
- `rationale`
- `verification_expectations`
- `notes_for_reviewer`

## Alignment Check

- `chosen_option` must exist in `candidate_options`
- `decision` and `chosen_option` should use coherent vocabulary
- Strategy `decision` must be consistent with the selected anchor in `31_selected_anchor_screen.md` (cross-reference only; SSOT judgment is in comparison-review)
- Strategy must not contradict screen contracts in `40_screen_contracts.md`
- `selection_required=false` with multiple `candidate_options` should be treated as a warning

## Verdict

- **accept**: All fields present and meet depth requirements
- **refine**: Fields present but insufficient depth
- **pivot**: Missing required fields — fundamental rework needed
