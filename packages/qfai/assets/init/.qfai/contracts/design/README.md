# contracts/design (Exploration + Design Execution Inputs)

## Purpose

Provide the downstream execution truth for exploration-first prototyping and final design-system extraction.

`/qfai-sdd` is the only skill that reads discussion-pack UI/UX sidecars. It normalizes those sidecars into this directory. `/qfai-prototyping`, `/qfai-implement`, `/qfai-atdd`, `/qfai-verify`, and `qfai validate` read these contracts instead of reading discussion artifacts.

> **Prototyping harness (spec-0012)**: `evaluation-rubric.yaml` is the source of evaluator axes, absorbable categories, and concept-fit hard floors. `absorption-policy.yaml` defines minimum absorption and curation expectations between rounds. `design-system.yaml` remains the downstream checklist for winner extraction and polish.

## Status After Init

After `qfai init`, this directory contains only this README. This is the normal initial state. `/qfai-sdd` creates design files when a UI-bearing capability is normalized for downstream execution.

The absence of design files is not a defect for non-UI capabilities. For UI-bearing capabilities, missing required design files should be resolved in `/qfai-sdd`.

## Typical Exploration-first Files

Typical files:

- `exploration-brief.yaml` — machine-readable exploration brief generated from discussion
- `reference-pool.yaml` — normalized competitors, adjacent references, templates, and anti-patterns
- `brand-design.yaml` — brand personality, category conventions, differentiation, and visual language
- `evaluation-rubric.yaml` — machine-readable evaluator rubric with weighted axes, hard floors, and absorbable categories
- `evaluator-calibration.yaml` — evaluator alignment examples and anti-leniency guidance
- `absorption-policy.yaml` — round-to-round absorption thresholds and curation rules
- `selected-direction.yaml` — produced by `/qfai-prototyping` after winner selection
- `design-system.yaml` — extracted by `/qfai-prototyping` after direction convergence
- `prototype-handoff.yaml` — implementation handoff produced by `/qfai-prototyping`

## Expected File Names

- `exploration-brief.yaml`
- `reference-pool.yaml`
- `brand-design.yaml`
- `evaluation-rubric.yaml`
- `evaluator-calibration.yaml`
- `absorption-policy.yaml`
- `selected-direction.yaml`
- `design-system.yaml`
- `prototype-handoff.yaml`

## What This Directory Is NOT

- **Not** a replacement for specs or UI contracts
- **Not** an excuse for downstream skills to read discussion-side artifacts directly
- **Not** a place to finalize a winner before prototyping convergence
- **Not** a place to store round evidence; that belongs under `.qfai/evidence/prototyping/`
