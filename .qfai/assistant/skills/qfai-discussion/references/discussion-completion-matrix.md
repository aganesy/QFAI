# Discussion Completion Matrix

Use this file for the full completion logic behind `/qfai-discussion`.

## UI-bearing Packs

Completion is blocked until all are true:

1. Root `DESIGN.md` exists at the consuming-project root and parses as valid front-matter
   (`brand`, `audience`, and the full `visual.*` token tree). Visual-prototyping surfaces
   only (`web`, `mobile`, `desktop`, `mixed`) — see `## CLI Packs` below.
2. `# Brand Philosophy` body documents do/don't, brand signals, and exploration references
   framed as **deviate-from** inputs. Visual-prototyping surfaces only.
3. The canonical `uiux/` family is complete: `00_index.md`, `40_screen_contracts.md`,
   `50_review_input_bundle.md`.
4. Every screen contract in `40_screen_contracts.md` carries the full template schema.
5. Exploration directions are carried unranked — no single visual winner is selected and the
   design system is not finalized here (discussion is planner-first).
6. No forbidden legacy sidecar exists under `uiux/` (see
   `templates/uiux/00_index.md#Forbidden Legacy Files`).
7. `Disposition: open` count is zero in `11_OQ-Register.md`.

Evaluation axes are global constants (4-step ordinal: weak / acceptable / strong /
exceptional) and are NOT authored as discussion sidecars, so no scoring, override, strategy,
taste-interview, option-comparison or selected-anchor sidecar is required or permitted.

## CLI Packs

`cli` is UI-bearing but is not a visual-prototyping surface, so conditions 1 and 2 above
do not apply to it:

- No root `DESIGN.md` required, and no `visual.*` token tree to author. `/qfai-prototyping`
  rejects `cli`, so nothing downstream ever reads the token values.
- Conditions 3-7 apply unchanged: the canonical `uiux/` family, the full screen-contract
  schema, unranked exploration directions, no forbidden legacy sidecar, and zero open OQs.
- `route:` on a `cli` screen contract names the command invocation, not a web path (see
  `ui-bearing-playbook.md#visual-prototyping-surfaces-vs-cli`).

## Non-UI Packs

- No uiux sidecars required
- No root `DESIGN.md` required
- No additional UI-bearing completion conditions apply
- `prototyping.yaml` is not required

## Notes

- HTML+CSS mock is optional fallback only.
- Behavior obligations remain primary.
