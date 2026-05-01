# UI Design Contract Normalization

`/qfai-sdd` is the only skill that reads discussion-pack UI/UX sidecars.
Downstream skills read only specs, contracts, and evidence.

## Required UI-bearing Outputs (v2.0)

- `.qfai/contracts/design/exploration-brief.yaml`
- `.qfai/contracts/design/reference-pool.yaml`     (deviate-from input)
- `.qfai/contracts/design/brand-design.yaml`
- `.qfai/contracts/ui/*.yaml`

Do not create `design-system.yaml` or `prototype-handoff.yaml` in SDD.
Those are produced by `/qfai-prototyping` v2.0 post-loop (extracted from
the final iteration HTML).

The following v1.x contracts are removed in spec-0017 P4 and MUST NOT be
generated:

- `evaluation-rubric.yaml` — axes are global constants in
  `core/prototyping/iteration.ts#OrdinalScore`; no per-project rubric.
- `evaluator-calibration.yaml` — replaced by ordinal scale + 200-500 word
  prose critique in v2.0.
- `absorption-policy.yaml` — absorption / harvest concepts removed.
- `selected-direction.yaml` — winner selection concept removed; the
  latest accepted iteration is always the artifact.

## Mapping

- `30_exploration_brief.md` -> `exploration-brief.yaml`
- `31_reference_pool.md` -> `reference-pool.yaml`
- `30_exploration_brief.md` + `32_design_anti_goals.md` -> `brand-design.yaml`
- `40_screen_contracts.md` -> `.qfai/contracts/ui/*.yaml`

The v1.x sidecars `33_exploration_rubric.md` and `34_evaluator_calibration.md`
are no longer produced by `/qfai-discussion` (spec-0017 P3/P9). Project-
specific anti-slop additions live in `32_design_anti_goals.md`.

## Normalization Rules

- Preserve source IDs where available.
- Convert prose into machine-readable arrays or objects.
- Reject placeholder text instead of copying it into contracts.
- Frame `reference-pool` entries as deviate-from inspirations, not
  imitate-this targets.
