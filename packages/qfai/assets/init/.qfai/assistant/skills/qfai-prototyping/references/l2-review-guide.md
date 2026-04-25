# L2 Review Guide

L2 checks product experience and design alignment.

## Inputs (read from review-bundle.json)

- screenshots (round/candidate path, per declared screen)
- HTML snapshots (round/candidate path, per declared screen)
- accessibility snapshots (round/candidate path, per declared screen)
- Playwright CLI command log (round/candidate path, per declared screen)
- `.qfai/contracts/design/evaluation-axes.yaml`
- `.qfai/contracts/design/anchor-selection.yaml`
- `.qfai/contracts/design/design-system.yaml`
- previous round score

## 3-layer evaluation family

L2 must explicitly use all of:

- invariant axes
- trend-derived axes
- product-specific axes
- aggregate rules

## Required checks

- visual hierarchy aligns with invariant axes
- trend-based styling aligns with trend-derived axes
- product-specific differentiation is visible
- selected anchor direction is reflected in the current UI
- design system checklist is respected
- interaction outcomes in the command log are consistent with the experience the designer intended
- experience findings are recorded separately from blocking L1 findings

## Output

Write to `evaluator-reviews/<candidate-id>.json` with:

- per-axis findings
- revise/manual-review classification
- a numeric score per axis in the range `0..100`
- rationale tied to screenshot / HTML / snapshot / command log refs and axis refs (all entries in `evidenceRefs[]` MUST be concrete paths to existing artifacts)
