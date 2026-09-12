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

## Asking for the direction

One decision sets how the product looks, and only the user can make it:
which published theme the product is built on. Nothing downstream asks
again — `/qfai-sdd` Phase 0 authors tokens from whatever is recorded — so
an unasked question becomes an invented brand.

Route the ask through
`.qfai/assistant/constitution/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`.
Do not open a second path for it. The cap constrains this stage as it does every
other, so the reason the budget is not the obstacle is the exemption rather than
the scope: a question whose subject is a decision the skill declares mandatory is
an approval, and a question inside a grilling session whose subject is a decision
the design has left open is a grilling question. Both are exempt. A question
inside a session whose subject is something else is an ordinary clarification and
is capped like any other.

**Offer candidates, not adjectives.** "Which of these three" is a choice a
user can make from a page; "how would you describe the brand" asks them to
specify a thing they are hiring the product to produce. Name each candidate,
say what it looks like, and say what adopting it settles.

**Bias the candidates toward the ordinary.** A recognisable product with one
distinctive element beats a distinctive product. Novelty in structure costs
the user their existing knowledge and buys nothing a brand can hold — the
brand lives on the accent, which is where the next question goes.

Then ask what departs from the theme. Keep it to the primary hue and the
typeface pairing unless the user asks for more; everything else stays as the
theme shipped it, which is how a screen keeps looking like one thing.

With no user present, take the most conventional candidate, record it as
`chosen_by: assumption`, and open it in `11_OQ-Register.md`. Do not block.

## Where the answers go

The interview is recorded, not rendered. Its answers go into the pack:
the classification and the chosen direction into `01_Context.md`, both
reference registries into `04_Sources.md`, and the screen-level decisions
into `uiux/`.

Root `DESIGN.md` is written later, by `/qfai-sdd` Phase 0, which reads
those records. The mapping from answer to field is
`qfai-sdd/references/design-md-authoring.md`.
