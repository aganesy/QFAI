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

1. Root `DESIGN.md` exists at the consuming-project root and parses as valid front-matter
   (`brand`, `audience`, and the full `visual.*` token tree).
2. `# Brand Philosophy` body documents do/don't, brand signals, and exploration references
   framed as **deviate-from** inputs.
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

## Non-UI Packs

- No uiux sidecars required
- No root `DESIGN.md` required
- No additional UI-bearing completion conditions apply; the `## All Packs` conditions above
  (including the Research Summary) still block completion
- `prototyping.yaml` is not required

## Notes

- HTML+CSS mock is optional fallback only.
- Behavior obligations remain primary.
