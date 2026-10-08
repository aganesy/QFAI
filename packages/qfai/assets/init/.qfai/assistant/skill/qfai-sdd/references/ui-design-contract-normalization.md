# UI Design Contract Normalization

`/qfai-sdd` reads discussion-pack UI/UX sidecars to author contracts.
Downstream skills read the story tree, contracts, and evidence.

## DESIGN.md SSOT

The brand SSOT is the root `DESIGN.md` at
`<consuming-project-root>/DESIGN.md`. Authoring and validating it are
`.qfai/assistant/step/common-design-md/STEP.md#author-and-validate`.
A cli-only target has no root `DESIGN.md`; it still normalizes
`<paths.contractsDir>/ui/*.yaml`, as
`.qfai/assistant/step/sdd-contract/STEP.md#ui-contracts` states.

`/qfai-prototyping` records its handoff in
`.qfai/prototype/final/handoff.json`. SDD does not author it.

## Removed yaml contracts (permanent)

The legacy per-aspect brand yaml contracts have been **removed**. The
brand SSOT is now root `DESIGN.md` only, authored by `common-design-md`.
Do not regenerate or reintroduce these files. Their content is subsumed by
`DESIGN.md`:

- brand archetype / voice / audience → `DESIGN.md` `brand` + `audience` +
  `# Brand Philosophy` body.
- negative references / things-to-avoid →
  `audience.do_not_look_like` and the **Don't** subsection of
  `# Brand Philosophy`.
- color / typography / spacing / radius / shadow tokens →
  `DESIGN.md` `visual.*` token tree.

The following contracts MUST NOT be generated (the corresponding
concepts do not exist in the current prototyping skill):

- `evaluation-rubric.yaml` — evaluation axes are global constants; no
  per-project rubric.
- `evaluator-calibration.yaml` — calibration is the ordinal scale plus
  a 200–500 word prose critique authored at review time.
- `absorption-policy.yaml` — absorption / harvest concepts are not
  used.
- `selected-direction.yaml` — winner selection is not used; the latest
  accepted iteration is always the artifact.

## Sidecar mapping

The remaining UI-bearing sidecar maps to its contract as follows:

- `40_screen_contracts.md` → `<paths.contractsDir>/ui/*.yaml`

Project-specific anti-pattern notes live in `audience.do_not_look_like`
of `DESIGN.md`. Evaluator axes are fixed by the review validation the
QFAI CLI applies
and are no longer authored as sidecar files.

## Normalization Rules

- Preserve source IDs where available.
- Convert prose into machine-readable arrays or objects.
- Reject placeholder text instead of copying it into contracts.
- Frame negative references in `audience.do_not_look_like` as
  deviate-from inputs, not imitate-this targets.
