# Handoff (post-loop)

## Contents

- Inputs
- Outputs
- Scoped handoff
- Restyle handoff
- Checking an implementation's tokens

## Inputs

`.qfai/prototype/iter-<final>/index.html` — the iteration the user
confirmed. It is one self-contained file with one client-side route per
declared screen, written by the generator.
A `restyle` loop has no such file: its iterations restyled the live app
in place, and its handoff is the short form under Restyle handoff below.

Root `DESIGN.md` remains the brand SSOT through handoff.

## Outputs

### `.qfai/prototype/final/index.html`

A copy (not a symlink) of the confirmed iteration. `/qfai-implement`
reads this as a read-only artifact.

### `.qfai/prototype/final/handoff.json`

Write a record of the canonical handoff schema, CLI-HANDOFF. Its fields are
`companyName`, `primaryUiContract`, `startDate`, `signature`, `entryPattern`
and `productScope`, each an optional string, and a record may carry further
keys. The prototyping handoff carries three of its own:

```json
{
  "finalArtifact": ".qfai/prototype/final/index.html",
  "procurement": {
    "procured": [
      {
        "screen": "<screen id>",
        "region": "<what part of the screen>",
        "item": "<catalogue item, or the project component it already had>"
      }
    ],
    "authored": [
      {
        "screen": "<screen id>",
        "region": "<what part of the screen>",
        "why": "<what was looked for and did not serve>"
      }
    ],
    "drawn-from-project": [{ "screen": "<screen id>" }]
  },
  "implementationNotes": "Plain prose ..."
}
```

- `finalArtifact` is the copy above.
- `procurement` says what realises each screen region, so the implementer
  installs rather than reconstructs. Every screen a UI contract declares
  appears in one of the three lists, with one row per region.
- A screen drawn entirely from what the project already had goes under
  `drawn-from-project` rather than being left out. An omitted screen reads
  the same as one the loop recorded nothing for, and an implementer taking
  the second for the first rebuilds by hand what the loop procured.
- `implementationNotes` is plain prose, for what is genuinely prose: why a
  flow is ordered as it is, and usability decisions worth carrying into
  `/qfai-implement`. It does not carry decisions that have a structured
  form above, and it does not restate brand identity — read `DESIGN.md`.

`procurement` is the SSOT for component structure: the implementer reads
it to install, and the reviewer reads it to check rather than to judge a
resemblance. `DESIGN.md` is the SSOT for brand identity.

What the prototype never showed — responsive behaviour, dark mode, focus
and hover states, keyboard order, the detail of an empty or error state —
is not in either. A static capture cannot carry it. Take the adopted
design system's default, which has already answered each one and answers
them consistently with each other
(`.qfai/assistant/rule/ui-procurement.md`).

`/qfai-implement` and the reviewers read it as a CLI-HANDOFF record in the
same checkout. `npx qfai validate --profile saas-package` requires it to be present
and to conform, and reports `QFAI-SAAS-002` naming the file
otherwise; no other command reads it.

## Scoped handoff

When `progress.md` records a `runScope`, the confirmed iteration changed
only the in-scope parts of a `final/index.html` an earlier run confirmed.
The unit of the merge is the screen route, one per declared screen, and each
place a route renders an in-scope shared component.

- In `final/index.html`, replace each in-scope screen's route, and each
  in-scope component wherever a route renders it, together with the style
  only they use, with the confirmed iteration's version. Keep every other
  part as it was.
- A difference between the confirmed iteration and `final/` outside those
  parts is a change the scope left out: keep `final/`'s version and name the
  difference in the completion report.
- In `final/handoff.json`, replace the `procurement` rows of the in-scope
  screens and components, keep every other row, so every declared screen
  still appears, and record the scope the user confirmed as `runScope`:

```json
{
  "runScope": {
    "screens": ["<ui-contract-id>/<screen>"],
    "components": ["<repository path or procurement item>"]
  }
}
```

The confirmed prototype is then the whole of `final/`: the in-scope parts
this run confirmed, and every other part as an earlier run confirmed it. A
run with no scope copies the whole iteration and writes no `runScope`.

## Restyle handoff

When `.qfai/prototype/progress.md` records `iterationKind` `restyle`, every
screen is one the project already runs, so there is no prototype to copy and no region to
procure. No `final/index.html` is written, and
`final/handoff.json` takes this short form in place of `finalArtifact` and `procurement`:

```json
{
  "iterationKind": "restyle",
  "liveRoutes": ["<route the confirmed iteration listed>"],
  "entryPoints": {
    "stylesheet": ["<repository-relative path>"],
    "motion": ["<repository-relative path>"]
  },
  "implementationNotes": "Plain prose ..."
}
```

- `liveRoutes` names every live route the confirmed iteration listed.
- `entryPoints` names the files the restyle changed: the stylesheet entry
  points and the motion entry points, each list empty when the restyle
  changed none.
- `implementationNotes` is as above.
- `npx qfai validate --profile saas-package` reports a `restyle` record
  without a non-empty `liveRoutes` or without both `entryPoints` lists.

## Checking an implementation's tokens

QFAI checks the prototype against the tokens in root `DESIGN.md`. It does
not read the product's stylesheet or Tailwind config, so a project that
holds its implementation to those tokens writes that check itself, reading
`DESIGN.md` directly. Two things make it hold:

- **Assert both directions.** Every token `DESIGN.md` declares is declared
  in the implementation, and every token the implementation declares is in
  `DESIGN.md`.
- **Let a token name contain digits.** `typography.scale` runs from `xs` to
  `3xl`. A name pattern such as `--token-([a-z-]+)` never captures `2xl` or
  `3xl`, so both directions pass for them without checking anything. Use
  `--token-([a-z0-9-]+)` or wider.

When `DESIGN.md` names a `brand.theme`, that name is the instruction:
install the theme, rather than reproduce its values by hand and hope they
match. The values stay in `DESIGN.md` because the gates read them, not
because anyone should type them.
