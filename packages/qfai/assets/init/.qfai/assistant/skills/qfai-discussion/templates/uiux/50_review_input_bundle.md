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
- Later iterations are not automatically preferred over stronger middle iterations.

## Review Checklist

- [ ] Root `DESIGN.md` aligns with surface type and project constraints
- [ ] Reference pool is complete and translated into local design decisions
- [ ] Evaluator scoring covers all four canonical UX axes (information architecture / navigation flow / usability / functionality) — fixed in `core/prototyping/evaluatorReview.ts#ORDINAL_AXES`
- [ ] Best-of-history handling is explicit
- [ ] Screen contracts cover all required states
