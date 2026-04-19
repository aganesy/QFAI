# Evaluation Layer: Trend-derived

## Layer Classification

- Layer: trend-derived
- Source: Industry trend analysis and research synthesis

## Source Refs Authoring Guidance

<!-- Each axis MUST include a `source_refs` list pointing to entries in `04_Sources.md`.
     Use the `source_id` values from `04_Sources.md` Source Registry (e.g., SRC-0001).
     For visual-category Trend Scan entries (color, typography, visual motif, spacing, shape, imagery),
     at least one visual TRD-XX axis MUST reference those entries via `source_refs`;
     omitting this will trigger UIX-VAL-T04 at validation time. -->

## Score Anchor Guidance

- Every `score_anchors.low`, `score_anchors.mid`, and `score_anchors.high` entry MUST include a quantitative proxy, not adjectives alone.
- Acceptable quantitative proxies include concrete values such as `44px` target size, contrast `ratio`, `WCAG` level, modular scale steps, explicit `class name`, or a measurable `default value`.
- Adjective-only anchors such as "modern", "polished", or "clean" without a measurable proxy are non-compliant and will trigger downstream warning `UIX-VAL-T06`.

## Axes

<!-- VISUAL AXIS EXAMPLE 1: Visual Warmth & Color Harmony
     Derive axes like this from color / imagery Trend Scan entries in 04_Sources.md. -->

### Axis: TRD-V01 — Visual Warmth & Color Harmony

- axis_id: TRD-V01
- axis_name: Visual Warmth & Color Harmony
- layer: trend-derived
- visual_category: true
- origin: Color and imagery trend scan entries identifying warmth-dominant palettes in the competitor set
- intent: Measures whether the product's color palette conveys appropriate warmth and emotional resonance relative to current visual trends
- why_it_matters: Color harmony directly impacts brand trust and perceived quality; misaligned warmth signals confuse users about product positioning
- score_scale: 1-5
- score_anchors:
  - low: 1 — Accent/background pair falls below 3:1 contrast or uses more than 3 conflicting hue families on one screen
  - mid: 3 — Primary palette keeps a consistent 2-hue system and semantic colors stay within one temperature family
  - high: 5 — Palette maintains semantic consistency across screens with 4.5:1 contrast and no off-brand hue drift
- positive_signals:
  - Accent hue and background hue share a harmonious temperature relationship
  - Semantic colors (success, warning, error) do not break the palette's tonal identity
- negative_signals:
  - Warm accent on a cool-dominant background without intentional contrast rationale
  - Multiple conflicting temperature signals on the same screen
- anti_patterns:
  - Copying a competitor's palette verbatim without evaluating fit
- evidence_required: Screenshot comparison of primary screen against 3 archetype references from brand catalog
- weight: 0.20
- minimum_floor: 2
- source_refs:
  - [SRC-ID of color Trend Scan entry — replace with actual source_id from 04_Sources.md]
  - [SRC-ID of imagery Trend Scan entry if applicable]
- goal_refs:
  - [project goal this axis supports, e.g., REQ-0010]
- review_questions:
  - Does the color palette feel intentionally warm or cool relative to the selected brand archetype?
  - Are there any unintentional temperature conflicts between primary and secondary colors?

<!-- VISUAL AXIS EXAMPLE 2: Typographic Legibility & Trend Alignment
     Derive axes like this from typography Trend Scan entries in 04_Sources.md. -->

### Axis: TRD-V02 — Typographic Legibility & Trend Alignment

- axis_id: TRD-V02
- axis_name: Typographic Legibility & Trend Alignment
- layer: trend-derived
- visual_category: true
- origin: Typography trend scan entries from 04_Sources.md capturing current typeface conventions
- intent: Measures whether the product's typeface choices meet legibility standards while reflecting contemporary typographic trends
- why_it_matters: Poor legibility harms conversion and trust; typographic misalignment signals a dated or unpolished product
- score_scale: 1-5
- score_anchors:
  - low: 1 — Body text drops below 14px or fails WCAG AA contrast on primary routes
  - mid: 3 — Body text stays at 16px with a consistent heading/body pairing on core screens
  - high: 5 — Body text remains 16px+, uses a 1.25 modular ratio, and passes WCAG AA across all defined states
- positive_signals:
  - Typeface pairing (heading + body) is harmonious with the selected brand archetype
  - Base font size 16px or larger on body text
- negative_signals:
  - Light-weight type on low-contrast background
  - More than 3 font weights in active use on a single screen
- anti_patterns:
  - Using display fonts at body sizes
  - Mixing incompatible style epochs (e.g., humanist + mechanical geometric)
- evidence_required: Rendered type specimen at H1 / H2 / Body / Caption scale with contrast ratio measurements
- weight: 0.15
- minimum_floor: 2
- source_refs:
  - [SRC-ID of typography Trend Scan entry — replace with actual source_id from 04_Sources.md]
- goal_refs:
  - [project goal this axis supports]
- review_questions:
  - Does the typeface pairing match the brand archetype aesthetic_properties for typography?
  - Does body text pass WCAG AA contrast at all defined color/background combinations?

<!-- Add additional TRD-XX axes below following the same schema.
     For non-visual axes, omit the `visual_category: true` field or set it to false. -->

### Axis: [TRD-03]

<!-- Repeat the schema above for each additional trend-derived axis -->

- axis_id: TRD-03
- axis_name: [axis name]
- layer: trend-derived
- origin: [source]
- intent: [measurement intent]
- why_it_matters: [impact]
- score_scale: 1-5
- score_anchors:
  - low: [1 — poor with a measurable quantitative proxy]
  - mid: [3 — acceptable with a measurable quantitative proxy]
  - high: [5 — excellent with a measurable quantitative proxy]
- positive_signals:
  - [signal]
- negative_signals:
  - [signal]
- anti_patterns:
  - [pattern]
- evidence_required: [evidence]
- weight: [weight]
- minimum_floor: [floor]
- source_refs:
  - [SRC-ID from 04_Sources.md Source Registry]
- goal_refs:
  - [ref]
- review_questions:
  - [question]
