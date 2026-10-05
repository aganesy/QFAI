# Discussion Artifact Rules

Use this file when `/qfai-discussion` creates or reviews `.qfai/discussion/discussion-*` packs.

## Required Pack

Each pack uses immutable timestamp naming: `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/`.

Required files:

- `01_Context.md`, which holds the inception deck
- `03_Story-Workshop.md`
- `04_Sources.md`
- `05_Scope.md`
- `06_REQ.md`
- `07_NFR.md`
- `08_Glossary.md`
- `09_Constraints.md`, which holds the policies
- `11_OQ-Register.md`, which holds every open, resolved, deferred and rejected
  question

Discussion packs with a visual prototyping surface (`web`, `mobile`, `desktop`, `mixed`) may include `prototyping.yaml` as an optional recommendation artifact; cli-only packs omit it, and non-ui discussion packs typically omit it. For `ui_bearing: false`, typically omit `prototyping.yaml`. Current discussion-pack readiness does not block on missing `prototyping.yaml`.

## Rules

- Run interview and requirement capture until `Disposition: open` is zero in `11_OQ-Register.md`.
- OQ `Gate` values are `discussion`, `sdd`, `atdd`, `tdd`, or `ops`.
- `deferred` is allowed only when the row records its `Resolution` and a `Next-Decision-Point` naming the next point at which the question is decided.
- Discussion outputs state what was decided and why; do not duplicate the story tree under `<paths.specsDir>`, and do not record how the session went.
- `03_Story-Workshop.md` must include at least one Mermaid diagram.
- Use Mermaid fences only for diagrams.

## A Pack in an Earlier Layout

`npx qfai validate` checks only the latest pack. An older pack keeps the layout it was written in; move one the same way before a stage reads it.

| Earlier file              | Where its content goes                                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `02_Inception-Deck.md`    | `01_Context.md`, under `## Inception Deck`, each heading one level lower (`## 1. Why Are We Here?` becomes `### 1. Why Are We Here?`)                         |
| `10_Policy.md`            | `09_Constraints.md`: `Security Policy`, `Compliance Policy`, `Development Policy` and `Operational Policy`, each a `##` section                               |
| `13_Deferred.md`          | `11_OQ-Register.md`: a row with `Disposition` deferred, a `Resolution` and a `Next-Decision-Point`                                                            |
| `12_OQ-Resolution-Log.md` | `11_OQ-Register.md`: edit the row, and its `Resolution` says how the question was settled                                                                     |
| `14_Review-Request.md`    | Nothing: the review templates are gone                                                                                                                        |
| `99_delta.md`             | A decision goes to the file it shapes, a rejected direction to `04_Sources.md`, and a discrepancy that still needs action to an open question with Gate `sdd` |

- A `10_Policy.md` section with no required home, such as an ID or design policy, goes under `## Development Policy` as a `###` section if a later stage still needs it, and is dropped otherwise.
- `npx qfai validate` asks only for the three moves that fill a required file. The last three files are listed by `npx qfai doctor` and `npx qfai init` as left over, and nothing deletes them. Read each before deleting it: it may hold the only record of a decision or a drift event.
- After a move, search the pack for the old file names and replace each with the new location, since `06_REQ.md` and the other files may still cite them.

## UI/UX Exploration Family

For UI-bearing packs, use:

- `04_Sources.md` for trend translation and both reference registries
- `uiux/40_screen_contracts.md`

Discussion is exploration-first and must not choose a single visual winner or final design system. It records the design direction; `/qfai-sdd`'s `common-design-md` step turns that record into root `DESIGN.md`, and prototyping then iterates under its tokens.

## `prototyping.yaml`

When `prototyping.yaml` is present, use the single-thread schema:

```yaml
prototyping:
  surface: web # web | mobile | desktop | mixed
```

Mode-tier fields (`recommended_mode` / `allowed_modes` / `mode_expectations`)
are not supported. The single-thread evolution loop owns its iteration
budget; see `.qfai/assistant/step/prototyping-loop/STEP.md`.
