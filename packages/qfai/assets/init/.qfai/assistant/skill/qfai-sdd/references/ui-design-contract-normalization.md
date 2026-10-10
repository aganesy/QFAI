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

## Sidecar mapping

The remaining UI-bearing sidecar maps to its contract as follows:

- `40_screen_contracts.md` → `<paths.contractsDir>/ui/*.yaml`

Project-specific anti-pattern notes live in `audience.do_not_look_like`
of `DESIGN.md`. Evaluator axes are fixed by the review validation the
QFAI CLI applies.

## Normalization Rules

- Preserve source IDs where available.
- Normalize the sidecar's notes on displayed text into the screen's `supplements`
  and `structure`, as the UI contract guide shapes them. Notes for the author or
  the reviewer are not displayed text and are not copied into either key.
- Convert prose into machine-readable arrays or objects.
- Reject placeholder text instead of copying it into contracts.
- Frame negative references in `audience.do_not_look_like` as
  deviate-from inputs, not imitate-this targets.
