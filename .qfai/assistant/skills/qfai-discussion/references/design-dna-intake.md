# Design DNA Intake

Use this reference only for UI-bearing discussion packs.

## Interview Targets

- Brand personality: list 3-5 traits the product should express.
- Audience emotion: define what users should feel after the primary task.
- Category conventions: name the expected layout and interaction
  patterns for this market.
- Differentiation targets: state what must feel unlike generic SaaS or
  direct competitors.
- Anti-template constraints: name default visual patterns that must
  not survive into prototyping.
- Reference strategy: collect competitor, adjacent, aspirational,
  template-seed, and anti-pattern references.

## Reference Rules

- Treat templates as seeds, not winners.
- Capture both adopted and rejected points for every reference.
- Translate references into local product rules instead of copying
  visual surfaces.
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
- Anti-template constraints + rejected references →
  `audience.do_not_look_like` and the **Don't** subsection of the
  `# Brand Philosophy` body.
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
