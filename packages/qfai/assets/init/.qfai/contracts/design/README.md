# contracts/design (Exploration + Design Execution Inputs)

## Purpose

Provide the downstream execution truth for exploration-first prototyping and final design-system extraction that `/qfai-sdd` and `/qfai-prototyping` normalize from UI-bearing discussion packs.

These files are version-managed and may be read directly by `/qfai-prototyping`, `/qfai-implement`, `/qfai-atdd`, and `qfai validate`.

## Status After Init

After `qfai init`, this directory contains only this README. This is the normal initial state. `/qfai-sdd` creates design files when a UI-bearing capability is normalized for downstream execution.

The absence of design files is not a defect for non-UI capabilities. For UI-bearing capabilities, missing required design files should be resolved in `/qfai-sdd`.

## Typical Exploration-first Files

Typical files:

- `exploration-brief.yaml` — machine-readable exploration brief generated from discussion
- `evaluation-rubric.yaml` — machine-readable evaluator rubric with weighted originality/design criteria
- `evaluator-calibration.yaml` — evaluator alignment examples and anti-leniency guidance
- `selected-direction.yaml` — current winning direction, rationale, and carry-forward rules
- `design-system.yaml` — extracted final design system produced after direction convergence
- `design-tokens*.yaml` — optional token definitions

## Expected File Names

- `exploration-brief.yaml`
- `evaluation-rubric.yaml`
- `evaluator-calibration.yaml`
- `selected-direction.yaml`
- `design-system.yaml`
- `design-tokens.yaml`
- `design-tokens.mobile.yaml`

## What This Directory Is NOT

- **Not** a replacement for specs or UI contracts
- **Not** an excuse for downstream skills to read discussion-side artifacts directly
- **Not** a place to finalize a winner before prototyping convergence
