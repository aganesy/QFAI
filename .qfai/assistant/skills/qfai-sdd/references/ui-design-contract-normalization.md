# UI Design Contract Normalization

`/qfai-sdd` is the only skill that reads discussion-pack UI/UX sidecars.
Downstream skills read only specs, contracts, and evidence.

## Required UI-bearing Outputs

- `.qfai/contracts/design/exploration-brief.yaml`
- `.qfai/contracts/design/reference-pool.yaml`
- `.qfai/contracts/design/brand-design.yaml`
- `.qfai/contracts/design/evaluation-rubric.yaml`
- `.qfai/contracts/design/evaluator-calibration.yaml`
- `.qfai/contracts/design/absorption-policy.yaml`
- `.qfai/contracts/ui/*.yaml`

Do not create `selected-direction.yaml`, `design-system.yaml`, or `prototype-handoff.yaml` in SDD. Those are produced by `/qfai-prototyping` after winner selection and polish.

## Mapping

- `30_exploration_brief.md` -> `exploration-brief.yaml`
- `31_reference_pool.md` -> `reference-pool.yaml`
- `30_exploration_brief.md` + `32_design_anti_goals.md` -> `brand-design.yaml`
- `33_exploration_rubric.md` -> `evaluation-rubric.yaml`
- `34_evaluator_calibration.md` -> `evaluator-calibration.yaml`
- `40_screen_contracts.md` -> `.qfai/contracts/ui/*.yaml`
- `50_review_input_bundle.md` -> absorption/best-of-history fields where applicable

## Normalization Rules

- Preserve source IDs where available.
- Convert prose into machine-readable arrays or objects.
- Reject placeholder text instead of copying it into contracts.
- Record templates as `reference-only` or `implementation-seed`; never as final design.
- Include both adopted and rejected points for every reference.
