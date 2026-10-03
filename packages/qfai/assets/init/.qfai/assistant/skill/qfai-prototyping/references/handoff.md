# Handoff (post-loop)

## Inputs

`.qfai/prototype/iter-<final>/index.html` — the iteration the user
confirmed. It is one self-contained file with one client-side route per
declared screen, written by the generator.

Root `DESIGN.md` remains the brand SSOT through handoff.

## Outputs

### `.qfai/prototype/final/index.html`

A copy (not a symlink) of the confirmed iteration. `/qfai-implement`
reads this as a read-only artifact.

### `.qfai/prototype/final/handoff.json`

Write a JSON object with exactly these three keys:

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

No `qfai` command reads or checks the handoff. `/qfai-implement` and the
reviewers read it in the same checkout.

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
