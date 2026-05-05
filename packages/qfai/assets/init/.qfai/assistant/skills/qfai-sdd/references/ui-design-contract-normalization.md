# UI Design Contract Normalization

`/qfai-sdd` is the only skill that reads discussion-pack UI/UX
sidecars. Downstream skills read only specs, contracts, and evidence.

## DESIGN.md SSOT freeze (new)

The brand SSOT is the root `DESIGN.md` at
`<consuming-project-root>/DESIGN.md`. `/qfai-discussion` emits the
draft; `/qfai-sdd` Phase 0 validates and freezes it.

Required UI-bearing outputs in the new SSOT model:

- root `DESIGN.md` (already present; not authored here)
- `.qfai/contracts/design/DESIGN.md.lock.yaml` (authored by Phase 0
  freeze; see `templates/contracts/design-md-lock.sample.yaml`)
- `.qfai/contracts/ui/*.yaml` (screen contracts)

Freeze procedure:

1. Read `DESIGN.md`.
2. Call `validateDesignMd(text)`; halt on any issue.
3. Compute `hashDesignMd(text)` (sha256).
4. Emit `.qfai/contracts/design/DESIGN.md.lock.yaml` with
   `{ designMdPath, designMdSha256, frozenAt, schemaTokens }`.
5. Add the lock yaml to `_policies/05_Contracts.md` Contract Index.

`/qfai-prototyping` post-loop produces
`.qfai/contracts/design/design-system.yaml` (a deterministic mirror of
DESIGN.md tokens) and `.qfai/contracts/design/prototype-handoff.yaml`.
SDD does not author these.

## Deprecated yaml contracts (transitional)

The following yaml contracts are **deprecated** and will be removed in
a follow-up phase. Do not author them for new specs. They remain
referenced only by historical specs:

- `.qfai/contracts/design/exploration-brief.yaml`
- `.qfai/contracts/design/reference-pool.yaml`
- `.qfai/contracts/design/brand-design.yaml`

Their concepts are subsumed by `DESIGN.md`:

- `exploration-brief.yaml` → `DESIGN.md` `brand` + `audience` +
  `# Brand Philosophy` body.
- `reference-pool.yaml` → `audience.do_not_look_like` and the **Don't**
  subsection of `# Brand Philosophy`.
- `brand-design.yaml` → `visual.*` token tree.

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

## Legacy mapping (transitional, to be removed)

For specs still consuming the deprecated yaml contracts:

- `30_exploration_brief.md` → `exploration-brief.yaml`
- `31_reference_pool.md` → `reference-pool.yaml`
- `30_exploration_brief.md` + `32_design_anti_goals.md` →
  `brand-design.yaml`
- `40_screen_contracts.md` → `.qfai/contracts/ui/*.yaml`

`33_exploration_rubric.md` and `34_evaluator_calibration.md` are not
produced by `/qfai-discussion`. Project-specific anti-pattern notes
live in `audience.do_not_look_like` of `DESIGN.md` (and, transitionally,
`32_design_anti_goals.md`).

## Normalization Rules

- Preserve source IDs where available.
- Convert prose into machine-readable arrays or objects.
- Reject placeholder text instead of copying it into contracts.
- Frame negative references in `audience.do_not_look_like` as
  deviate-from inputs, not imitate-this targets.
