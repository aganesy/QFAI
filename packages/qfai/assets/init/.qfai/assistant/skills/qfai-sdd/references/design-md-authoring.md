# DESIGN.md Authoring

How Phase 0 writes the root `DESIGN.md`.

Applies only to a UI-bearing target — one whose classified surface set names
`web`, `mobile`, `desktop` or `mixed`. A cli-only target has no root
`DESIGN.md`.

## Contents

- Where the answers come from
- Output mapping
- Taking the values from the theme
- When the file already exists
- Freezing it

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
- Brand archetype → `brand.archetype`. Allowed values are the 8-archetype
  catalog in `design-md-brand-catalog.md`
  (`minimal | bold | corporate | playful | organic | tech | elegant | casual`).
  Map the theme the pack records to the archetype that describes it; the
  Selection Guide's scoring is the fallback for a pack whose direction names
  no theme, and an answer arrived at that way is the assistant's, not the
  user's. The archetype's `interaction` default seeds `accessibility.motion`,
  which no theme publishes. Its `color_tendency` / `typography` / `spacing`
  defaults seed `visual.*` only for a file with no `brand.theme`: where a theme
  is named, the theme's published values are the source and a prose tendency
  cannot overrule them. `visual.*` accepts only
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

## Freezing it

The Phase 0 procedure for a UI-bearing target on a visual-prototyping surface.

1. Read root `DESIGN.md` at `<consuming-project-root>/DESIGN.md`. If missing, author it per the sections above, from the design direction the discussion pack this spec's provenance names already recorded — the classification in `01_Context.md` and the reference registries in `04_Sources.md`. A spec taken in through import-lite has no pack and therefore no recorded
   direction: stop and ask for it rather than inventing a brand.
2. Call `isUnreplacedDesignMdSample(text)`. If it returns `true`, the file is still a qfai sample brand and MUST NOT be frozen: stop and ask the user to author this product's own brand SSOT, deleting the `QFAI-SAMPLE-DESIGN-MD` marker comment if present (samples from releases older than the marker are recognised by content instead). `npx qfai init` seeds the sample into the project root
   and never overwrites it, so step 1's missing-file check cannot catch this — an unreplaced sample parses and validates by construction, and freezing it binds `/qfai-prototyping` and the reviewer lock rule to a fictional brand.
3. Call `parseDesignMd(text)`. If the result is `{ error: ParseError }`, stop and report `path` / `code` / `message` for the parse error. Otherwise the result is `{ data: DesignMd; body: string }`; pass `data` to `validateDesignMd(data)`. If that issue list is non-empty, stop and report each issue. Both functions, together with `hashDesignMd` and the `DesignMd` / `ParseError` /
   `ParseResult` / `ValidationIssue` types, are re-exported from the public `qfai` package entry (`import { parseDesignMd, validateDesignMd, hashDesignMd, isUnreplacedDesignMdSample } from "qfai"`).
4. Call `hashDesignMd(text)` to compute sha256 over the raw bytes.
5. Write `.qfai/contracts/design/DESIGN.md.lock.yaml` from the template at `templates/contracts/design-md-lock.sample.yaml` with these fields:
   - `designMdPath: "DESIGN.md"`
   - `designMdSha256: <hex>`
   - `frozenAt: <UTC ISO-8601>`, the time of this freeze. A re-freeze writes every field again, never the hash alone: gates compare `designMdSha256` with `DESIGN.md`, and no gate reads `frozenAt`, so a stale one passes and records a freeze that did not happen then.
   - `schemaTokens.colors`, `fontFamilies`, `radii`, `shadows` enumerated per the sample.
6. Record the freeze in `_policies/05_Contracts.md` under the Contract Index. The lock yaml plus root `DESIGN.md` are the only brand contract; per-aspect brand yaml contracts have been removed.
