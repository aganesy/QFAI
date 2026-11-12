# DESIGN.md Authoring

How `/qfai-sdd` writes the root `DESIGN.md` for a UI-bearing flow.

Applies only to a UI-bearing target — one whose classified surface set names
`web`, `mobile`, `desktop` or `mixed`. A cli-only target has no root
`DESIGN.md`.

## Contents

- Where the answers come from
- Output mapping
- Taking the values from the theme
- When the file already exists

## Where the answers come from

The interview is `/qfai-discussion`'s. Its answers are the Interview rows of
the deliberation record SDD consumes:

| An Interview row on                  | Carries                                                          |
| ------------------------------------ | ---------------------------------------------------------------- |
| the target surfaces                  | whether the flow is UI-bearing, as the `tech.md` `Surface` row   |
| the brand direction                  | the adopted theme, what departs from it, and what stays ordinary |
| a competitive or component reference | its adopted points, its rejected points, its local translation   |
| a design direction the user rejected | the anti-goal and the reason the user gave                       |
| a trend finding                      | the conclusion the user accepted                                 |

The brand comes from the Interview row in which the user chose it. For initial
authoring of a missing file, a UI-bearing record with no row on the brand
direction leaves the brand unchosen — stop and ask rather than pick one, which
is the same rule an imported specification gets.

What the record settles becomes exploration constraints, never a chosen
design. `/qfai-sdd` selects no visual winner; `/qfai-prototyping` explores
under the constraints.

- **`# Brand Philosophy` body.** The product intent, the interactions that
  must survive exploration, the brand signals, how the product differs from
  the generic version of itself, and the trend conclusions the record settles.
- **A reference.** Each competitive or component reference the record settles:
  its adopted points and their local translation under **Do**, its rejected
  points under **Don't** and in `audience.do_not_look_like`. A competitive
  reference is an input to deliberate deviation, not a template to copy
  unchanged.
- **A rejected direction.** Each design direction the user rejected goes under
  **Don't** as an anti-goal, with its reason and a concrete cue a downstream
  reviewer uses to stop it recurring.

The questions behind those answers are in the design DNA intake reference.

## Output mapping

The result is **one root `DESIGN.md`** at `<consuming-project-root>/DESIGN.md`.
It is the brand SSOT: `/qfai-prototyping` iterates under its tokens, and
`/qfai-implement` reads them from it.

Fill the fields in this order. The archetype is chosen by scoring against the
three intent fields, so those come first.

- Brand personality → `brand.voice` (1..N short trait words) and the
  `# Brand Philosophy` body.
- Audience emotion → `audience.emotion`.
- Rejected reference points → `audience.do_not_look_like` and the
  **Don't** subsection of the `# Brand Philosophy` body. This field names
  identities to avoid, not conventions.
- Rejected directions → the **Don't** subsection, each with its reason and
  its review cue.
- Adopted reference points, with their local translation → the **Do**
  subsection of `# Brand Philosophy`.
- Brand archetype → `brand.archetype`. Allowed values are the 8-archetype
  catalog in the brand catalog
  (`minimal | bold | corporate | playful | organic | tech | elegant | casual`).
  Map the theme the Interview row records to the archetype that describes it;
  the Selection Guide's scoring is the fallback for a brand direction that
  names no theme, and an answer arrived at that way is the assistant's, not the
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
  the DESIGN.md specification.

For the schema (12 colors, 3 fonts, 4 radii, 3 shadows, 8 archetypes), read
the DESIGN.md specification and start from the sample at
`qfai-prototyping/templates/DESIGN.md.sample`.

## Taking the values from the theme

Twelve colours, three families, four radii and three shadows. Do not compose
them. Everything downstream treats them as exact — every literal in every prototype
is checked against them — so a number arrived at by taste puts that exactness
on top of a guess.

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

`npx qfai init` writes no root `DESIGN.md`; the sample is shipped only as a
skill template. A root file that exists was authored by `common-design-md` or
copied from that template on purpose, and a project may have authored its own.
Write a missing file from the recorded direction. Repair an existing file only when SDD triage names its exact path
and the requested change. Apply only that change; preserve existing brand and
tokens unless the user decided their change and it is supported by recorded
direction or named theme values. Record the source of each changed value and
leave unrelated content unchanged. Stop without writing a value neither source
supplies. Without such a triaged change, validate the existing file without an
overwrite. An unreplaced sample is refused.

For an existing valid file, validation and triaged repairs that preserve
its brand and tokens require no new brand selection. An authorized brand or
token change still needs recorded direction or named theme values for each
changed value; without either source, stop without writing the change.
