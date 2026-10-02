# Handoff (post-loop)

## Inputs

`.qfai/prototype/iter-<final>/index.html` — the final accepted
iteration HTML. The "final" iter is whichever iteration was the latest
when `npx qfai prototyping iterate` returned exit 64 (convergence) or 65
(max-iterations).

This is the **authoring** artifact — one self-contained file with one
client-side route per declared screen, written by the generator. It is
a distinct tree from the **capture** artifacts at
`.qfai/evidence/prototyping/iter-<final>/<screenId>.{html,png}`, which
`npx qfai prototyping iterate --capture` fans out one pair per declared
screen. Handoff copies the authoring artifact; `npx qfai prototyping
certify` gates on the capture artifacts and never opens the
`prototypes/` tree. Both must exist before handoff can complete: see
"Output layout" in `references/generator-prompt.md`.

Root `DESIGN.md` remains the brand SSOT through handoff.

## Outputs

### `.qfai/prototype/final/index.html`

A copy (not a symlink) of the latest accepted iter. `/qfai-implement`
reads this as a read-only artifact.

### `prototyping.json#handoff`

Add a `handoff` object to `.qfai/evidence/prototyping/prototyping.json`,
with exactly these three keys:

```json
"handoff": {
  "finalArtifact": ".qfai/prototype/final/index.html",
  "procurement": {
    "procured": [{ "screen": "<screen id>", "region": "<what part of the screen>", "item": "<catalogue item, or the project component it already had>" }],
    "authored": [{ "screen": "<screen id>", "region": "<what part of the screen>", "why": "<what was looked for and did not serve>" }],
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

The `DESIGN.md` hash the loop ran against is already in
`prototyping.json#designMd`; the handoff does not repeat it. Image sources
stay in `prototyping.json#imageSources[]`.

`npx qfai validate --profile prototyping` checks the record:
`QFAI-DCON-012` when `handoff` is not an object, `QFAI-DCON-013` when
`finalArtifact` or `implementationNotes` is not a non-empty string or
`procurement` has the wrong shape, and `QFAI-PROT-009` when
`finalArtifact` does not exist.

`procurement` is the SSOT for component structure: the implementer reads
it to install, and the reviewer reads it to check rather than to judge a
resemblance. `DESIGN.md` is the SSOT for brand identity.

What the prototype never showed — responsive behaviour, dark mode, focus
and hover states, keyboard order, the detail of an empty or error state —
is not in either. A static capture cannot carry it. Take the adopted
design system's default, which has already answered each one and answers
them consistently with each other
(`.qfai/assistant/rule/ui-procurement.md`).

The evidence tree is local to the checkout and is not committed, so
`/qfai-implement` and the reviewers read the handoff in the same checkout.

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

## Cert

Order is load-bearing: `npx qfai prototyping certify` requires the configured
validate report (with `counts.error === 0`) and `.qfai/report/verify.json`
(with `status === "PASS"`) to be present on disk before it will seal the
certificate.

The two reads are not the same shape. The **validate** report is read from
whatever `output.validateJsonPath` names — one location, no fallback. Only
**`verify.json`** is canonical-first: it falls back to the legacy
`.qfai/output/verify.json` and prints a migration note when it does. That
fallback fires only when the canonical file is **absent** — a canonical file
that exists but is unparseable, non-object, or unreadable aborts certify with a
non-zero exit instead, so a leftover legacy `status: "PASS"` can never certify a
run whose real gate result was never readable. A canonical file that is missing
in both locations is reported as missing, not as a failing status.

Run the gates in this order, every time:

1. `npx qfai validate --profile prototyping --fail-on error` — writes the path
   configured at `output.validateJsonPath` (default
   `.qfai/report/validate.json`), not a fixed `.qfai/output/` literal.
2. `/qfai-verify` — writes `.qfai/report/verify.json` with
   `status: "PASS"` and `scope: "prototyping"`. Certify accepts no
   other scope: `atdd` / `implement` / `full` are refused by the
   option-B phase-isolation contract, and a `full` run at this point
   necessarily fails the stage-5 ATDD traceability rules
   (`QFAI-ATDD-111/112/113`). The field list and the `scope` enum are
   specified in
   `.qfai/assistant/skill/qfai-verify/references/verify-output-contract.md`.
3. `npx qfai prototyping certify` — produces
   `.qfai/evidence/prototyping/completion-certificate.json`. The
   certificate carries `designMd` (the path and sha256 of root
   `DESIGN.md`) for the brand identity the loop ran against. Use
   `certify --check` to verify digests against later edits.

Reversing this order makes step 3 fail with "validate.json missing"
or "verify.json status not PASS" — those are the certify
preconditions, not assertions about a separate state.
