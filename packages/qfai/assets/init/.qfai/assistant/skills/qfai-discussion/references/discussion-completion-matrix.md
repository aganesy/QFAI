# Discussion Completion Matrix

Use this file for the full completion logic behind `/qfai-discussion`.

## UI-bearing Packs

Completion is blocked until all are true:

1. Root `DESIGN.md` exists at the consuming-project root and parses as valid front-matter
   (`brand`, `audience`, and the full `visual.*` token tree). Required whenever any
   classified surface — `primary_surface` **or** an entry in `secondary_surfaces` — is
   `web`, `mobile`, `desktop` or `mixed`. See `## CLI Packs` below.
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

A **cli-only** pack — `primary_surface: cli` with no `web`/`mobile`/`desktop`/`mixed`
entry in `secondary_surfaces` — is UI-bearing but is not a visual-prototyping surface,
so conditions 1 and 2 above do not apply to it:

- No root `DESIGN.md` required, and no `visual.*` token tree to author. `/qfai-prototyping`
  rejects `cli`, so nothing downstream ever reads the token values. `/qfai-sdd` Phase 0
  skips the DESIGN.md freeze for a cli-only project, and
  `validators/designContractReadiness.ts` skips `QFAI-DCON-030`/`-031` for it.
- Conditions 3-7 apply unchanged: all three canonical `uiux/` sidecars, the full
  screen-contract schema, unranked exploration directions, no forbidden legacy sidecar,
  and zero open OQs.
- `route:` on a `cli` screen contract names the command invocation, not a web path (see
  `ui-bearing-playbook.md#visual-prototyping-surfaces-vs-cli`).
- No `prototyping.yaml`: `cli` is not a valid prototyping execution surface.
- `primary_surface: cli` with a visual `secondary_surfaces` entry is NOT a cli-only pack —
  conditions 1 and 2 stay blocking for it.

## Non-UI Packs

- No uiux sidecars required
- No root `DESIGN.md` required
- No additional UI-bearing completion conditions apply
- `prototyping.yaml` is not required

## Notes

- HTML+CSS mock is optional fallback only.
- Behavior obligations remain primary.
