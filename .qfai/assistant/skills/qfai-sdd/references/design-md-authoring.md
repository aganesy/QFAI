# DESIGN.md Authoring

How Phase 0 writes the root `DESIGN.md`.

Applies only to a UI-bearing target — one whose classified surface set names
`web`, `mobile`, `desktop` or `mixed`. A cli-only target has no root
`DESIGN.md`.

## Where the answers come from

The interview is `/qfai-discussion`'s, and its record is the discussion pack
this spec's provenance names:

| Source                                            | Carries                    |
| ------------------------------------------------- | -------------------------- |
| `01_Context.md`                                   | the surface classification |
| `04_Sources.md`                                   | both reference registries  |
| `uiux/00_index.md`, `uiux/40_screen_contracts.md` | the screen-level sidecars  |

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
  (`minimal | bold | corporate | playful | organic | tech | elegant | casual`);
  its Selection Guide carries the scoring and the tie-break. The archetype's
  `interaction` default seeds `accessibility.motion`, which no theme
  publishes. Its `color_tendency` / `typography` / `spacing` defaults seed
  `visual.*` only for a file with no `brand.theme`: where a theme is named,
  the theme's published values are the source and a prose tendency cannot
  overrule them. `visual.*` accepts only
  `colors | typography | radius | shadow | spacing`, so a `visual.motion` or
  `visual.interaction` key fails DESIGN.md validation.
- The theme itself → `brand.theme`, named so a reader can install it, and the
  source of every value below.
- Visual decisions (color, typography, radius, shadow) → the `visual.*` token
  tree, **taken from the named theme's published values**. Schema and
  validation rules live in
  `.qfai/assistant/skills/qfai-prototyping/references/design-md-spec.md`.

For the schema (12 colors, 3 fonts, 4 radii, 3 shadows, 8 archetypes), read
`qfai-prototyping/references/design-md-spec.md` and start from the sample at
`qfai-prototyping/templates/DESIGN.md.sample`.

## Taking the values from the theme

Twelve colours, three families, four radii and three shadows. Do not compose
them. Everything downstream treats them as exact — the lock hashes them,
`certify` re-scans them, every literal in every capture is checked against
them — so a number arrived at by taste puts that exactness on top of a guess.

The theme's vocabulary will not line up one-to-one with these names, which is
what makes this a translation rather than a copy. Below is the crosswalk for a
theme that publishes the common CSS-variable set; a theme with different names
is read the same way, by role.

| This file                  | The theme's role                     |
| -------------------------- | ------------------------------------ |
| `surface`, `surface_muted` | page background, card, muted surface |
| `text`, `text_muted`       | foreground, muted foreground         |
| `primary`, `secondary`     | primary and secondary action         |
| `accent`                   | accent                               |
| `danger`                   | destructive                          |
| `border`                   | border                               |
| `overlay`                  | the scrim behind a modal             |
| `warning`, `success`       | usually absent — see below           |

Two rules for the gaps.

- **A role the theme does not publish** — commonly `warning` and `success` —
  is derived from the theme's own palette, not chosen freshly: take the hue
  the theme uses for the nearest status and hold its lightness and saturation
  to the theme's other colours. Then check it against
  `accessibility.contrast_ratio_min`.
- **A role the theme publishes and this file has no name for** — a focus ring,
  an input fill, a popover surface — is not added. The schema is closed, and
  the installed theme supplies it at implementation time anyway.

Record the theme in `brand.theme` in the same act. A file whose values came
from somewhere it does not name is one nobody can check, and the next person
to touch a colour has nothing to be consistent with.

## When the file already exists

`npx qfai init` seeds the sample at the project root and never overwrites it,
and a project may have authored its own. Write only when the file is missing.
An existing file is validated and frozen as it stands, except that an
unreplaced sample is refused rather than frozen.
