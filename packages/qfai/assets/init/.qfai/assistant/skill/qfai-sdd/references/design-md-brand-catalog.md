# Design-MD Brand Catalog

Reference catalog of 8 canonical brand archetypes. The SDD design stage picks one to fill the
required `brand.archetype` field of the root `DESIGN.md`; each archetype supplies
`aesthetic_properties` that become the starting tokens, and
the `Output mapping` section of the DESIGN.md authoring reference defines where
each value is written.

---

## Contents

- Archetype: Minimal
- Archetype: Bold
- Archetype: Corporate
- Archetype: Playful
- Archetype: Organic
- Archetype: Tech
- Archetype: Elegant
- Archetype: Casual
- Patterns to avoid
- Typeface candidates
- Selection Guide

## Archetype: Minimal

- representative_brand: Apple, Notion, Linear
- aesthetic_properties:
  - color_tendency: Light neutral ground with a tint of its own; one accent hue chosen for the brand
  - typography: A sans-serif chosen for the brand at regular weight; large scale ratios carry the hierarchy
  - spacing: Generous space that groups and separates; element counts kept deliberately low per screen
  - interaction: Subtle transitions; interactions feel frictionless and obvious
- typeface_candidates: Hanken Grotesk, Schibsted Grotesk, Albert Sans

## Archetype: Bold

- representative_brand: Nike, Spotify, Figma
- aesthetic_properties:
  - color_tendency: One saturated brand color leads, with a supporting range ranked beneath it
  - typography: Condensed or heavy display weights for headlines, sized against the content they lead
  - spacing: Tight internal component spacing; breath introduced only at section level
  - interaction: Short, fast motion on the actions that matter; decisive pressed and selected states
- typeface_candidates: Bricolage Grotesque, Archivo at a condensed width, Anton

## Archetype: Corporate

- representative_brand: IBM, Salesforce, Microsoft 365
- aesthetic_properties:
  - color_tendency: A brand hue of its own with neutrals tinted toward it; semantic colors reserved for status
  - typography: Grotesque or humanist sans-serif chosen for the brand; a clear weight and size hierarchy
  - spacing: Grid-aligned; spacing varies to group related items; density leans compact
  - interaction: Minimal animation; reliability and predictability over delight
- typeface_candidates: IBM Plex Sans, Source Sans 3, Public Sans

## Archetype: Playful

- representative_brand: Duolingo, Mailchimp, Discord
- aesthetic_properties:
  - color_tendency: Several bright hues in a clear order: one primary, the others supporting it
  - typography: Rounded or quirky sans-serif; variable weight for personality
  - spacing: Moderate; breathing room balanced with visual richness
  - interaction: Springy easing and celebratory moments kept for key actions; hover stays calm
- typeface_candidates: Fredoka, Baloo 2, Gluten

## Archetype: Organic

- representative_brand: Airbnb, Etsy, Headspace
- aesthetic_properties:
  - color_tendency: Earth tones taken from the brand's own materials or setting; low saturation
  - typography: Serif or humanist sans-serif with organic curves; medium weight
  - spacing: Comfortable; asymmetry acceptable to evoke craft and warmth
  - interaction: Slow, gentle easing tuned to each element; softness preferred over speed
- typeface_candidates: Alegreya, Alegreya Sans, Literata

## Archetype: Tech

- representative_brand: Tesla, Vercel, Raycast
- aesthetic_properties:
  - color_tendency: Dark and light themes both designed; monochrome base with one accent chosen for the brand
  - typography: Sharp grotesque sans; monospace only for code and aligned figures; sentence-case labels
  - spacing: Dense with strong grid discipline; every pixel intentional
  - interaction: Instant response; minimal duration; mechanical precision
- typeface_candidates: Chivo, Red Hat Text, JetBrains Mono for code only

## Archetype: Elegant

- representative_brand: Chanel, Aesop, Stripe
- aesthetic_properties:
  - color_tendency: Restrained palette of deep and light neutrals with one precious accent
  - typography: Classic serif for headlines; refined sans for body; tracking set per size
  - spacing: Generous, with space that groups and paces the content
  - interaction: Slow, quiet transitions chosen per element; no sudden movements
- typeface_candidates: Cormorant Garamond, EB Garamond, Libre Franklin for body

## Archetype: Casual

- representative_brand: Slack, Dropbox, Buffer
- aesthetic_properties:
  - color_tendency: Friendly mid-tones, bright but not garish; warm secondary hues
  - typography: Rounded humanist sans-serif; approachable weight and scale
  - spacing: Comfortable; interface feels familiar and non-intimidating
  - interaction: Light spring easing; feedback is immediate but unobtrusive
- typeface_candidates: Figtree, Rubik, Atkinson Hyperlegible

---

## Patterns to avoid

The design anti-patterns reference lists the patterns that mark a design as generated,
by aspect, and the substitutes a model falls back to once one is banned. Read it
before turning an archetype's defaults into `DESIGN.md` values. A value that
produces a listed pattern stays only where the recorded brand direction asks for
it.

## Typeface candidates

`typeface_candidates` names families that suit an archetype. It is a starting
point, not the answer, and it is not a `DESIGN.md` key: the chosen family goes
into `visual.typography`.

- Where a `brand.theme` is named, its published typeface wins over this list.
- Choose for the recorded brand direction, not for looking distinctive. Any
  family here becomes the new default once it is used everywhere, and a
  candidate picked on reflex is the pattern this catalog exists to prevent.
- Inter, Roboto, Arial, Open Sans, Lato, Poppins and the system font stack are
  the first defaults. Space Grotesk, Geist, Instrument Serif, Fraunces and
  Satoshi are what a model reaches for once those are banned. None of them is a
  candidate here.
- Every candidate is free to use under an open font licence.

For text in another script, choose a family that covers it rather than leaving
the browser to fall back. Put the Latin family first in the stack, so Latin
letters and numerals do not fall back to a default family either.

- Japanese: BIZ UDPGothic, Zen Kaku Gothic New, M PLUS 2
- Chinese: LXGW WenKai, Source Han Serif SC, Smiley Sans for display only
- Cyrillic: Golos Text, Onest, PT Serif

## Selection Guide

Use this catalog when `qfai-sdd` authors the root `DESIGN.md` for a UI-bearing flow.
Picking an archetype fills a required `DESIGN.md` field. It does not settle screen structure,
which the UI contracts own, and it does not settle the prototype's layout, which
`/qfai-prototyping` explores under its tokens.

1. Score each archetype against the brand intent the discussion pack recorded (`brand.voice`, `audience.emotion`, `audience.do_not_look_like`). The score is the fit between that intent and the archetype's `representative_brand` and `aesthetic_properties` above — the only archetype facts this catalog publishes.
2. Break a tie with the inputs step 1 already read, in this order: (a) the archetype whose `aesthetic_properties` contradict fewer entries of `audience.do_not_look_like`, since that field is an explicit exclusion rather than a preference; (b) alphabetical archetype name. Both are decidable from what the intake captured, so the same discussion yields the same archetype for any agent. Do not weigh a "visual-theme weight": the catalog publishes no such number for an archetype, and a tie-break that needs one is not executable here.
3. Record the selected archetype in root `DESIGN.md` front-matter as `brand.archetype`.
4. The selected archetype's `aesthetic_properties` become the defaults for Color Palette, Typography, Spacing, and Animation sections.
5. Customize those defaults into project-specific values, split by destination: `color_tendency` / `typography` / `spacing` become `visual.*` tokens, while the `interaction` default becomes `accessibility.motion` — `visual.*` has no motion or interaction key.
