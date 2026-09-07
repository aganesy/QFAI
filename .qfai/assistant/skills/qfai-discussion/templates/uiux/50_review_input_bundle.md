# Review Input Bundle

## Purpose

Consolidate all sidecar artifacts into a review-ready bundle for design reviewers.

A **cli-only** pack (`primary_surface: cli`, no visual `secondary_surfaces` entry) still
ships this bundle. It has no root `DESIGN.md` and no `prototyping.yaml`, so mark those two
rows `n-a: cli-only pack` rather than leaving the bundle incomplete — see
`references/ui-bearing-playbook.md#visual-prototyping-surfaces-vs-cli`.

## Bundle Contents

| Artifact                   | Path                          | Status                                         |
| -------------------------- | ----------------------------- | ---------------------------------------------- |
| Brand SSOT (root)          | `DESIGN.md`                   | [draft/reviewed/approved / n-a: cli-only pack] |
| Screen contracts           | `uiux/40_screen_contracts.md` | [draft/reviewed/approved]                      |
| Prototyping recommendation | `../prototyping.yaml`         | [draft/reviewed/approved / n-a: cli-only pack] |

## Trend-derived review focus

- Required references are all present and complete.
- Stale / overused AI slop patterns are explicitly avoided.
- Reference research is translated into local design decisions on root `DESIGN.md` (visual-prototyping surfaces) and on screen contracts (every UI-bearing surface). A cli-only pack has no root `DESIGN.md`: the screen contracts carry the whole translation.
- Iteration handling follows the one-lineage rule in `qfai-prototyping/SKILL.md`: no parallel
  candidates and no best-of-history — the latest iteration is the accepted one. A middle iteration
  that looked stronger is addressed by pivoting the next cycle, not by reaching back for it.

## Review Checklist

- [ ] Root `DESIGN.md` aligns with surface type and project constraints (skip on a cli-only pack, which authors none)
- [ ] Reference pool is complete and translated into local design decisions
- [ ] Evaluator scoring covers all four canonical UX axes (information architecture / navigation flow / usability / functionality) — fixed by the review validation the QFAI CLI applies (restated in `.qfai/assistant/skills/qfai-prototyping/references/reviewer-prompt.md`)
- [ ] One-lineage handling is explicit (latest iteration accepted; no best-of-history)
- [ ] Screen contracts cover all required states
