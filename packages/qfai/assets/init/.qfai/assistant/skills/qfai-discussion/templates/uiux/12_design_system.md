# Design System

<!-- REQUIRED FIELDS — fill each section; do not leave bodies empty -->

## Visual Theme

<!-- Describe the overall design aesthetic and brand personality.
     Required: archetype label (from design-md-brand-catalog), rationale, 1–2 guiding adjectives. -->

- archetype: [e.g., Minimal / Bold / Corporate / Playful / Organic / Tech / Elegant / Casual]
- rationale: [Why this archetype fits the product and target users]
- guiding_adjectives:
  - [first adjective]
  - [second adjective]

## Color Palette

<!-- Define the primary, secondary, and semantic color tokens.
     Required: at least 3 named colors with hex values and usage notes. -->

- primary:
  - name: [token name, e.g., brand-blue]
  - hex: [#XXXXXX]
  - usage: [where this color appears]
- secondary:
  - name: [token name]
  - hex: [#XXXXXX]
  - usage: [where this color appears]
- semantic:
  - success: [#XXXXXX]
  - warning: [#XXXXXX]
  - error: [#XXXXXX]
  - info: [#XXXXXX]

## Typography

<!-- Define typeface choices, scale, and usage rules.
     Required: heading typeface, body typeface, base size, scale rationale. -->

- heading_typeface: [e.g., Inter, Playfair Display]
- body_typeface: [e.g., Inter, Noto Sans]
- base_size: [e.g., 16px / 1rem]
- scale_ratio: [e.g., 1.25 — Major Third]
- usage_rules:
  - [rule 1, e.g., "H1 only for page titles; max one per page"]
  - [rule 2]

## Spacing & Layout

<!-- Define the spacing unit system, grid, and common layout patterns.
     Required: base unit, grid columns, gutter, common spacing tokens. -->

- base_unit: [e.g., 4px or 8px]
- grid_columns: [e.g., 12]
- gutter: [e.g., 24px]
- tokens:
  - xs: [e.g., 4px]
  - sm: [e.g., 8px]
  - md: [e.g., 16px]
  - lg: [e.g., 24px]
  - xl: [e.g., 48px]

## Component Style

<!-- Describe the visual treatment of core UI components (buttons, inputs, cards, etc.).
     Required: border-radius philosophy, shadow level, interactive state rules. -->

- border_radius: [e.g., 4px for inputs, 8px for cards, 24px for pills]
- shadow_level: [e.g., flat / subtle / elevated — explain the use case for each]
- interactive_states:
  - hover: [description]
  - focus: [description, e.g., 2px offset ring in brand-blue]
  - disabled: [description, e.g., 40% opacity]
- density: [e.g., comfortable / compact — which default and why]

## Animation & Motion

<!-- Define motion principles, duration, and easing used across the product.
     Required: motion intent, base duration, easing curve, guidance on when to avoid animation. -->

- intent: [e.g., "Motion should feel purposeful and guide attention; never decorative."]
- base_duration_ms: [e.g., 200]
- easing: [e.g., ease-out cubic-bezier(0.0, 0.0, 0.2, 1)]
- reduced_motion_policy: [e.g., "Respect prefers-reduced-motion; all transitions become instant."]
- avoid_when:
  - [scenario where animation would harm UX]

## Do's and Don'ts

<!-- Provide explicit guidance on what to do and what to avoid.
     Required: at least 3 Do items and 3 Don't items. -->

### Do

- [Do: use the primary color only for primary call-to-action elements]
- [Do: maintain a minimum 4.5:1 contrast ratio on all body text]
- [Do: use spacing tokens from the defined scale — no ad-hoc pixel values]

### Don't

- [Don't: use more than 3 typeface weights on a single screen]
- [Don't: apply shadow to elements that are already on a elevated surface]
- [Don't: animate decoratively; every motion must have a functional purpose]

## Agent Implementation Guide

<!-- Instructions for the AI agent implementing this design system.
     Required: derivation rules, how to handle ambiguity, where to read and write design tokens. -->

- derivation_rules:
  - [rule 1: how to select an archetype from the brand catalog]
  - [rule 2: how to resolve conflicts between archetype defaults and product-specific overrides]
- token_source: [where the authoritative token file lives, e.g., tokens/design-tokens.json]
- ambiguity_policy: [e.g., "When a value is unspecified, prefer the archetype default; log a TODO for review."]
- validation_reference: UIX-VAL-DS02 (required sections) and UIX-VAL-DS01 (presence check)
