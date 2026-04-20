# contracts/design (Design Token YAML) — Optional Supporting Input

## Purpose

Provide a designated location for design token files (`design-tokens*.yaml`) that serve as **optional supporting input** for UI review, validation, and implementation.

**Primary truth** for UI/UX definitions resides in the discussion sidecar artifacts (`discussion-*/uiux/*`). Design token files in this directory supplement — but never override — those primary artifacts.

## Status After Init

After `qfai init`, this directory contains only this README. This is the normal initial state. Design token files are created later when the project needs explicit token definitions.

The absence of design token files is **not** a defect and does not affect the canonical discussion or contracts flow.

## When Design Tokens Are Used

Design token files are consumed **only when they exist**:

- `qfai validate` runs token-level checks (schema, circular references, platform coverage) if token files are present
- `ui-definition-protocol.md` read-order includes this path as a conditional step
- Prototyping and review skills reference tokens as supplementary color/spacing/typography values

## Expected File Names

- `design-tokens.yaml` — primary token definitions (primitive → semantic → component)
- `design-tokens.mobile.yaml` — mobile-specific overrides (optional)

## What This Directory Is NOT

- **Not** the primary truth for screen layout or component hierarchy
- **Not** a required baseline for discussion or spec authoring
- **Not** a substitute for sidecar artifacts or UI contracts
