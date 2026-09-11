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

| Reference             | Consulted to   | Lands in                                      |
| --------------------- | -------------- | --------------------------------------------- |
| A competitor product  | Differ from it | `DESIGN.md`: brand and tokens                 |
| A component catalogue | Adopt from it  | `.qfai/contracts/ui/*.yaml`: screen structure |

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

## Where the answers go

The interview is recorded, not rendered. Its answers go into the pack:
the classification into `01_Context.md`, both reference registries into
`04_Sources.md`, and the screen-level decisions into `uiux/`.

Root `DESIGN.md` is written later, by `/qfai-sdd` Phase 0, which reads
those records. The mapping from answer to field is
`qfai-sdd/references/design-md-authoring.md`.
