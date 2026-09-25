# Design-MD Brand Catalog

Reference catalog of 8 canonical brand archetypes. Phase 0 DESIGN.md Freeze picks one to fill the
required `brand.archetype` field of the root `DESIGN.md`; each archetype supplies
`aesthetic_properties` that become the starting tokens, and
`design-md-authoring.md#output-mapping` defines where each value is written.

---

## Archetype: Minimal

- representative_brand: Apple, Notion, Linear
- aesthetic_properties:
  - color_tendency: Near-white backgrounds, single accent hue, generous negative space
  - typography: One sans-serif family with a character of its own, at regular weight; large scale ratios
  - spacing: Extra-generous gutters; element counts kept deliberately low per screen
  - interaction: Subtle transitions; interactions feel frictionless and obvious
- typeface_candidates: Instrument Sans, Hanken Grotesk, Schibsted Grotesk

## Archetype: Bold

- representative_brand: Nike, Spotify, Figma
- aesthetic_properties:
  - color_tendency: High-saturation primary colors; dark backgrounds with vivid accent pops
  - typography: Condensed or display weights; heavy headlines that command attention
  - spacing: Tight internal component spacing; breath introduced only at section level
  - interaction: Snappy, energetic micro-animations; decisive hover states
- typeface_candidates: Bricolage Grotesque, Archivo at a condensed width, Anton

## Archetype: Corporate

- representative_brand: IBM, Salesforce, Microsoft 365
- aesthetic_properties:
  - color_tendency: Mid-range blues and grays; structured palette with clear semantic mapping
  - typography: Neutral grotesque or humanist sans-serif; consistent weight hierarchy
  - spacing: Grid-aligned with predictable rhythm; density leans compact
  - interaction: Minimal animation; reliability and predictability over delight
- typeface_candidates: IBM Plex Sans, Source Sans 3, Public Sans

## Archetype: Playful

- representative_brand: Duolingo, Mailchimp, Discord
- aesthetic_properties:
  - color_tendency: Multi-hue palette with 3–4 accent colors; high brightness
  - typography: Rounded or quirky sans-serif; variable weight for personality
  - spacing: Moderate; breathing room balanced with visual richness
  - interaction: Bouncy easing curves; celebratory moments on key actions
- typeface_candidates: Fredoka, Baloo 2, Gluten

## Archetype: Organic

- representative_brand: Airbnb, Etsy, Headspace
- aesthetic_properties:
  - color_tendency: Earth tones, warm neutrals, terracotta, sage; low saturation
  - typography: Serif or humanist sans-serif with organic curves; medium weight
  - spacing: Comfortable; asymmetry acceptable to evoke craft and warmth
  - interaction: Slow, gentle ease-in-out; softness preferred over speed
- typeface_candidates: Fraunces, Newsreader, Crimson Pro

## Archetype: Tech

- representative_brand: Tesla, Vercel, Raycast
- aesthetic_properties:
  - color_tendency: Dark-mode-first; monochrome base with electric accent (cyan, neon)
  - typography: Sharp grotesque sans; monospace only for code and aligned figures; sentence-case labels
  - spacing: Dense with strong grid discipline; every pixel intentional
  - interaction: Instant response; minimal duration; mechanical precision
- typeface_candidates: IBM Plex Sans, Chivo, JetBrains Mono for code only

## Archetype: Elegant

- representative_brand: Chanel, Aesop, Stripe
- aesthetic_properties:
  - color_tendency: Neutral palette — ivory, charcoal, gold accent; restraint is the rule
  - typography: Classic serif for headlines; refined sans for body; wide letter-spacing
  - spacing: Generous; content-to-whitespace ratio strongly favors whitespace
  - interaction: Slow, fade-based transitions; no sudden movements
- typeface_candidates: Playfair Display, Cormorant Garamond, Libre Franklin for body

## Archetype: Casual

- representative_brand: Slack, Dropbox, Buffer
- aesthetic_properties:
  - color_tendency: Friendly mid-tones, bright but not garish; warm secondary hues
  - typography: Rounded humanist sans-serif; approachable weight and scale
  - spacing: Comfortable; interface feels familiar and non-intimidating
  - interaction: Light spring easing; feedback is immediate but unobtrusive
- typeface_candidates: Figtree, Rubik, Atkinson Hyperlegible

---

## Typeface candidates

`typeface_candidates` names families that fit an archetype. It is a starting
point, not the answer, and it is not a `DESIGN.md` key: the chosen family goes
into `visual.typography`.

- Choose for the brand, not for looking distinctive. A model free to choose
  settles on the same few distinctive families across projects, so a candidate
  picked on reflex becomes the next default.
- Inter, Roboto, Open Sans, Lato and the system font stack are the default
  families. None of them is a candidate for any archetype.
- Where a `brand.theme` is named, its published typeface wins over this list.

## Patterns that mark a design as generated

A model given no design direction falls back on a few default styles, whatever
the product is. Each pattern below suits some brief, but it appears because it
is a default, not because the brief asked for it. A general instruction to
avoid a "generic look" swaps one default for another; naming the pattern is
what works.

| Cluster              | What it looks like                                                                                                                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Warm editorial       | Cream or off-white background, high-contrast serif display, terracotta or warm-clay accent                                                                                                                                                              |
| Dark with one accent | Near-black background with a single acid-green or vermilion accent                                                                                                                                                                                      |
| Broadsheet           | Hairline rules, zero corner radius, dense newspaper-like columns                                                                                                                                                                                        |
| SaaS card kit        | Identical rounded cards, one radius everywhere, soft grey shadow, gradient washes as decoration                                                                                                                                                         |
| Template chrome      | Tracked-out all-caps eyebrow labels, middle-dot meta strings, `WORD — fragment` headings, tinted near-black text, monospace data labels, `→` after links, one italic or colored word in a headline, `01 / 02 / 03` section numbers, pill-shaped buttons |

A `DESIGN.md` value that matches a row is kept only where the brand direction
the discussion pack recorded asks for it. Otherwise choose again.

This governs visual identity: typography, color, surface, motion. How a control
behaves and what information a screen shows stay under
`.agents/rules/interface-clarity.md`, which asks for the conventional pattern.
The two do not conflict: the target is a conventional control inside a
distinctive visual identity. An invented interaction is still a defect.

## Selection Guide

Use this catalog during Phase 0 DESIGN.md Freeze, step 1 (`qfai-sdd/SKILL.md`).
Picking an archetype fills a required `DESIGN.md` field. It does not settle screen structure,
which the UI contracts own, and it does not settle the prototype's layout, which
`/qfai-prototyping` explores under the frozen tokens.

1. Score each archetype against the brand intent the discussion pack recorded (`brand.voice`, `audience.emotion`, `audience.do_not_look_like`). The score is the fit between that intent and the archetype's `representative_brand` and `aesthetic_properties` above — the only archetype facts this catalog publishes.
2. Break a tie with the inputs step 1 already read, in this order: (a) the archetype whose `aesthetic_properties` contradict fewer entries of `audience.do_not_look_like`, since that field is an explicit exclusion rather than a preference; (b) alphabetical archetype name. Both are decidable from what the intake captured, so the same discussion yields the same archetype for any agent. Do not weigh a "visual-theme weight": the catalog publishes no such number for an archetype, and a tie-break that needs one is not executable here.
3. Record the selected archetype in root `DESIGN.md` front-matter as `brand.archetype`.
4. The selected archetype's `aesthetic_properties` become the defaults for Color Palette, Typography, Spacing, and Animation sections.
5. Customize those defaults into project-specific values, split by destination: `color_tendency` / `typography` / `spacing` become `visual.*` tokens, while the `interaction` default becomes `accessibility.motion` — `visual.*` has no motion or interaction key.
