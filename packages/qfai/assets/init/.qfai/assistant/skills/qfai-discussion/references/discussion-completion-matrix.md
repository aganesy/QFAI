# Discussion Completion Matrix

Use this file for the full completion logic behind `/qfai-discussion`.

## All Packs

Blocking for every pack, UI-bearing or not:

1. The `## Research Summary` section of `04_Sources.md` is filled from an actual run of
   `.qfai/assistant/constitution/research-first-protocol.md`, executed at the start of the session
   (before Inception Deck and Story Workshop) so its findings feed the artifacts that follow —
   no template placeholder is left,
   `sources` / `best_practices` / `anti_patterns` / `reflection` are non-empty, every `source_id`
   resolves to a `sources[].id`, and at least one `reflection[]` entry records an apply decision.
   `npx qfai validate --profile discussion --fail-on error` reports `QFAI-RESEARCH-*` until it is.

## UI-bearing Packs

Completion is blocked until all are true:

1. Both reference registries in `04_Sources.md` are complete, each entry naming what was
   adopted, what was rejected, and how it was translated, with competitor references
   framed as **deviate-from** inputs. Required whenever any classified surface —
   `primary_surface` **or** an entry in `secondary_surfaces` — is `web`, `mobile`,
   `desktop` or `mixed`; these are the visual-prototyping surfaces. They are what
   `/qfai-sdd` Phase 0 authors root `DESIGN.md` from. See `## CLI Packs` below.
2. `04_Sources.md#Design Direction` names an adopted theme, where it is procured from,
   the accent that departs from it, and who decided. `decided_by: user` where a user
   answered; `decided_by: assumed: <source>` names the evidence it was read off. An
   assumption with no source named is not a direction — the run stops rather than
   recording one. Same surfaces as condition 1.
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

- No brand registries and no design direction required, and no root `DESIGN.md`
  downstream. `/qfai-prototyping` rejects `cli`, so nothing ever reads a `visual.*`
  token value. `/qfai-sdd` Phase 0 skips the DESIGN.md freeze for a cli-only project,
  and `validators/designContractReadiness.ts` skips `QFAI-DCON-030`/`-031` for it.
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
- No additional UI-bearing completion conditions apply; the `## All Packs` conditions above
  (including the Research Summary) still block completion
- `prototyping.yaml` is not required

## Notes

- HTML+CSS mock is optional fallback only.
- Behavior obligations remain primary.
