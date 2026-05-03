# UI Design Contract Normalization

`/qfai-sdd` is the only skill that reads discussion-pack UI/UX sidecars.
Downstream skills read only specs, contracts, and evidence.

## Required UI-bearing Outputs

- `.qfai/contracts/design/exploration-brief.yaml`
- `.qfai/contracts/design/reference-pool.yaml` (deviate-from input)
- `.qfai/contracts/design/brand-design.yaml`
- `.qfai/contracts/ui/*.yaml`

Do not create `design-system.yaml` or `prototype-handoff.yaml` in SDD.
Those are produced by `/qfai-prototyping` post-loop (extracted from the
final iteration HTML).

The following contracts MUST NOT be generated (the corresponding concepts
do not exist in the current prototyping skill):

- `evaluation-rubric.yaml` — evaluation axes are global constants; no
  per-project rubric.
- `evaluator-calibration.yaml` — calibration is the ordinal scale plus a
  200-500 word prose critique authored at review time.
- `absorption-policy.yaml` — absorption / harvest concepts are not used.
- `selected-direction.yaml` — winner selection is not used; the latest
  accepted iteration is always the artifact.

## Mapping

- `30_exploration_brief.md` -> `exploration-brief.yaml`
- `31_reference_pool.md` -> `reference-pool.yaml`
- `30_exploration_brief.md` + `32_design_anti_goals.md` -> `brand-design.yaml`
- `40_screen_contracts.md` -> `.qfai/contracts/ui/*.yaml`

`33_exploration_rubric.md` and `34_evaluator_calibration.md` are not
produced by `/qfai-discussion`. Project-specific anti-slop additions live
in `32_design_anti_goals.md`.

## Normalization Rules

- Preserve source IDs where available.
- Convert prose into machine-readable arrays or objects.
- Reject placeholder text instead of copying it into contracts.
- Frame `reference-pool` entries as deviate-from inspirations, not
  imitate-this targets.
