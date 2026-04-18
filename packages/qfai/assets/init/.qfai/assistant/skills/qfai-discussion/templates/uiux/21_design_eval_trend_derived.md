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
  - low: 1 — Cold, discordant palette; no intentional warmth signal
  - mid: 3 — Neutral warmth; does not conflict but lacks intentional expression
  - high: 5 — Palette actively reinforces product personality; warmth is consistent across surfaces
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
  - low: 1 — System default font, no typographic intentionality; WCAG AA contrast fails
  - mid: 3 — Legible at normal sizes; typeface choice is safe but does not signal quality
  - high: 5 — Purpose-selected typeface pair; strong scale ratio; WCAG AA passes at all sizes
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
  - low: [1 — poor]
  - mid: [3 — acceptable]
  - high: [5 — excellent]
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
