# Review Input Bundle

## Purpose

Consolidate all sidecar artifacts into a review-ready bundle for design reviewers.

## Bundle Contents

| Artifact                   | Path                          | Status                    |
| -------------------------- | ----------------------------- | ------------------------- |
| Brand SSOT (root)          | `DESIGN.md`                   | [draft/reviewed/approved] |
| Screen contracts           | `uiux/40_screen_contracts.md` | [draft/reviewed/approved] |
| Prototyping recommendation | `../prototyping.yaml`         | [draft/reviewed/approved] |

## Trend-derived review focus

- Required references are all present and complete.
- Stale / overused AI slop patterns are explicitly avoided.
- Reference research is translated into local design decisions on root `DESIGN.md` and screen contracts.
- Iteration handling follows the one-lineage rule in `qfai-prototyping/SKILL.md`: no parallel
  candidates and no best-of-history — the latest iteration is the accepted one. A middle iteration
  that looked stronger is addressed by pivoting the next cycle, not by reaching back for it.

## Review Checklist

- [ ] Root `DESIGN.md` aligns with surface type and project constraints
- [ ] Reference pool is complete and translated into local design decisions
- [ ] Evaluator scoring covers all four canonical UX axes (information architecture / navigation flow / usability / functionality) — fixed in `core/prototyping/evaluatorReview.ts#ORDINAL_AXES`
- [ ] One-lineage handling is explicit (latest iteration accepted; no best-of-history)
- [ ] Screen contracts cover all required states
