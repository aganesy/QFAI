# DESIGN.md Authoring

How Phase 0 writes the root `DESIGN.md`.

Applies only to a UI-bearing target — one whose classified surface set names
`web`, `mobile`, `desktop` or `mixed`. A cli-only target has no root
`DESIGN.md`.

## Where the answers come from

The interview is `/qfai-discussion`'s, and its record is the discussion pack
this spec's provenance names:

| Source                                            | Carries                                       |
| ------------------------------------------------- | --------------------------------------------- |
| `01_Context.md`                                   | the surface classification, and the direction |
| `04_Sources.md`                                   | both reference registries                     |
| `uiux/00_index.md`, `uiux/40_screen_contracts.md` | the screen-level sidecars                     |

`01_Context.md#Design Direction` is the decision the user made: the adopted
theme, what departs from it, and what stays ordinary. A UI-bearing pack that
records none leaves the brand unchosen — stop and ask rather than pick one,
which is the same rule a pack taken in through import-lite gets.

Each registry entry carries what was adopted, what was rejected, and how it
was translated. The competitor registry feeds brand and tokens; the component
catalogue registry feeds screen structure, which is the contracts' business,
not this file's.

The questions behind those answers are in
`../../qfai-discussion/references/design-dna-intake.md`.

## Output mapping

The result is **one root `DESIGN.md`** at `<consuming-project-root>/DESIGN.md`.
It is the brand SSOT: Phase 0 freezes its sha256, and `/qfai-prototyping`
iterates under its tokens.

Fill the fields in this order. The archetype is chosen by scoring against the
three intent fields, so those come first.

- Brand personality → `brand.voice` (1..N short trait words) and the
  `# Brand Philosophy` body.
- Audience emotion → `audience.emotion`.
- Rejected competitor references → `audience.do_not_look_like` and the
  **Don't** subsection of the `# Brand Philosophy` body. This field names
  identities to avoid, not conventions.
- Adopted reference points → the **Do** subsection of `# Brand Philosophy`.
- Adopted theme → `brand.archetype`. Allowed values are the 8-archetype
  catalog in `design-md-brand-catalog.md`
  (`minimal | bold | corporate | playful | organic | tech | elegant | casual`).
  Map the theme the pack records to the archetype that describes it; the
  Selection Guide's scoring is the fallback for a pack whose direction names
  no theme, and an answer arrived at that way is the assistant's, not the
  user's. Take the chosen
  archetype's `aesthetic_properties` as defaults: `color_tendency` /
  `typography` / `spacing` seed `visual.*`, and the `interaction` default
  seeds `accessibility.motion`. `visual.*` accepts only
  `colors | typography | radius | shadow | spacing`, so a `visual.motion` or
  `visual.interaction` key fails DESIGN.md validation.
- Visual decisions (color, typography, radius, shadow) → the `visual.*` token
  tree, starting from those defaults. Schema and validation rules live in
  `.qfai/assistant/skills/qfai-prototyping/references/design-md-spec.md`.

For the schema (12 colors, 3 fonts, 4 radii, 3 shadows, 8 archetypes), read
`qfai-prototyping/references/design-md-spec.md` and start from the sample at
`qfai-prototyping/templates/DESIGN.md.sample`.

## When the file already exists

`npx qfai init` seeds the sample at the project root and never overwrites it,
and a project may have authored its own. Write only when the file is missing.
An existing file is validated and frozen as it stands, except that an
unreplaced sample is refused rather than frozen.
