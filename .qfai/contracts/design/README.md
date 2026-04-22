# contracts/design (Design Execution Inputs)

## Purpose

Provide the downstream execution truth for design-system and design-evaluation inputs that `/qfai-sdd` normalizes from UI-bearing discussion packs.

These files are version-managed and may be read directly by `/qfai-prototyping`, `/qfai-implement`, `/qfai-atdd`, and `qfai validate`.

## Status After Init

After `qfai init`, this directory contains only this README. This is the normal initial state. `/qfai-sdd` creates design files when a UI-bearing capability is normalized for downstream execution.

The absence of design files is not a defect for non-UI capabilities. For UI-bearing capabilities, missing required design files should be resolved in `/qfai-sdd`.

## When Design Tokens Are Used

Typical files:

- `design-system.yaml` — normalized checklist for color, typography, spacing, radius, shadow, and do/don't rules
- `evaluation-axes.yaml` — normalized invariant / trend-derived / product-specific / aggregate axes
- `anchor-selection.yaml` — selected anchor and adoption rationale needed by downstream review
- `design-tokens*.yaml` — optional token definitions

## Expected File Names

- `design-system.yaml`
- `evaluation-axes.yaml`
- `anchor-selection.yaml`
- `design-tokens.yaml`
- `design-tokens.mobile.yaml`

## What This Directory Is NOT

- **Not** a replacement for specs or UI contracts
- **Not** an excuse for downstream skills to read discussion-side artifacts directly
- **Not** limited to optional token files only
