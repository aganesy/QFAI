# Design DNA Intake

Use this reference only for UI-bearing discussion packs.

## Interview Targets

- Brand personality: list 3-5 traits the product should express.
- Audience emotion: define what users should feel after the primary task.
- Category conventions: name the expected layout and interaction
  patterns for this market.
- Differentiation targets: state what must not read as a direct
  competitor. Brand, not layout.
- Reference strategy: collect two kinds, and keep them apart. A
  competitor is consulted to differ from; a component catalogue is
  consulted to adopt from.

## Reference Rules

A reference is read for one of two opposite reasons, and which one
decides everything else about how it is used.

| Reference | Consulted to | Lands in |
| --- | --- | --- |
| A competitor product | Differ from it | `DESIGN.md`: brand and tokens |
| A component catalogue | Adopt from it | `.qfai/contracts/ui/*.yaml`: screen structure |

A product that looks like its competitor has no brand. A settings screen
that does not look like a settings screen has no users. Resembling a
conventional product is not a brand failure: differentiation belongs on
the accent — the primary hue, the typeface pairing — not on the shape of
the screen.

- Capture both adopted and rejected points for every reference.
- Translate a competitor reference into a local product rule instead of
  copying its visual surface. Take a catalogue's layout as it is.
- Record copy risk as `low`, `medium`, or `high`.
- Record template usage policy as `none`, `reference-only`, or
  `implementation-seed`.

## Output Mapping (new SSOT path)

The interview produces **one root `DESIGN.md`** at
`<consuming-project-root>/DESIGN.md`. This file is the brand SSOT
consumed by `/qfai-sdd` (which freezes its sha256) and by
`/qfai-prototyping` (which iterates under its tokens).

Map the interview answers into `DESIGN.md` as follows:

- Brand personality → `brand.voice` (1..N short trait words) and the
  `# Brand Philosophy` body.
- Brand archetype → `brand.archetype`. Allowed values are the
  8-archetype catalog in `design-md-brand-catalog.md`
  (`minimal | bold | corporate | playful | organic | tech | elegant |
casual`). Use `aesthetic_properties` from the catalog as defaults:
  `color_tendency` / `typography` / `spacing` seed `visual.*`, and the
  `interaction` default seeds `accessibility.motion` — `visual.*` accepts
  only `colors | typography | radius | shadow | spacing`, so a
  `visual.motion` / `visual.interaction` key fails DESIGN.md validation.
- Audience emotion → `audience.emotion`.
- Rejected competitor references → `audience.do_not_look_like` and the
  **Don't** subsection of the `# Brand Philosophy` body. This field names
  identities to avoid, not conventions.
- Visual decisions (color, typography, radius, shadow) → the
  `visual.*` token tree. Schema and validation rules live in
  `.qfai/assistant/skills/qfai-prototyping/references/design-md-spec.md`.
- Adopted reference points → the **Do** subsection of
  `# Brand Philosophy`.

For the schema (12 colors, 3 fonts, 4 radii, 3 shadows, 8 archetypes),
read `qfai-prototyping/references/design-md-spec.md` and use the
sample at `qfai-prototyping/templates/DESIGN.md.sample` as a starting
shape.

Evaluation axes are global constants (4-step ordinal: weak / acceptable
/ strong / exceptional) and are not authored as discussion sidecars.
