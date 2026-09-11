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
- Design direction: the adopted theme and the one accent that departs
  from it. This one is asked, not inferred — see
  `## Design Direction Interview` below.

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

## Design Direction Interview

The single decision with the largest effect on how the product looks. Ask it
here, with the person who owns the brand, rather than leaving it to whoever
writes the tokens.

Route the question through
`.qfai/assistant/constitution/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`.
It is brand intent, which this skill lists as `hard-required`.

### Offer candidates, not adjectives

The user is choosing, not specifying. "Which of these three" is answerable;
"how would you describe the brand" is not.

Build the candidate list from what the project can actually procure:

1. `.qfai/assistant/catalog/tech.md#Frontend` — the CSS framework, component
   source and adopted theme, when the project has already named them.
2. `uiux.registries` in `qfai.config.yaml` — the registries a component name
   resolves against.
3. The catalogues registered in `04_Sources.md`.

Give each candidate a name and say what it looks like in one line. Three is
enough.

### Bias toward the ordinary

Offer a recognisable, conventional product with one distinctive element ahead
of a distinctive product. Novelty in structure costs usability and buys
nothing a brand can hold. The brand accent is the departure; the rest of the
theme is adopted as it stands.

### Record the answer

Write it into `04_Sources.md#Design Direction`: the adopted theme, where it
is procured from, the one accent that departs from it, and the conventions
kept as they are.

### When nobody answers

Under `--auto`, or when the user defers, read the direction off evidence and
label it: `decided_by: assumed: <source>`. The evidence, in order, is the
theme named in `catalog/tech.md#Frontend`, then the design system the
project's framework already ships.

When nothing names one, stop and report it. A brand invented with no user and
no evidence behind it is the failure this interview exists to prevent.

## Where the answers go

The interview is recorded, not rendered. Its answers go into the pack:
the classification into `01_Context.md`, the design direction and both
reference registries into `04_Sources.md`, and the screen-level
decisions into `uiux/`.

Root `DESIGN.md` is written later, by `/qfai-sdd` Phase 0, which reads
those records. The mapping from answer to field is
`qfai-sdd/references/design-md-authoring.md`.
