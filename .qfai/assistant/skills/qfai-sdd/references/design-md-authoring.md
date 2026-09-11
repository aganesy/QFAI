# DESIGN.md Authoring

How Phase 0 writes the root `DESIGN.md`.

Applies only to a UI-bearing target — one whose classified surface set names
`web`, `mobile`, `desktop` or `mixed`. A cli-only target has no root
`DESIGN.md`.

## Where the answers come from

The interview is `/qfai-discussion`'s, and its record is the discussion pack
this spec's provenance names:

| Source                                            | Carries                                             |
| ------------------------------------------------- | --------------------------------------------------- |
| `01_Context.md`                                   | the surface classification                          |
| `04_Sources.md`                                   | the design direction, and both reference registries |
| `uiux/00_index.md`, `uiux/40_screen_contracts.md` | the screen-level sidecars                           |

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
- Brand archetype → `brand.archetype`. Allowed values are the 8-archetype
  catalog in `design-md-brand-catalog.md`
  (`minimal | bold | corporate | playful | organic | tech | elegant | casual`).
  Where the design direction names an adopted theme, take the archetype that
  theme fits; the user already made this choice, and re-deriving it can
  contradict them. Score against the intent fields only when no theme was
  recorded — the catalog's Selection Guide carries the scoring and the
  tie-break. Take the chosen archetype's `aesthetic_properties` as defaults:
  `color_tendency` / `typography` / `spacing` seed `visual.*`, and the
  `interaction` default seeds `accessibility.motion`. `visual.*` accepts only
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
