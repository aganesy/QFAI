# Design-MD Brand Catalog

Reference catalog of 8 canonical brand archetypes for Step 11.3 Phase A autonomous selection.
Each archetype supplies defaults that the agent maps to the project's design system.

---

## Archetype: Minimal

- representative_brand: Apple, Notion, Linear
- aesthetic_properties:
  - color_tendency: Near-white backgrounds, single accent hue, generous negative space
  - typography: Geometric or humanist sans-serif at regular weight; large scale ratios
  - spacing: Extra-generous gutters; element counts kept deliberately low per screen
  - interaction: Subtle transitions; interactions feel frictionless and obvious

## Archetype: Bold

- representative_brand: Nike, Spotify, Figma
- aesthetic_properties:
  - color_tendency: High-saturation primary colors; dark backgrounds with vivid accent pops
  - typography: Condensed or display weights; heavy headlines that command attention
  - spacing: Tight internal component spacing; breath introduced only at section level
  - interaction: Snappy, energetic micro-animations; decisive hover states

## Archetype: Corporate

- representative_brand: IBM, Salesforce, Microsoft 365
- aesthetic_properties:
  - color_tendency: Mid-range blues and grays; structured palette with clear semantic mapping
  - typography: Neutral grotesque or humanist sans-serif; consistent weight hierarchy
  - spacing: Grid-aligned with predictable rhythm; density leans compact
  - interaction: Minimal animation; reliability and predictability over delight

## Archetype: Playful

- representative_brand: Duolingo, Mailchimp, Discord
- aesthetic_properties:
  - color_tendency: Multi-hue palette with 3–4 accent colors; high brightness
  - typography: Rounded or quirky sans-serif; variable weight for personality
  - spacing: Moderate; breathing room balanced with visual richness
  - interaction: Bouncy easing curves; celebratory moments on key actions

## Archetype: Organic

- representative_brand: Airbnb, Etsy, Headspace
- aesthetic_properties:
  - color_tendency: Earth tones, warm neutrals, terracotta, sage; low saturation
  - typography: Serif or humanist sans-serif with organic curves; medium weight
  - spacing: Comfortable; asymmetry acceptable to evoke craft and warmth
  - interaction: Slow, gentle ease-in-out; softness preferred over speed

## Archetype: Tech

- representative_brand: Tesla, Vercel, Raycast
- aesthetic_properties:
  - color_tendency: Dark-mode-first; monochrome base with electric accent (cyan, neon)
  - typography: Monospace or sharp geometric sans; uppercase labels common
  - spacing: Dense with strong grid discipline; every pixel intentional
  - interaction: Instant response; minimal duration; mechanical precision

## Archetype: Elegant

- representative_brand: Chanel, Aesop, Stripe
- aesthetic_properties:
  - color_tendency: Neutral palette — ivory, charcoal, gold accent; restraint is the rule
  - typography: Classic serif for headlines; refined sans for body; wide letter-spacing
  - spacing: Generous; content-to-whitespace ratio strongly favors whitespace
  - interaction: Slow, fade-based transitions; no sudden movements

## Archetype: Casual

- representative_brand: Slack, Dropbox, Buffer
- aesthetic_properties:
  - color_tendency: Friendly mid-tones, bright but not garish; warm secondary hues
  - typography: Rounded humanist sans-serif; approachable weight and scale
  - spacing: Comfortable; interface feels familiar and non-intimidating
  - interaction: Light spring easing; feedback is immediate but unobtrusive

---

## Selection Guide

Use this catalog during Step 11.3 Phase A:

1. Score each archetype against the brand intent captured in root `DESIGN.md` front-matter (`brand.voice`, `audience.emotion`, `audience.do_not_look_like`).
2. Apply the archetype tie-breaker when two archetypes tie: highest visual-theme weight wins, then alphabetical name.
3. Record the selected archetype in root `DESIGN.md` front-matter as `brand.archetype`.
4. The selected archetype's `aesthetic_properties` become the defaults for Color Palette, Typography, Spacing, and Animation sections.
5. Step 11.3 Phase B then customizes those defaults to project-specific overrides.
