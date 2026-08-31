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

The first two are **visual-prototyping surfaces only**. A cli-only target
(`primary_surface: cli` with no visual `secondary_surfaces` entry) has no root
`DESIGN.md` and therefore no lock yaml; it still normalizes
`.qfai/contracts/ui/*.yaml`. See `SKILL.md#phase-0-designmd-freeze-visual-prototyping-surfaces-only`.

Freeze procedure:

1. Read `DESIGN.md`.
2. Call `parseDesignMd(text)`; halt on `{ error: ... }`. On success, pass
   the parsed `DesignMd` from `result.data` to `validateDesignMd`; halt
   on any issue.
3. Compute `hashDesignMd(text)` (sha256).
4. Emit `.qfai/contracts/design/DESIGN.md.lock.yaml` with
   `{ designMdPath, designMdSha256, frozenAt, schemaTokens }`.
5. Add the lock yaml to `_policies/05_Contracts.md` Contract Index.

`parseDesignMd`, `validateDesignMd`, and `hashDesignMd` are re-exported
from the public `qfai` package entry (`import { parseDesignMd, validateDesignMd, hashDesignMd } from "qfai"`).

`/qfai-prototyping` post-loop produces
`.qfai/contracts/design/design-system.yaml` (a deterministic mirror of
DESIGN.md tokens) and `.qfai/contracts/design/prototype-handoff.yaml`.
SDD does not author these.

## Removed yaml contracts (permanent)

The legacy per-aspect brand yaml contracts have been **removed**. The
brand SSOT is now root `DESIGN.md` only, frozen via the procedure
above. Do not regenerate or reintroduce these files. Their content is
subsumed by `DESIGN.md`:

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

- `40_screen_contracts.md` → `.qfai/contracts/ui/*.yaml`

Project-specific anti-pattern notes live in `audience.do_not_look_like`
of `DESIGN.md`. Evaluator axes are fixed by the review validation the
QFAI CLI applies (restated in
`.qfai/assistant/skills/qfai-prototyping/references/reviewer-prompt.md`)
and are no longer authored as sidecar files.

## Normalization Rules

- Preserve source IDs where available.
- Convert prose into machine-readable arrays or objects.
- Reject placeholder text instead of copying it into contracts.
- Frame negative references in `audience.do_not_look_like` as
  deviate-from inputs, not imitate-this targets.
