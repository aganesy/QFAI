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
2. The stage evidence's `## Grilling Session` row shows the session ended before authoring began,
   with `Ended` reading one of the three endings that authorize it:

   | Ended         | Also required                                                                     |
   | ------------- | --------------------------------------------------------------------------------- |
   | `confirmed`   | No node open — the frontier empty **and** no fact lookup still running            |
   | `user-closed` | Lookups finished, and every decision still open recorded as a labelled assumption |
   | `no-question` | Every remaining decision registered open, so item 3 below is what blocks          |

   `stopped` never completes: the user ended the run, and a pack authored after that is the run
   doing what they told it not to.

   Both halves of the `confirmed` condition, because when every remaining decision waits on a
   lookup the frontier is empty while the tree still holds open nodes, and authoring there begins
   before the lookup can raise the questions it was dispatched to answer.

   Not at a count, and not on the questions running out.

   This is blocking rather than advisory because the failure it catches leaves no other trace. A
   pack authored mid-session looks exactly like one authored after: fifteen files, every topic
   covered, every open question registered. What is missing is that someone agreed to what is in
   them, and nothing downstream can tell.

   The no-question row is the one to read carefully: `--auto` can reach nobody, so waiting for a
   confirmation would stop the run before it could write the open questions that are what block it.
   Item 3 below does that work instead — an open count above zero closes nothing.

3. `Disposition: open` count is zero in `11_OQ-Register.md`.

   Here rather than under one pack shape. It is what a no-question run is blocked by, and a run is
   `--auto` or not independently of whether it has a surface — listed only under `## UI-bearing
Packs`, it let a non-UI `--auto` pack complete with its decisions still open.
   Item 7 below does that work instead — an open count above zero closes nothing.

## UI-bearing Packs

Completion is blocked until all are true:

1. Both reference registries in `04_Sources.md` are complete, each entry naming what was
   adopted, what was rejected, and how it was translated, with competitor references
   framed as **deviate-from** inputs. Required whenever any classified surface —
   `primary_surface` **or** an entry in `secondary_surfaces` — is `web`, `mobile`,
   `desktop` or `mixed`; these are the visual-prototyping surfaces. They are what
   `/qfai-sdd` Phase 0 authors root `DESIGN.md` from. See `## CLI Packs` below.
2. The canonical `uiux/` family is complete: `00_index.md`, `40_screen_contracts.md`,
   `50_review_input_bundle.md`.
3. Every screen contract in `40_screen_contracts.md` carries the full template schema.
4. Exploration directions are carried unranked — no single screen exploration is selected and the
   design system is not finalized here (discussion is planner-first).
5. `01_Context.md#Design Direction` names an adopted theme, what departs from it, and what stays
   ordinary. This is the one visual decision made here, because no later stage asks the user for
   it: `/qfai-sdd` Phase 0 authors tokens from whatever is recorded. A direction taken without the
   user carries `chosen_by: assumption` and an open entry in `11_OQ-Register.md`.
6. No forbidden legacy sidecar exists under `uiux/` (see
   `templates/uiux/00_index.md#Forbidden Legacy Files`).

Evaluation axes are global constants (4-step ordinal: weak / acceptable / strong /
exceptional) and are NOT authored as discussion sidecars, so no scoring, override, strategy,
taste-interview, option-comparison or selected-anchor sidecar is required or permitted.

## CLI Packs

A **cli-only** pack — `primary_surface: cli` with no `web`/`mobile`/`desktop`/`mixed`
entry in `secondary_surfaces` — is UI-bearing but is not a visual-prototyping surface,
so conditions 1 and 5 above do not apply to it:

- No brand registries required, and no root `DESIGN.md` downstream. `/qfai-prototyping`
  rejects `cli`, so nothing ever reads a `visual.*` token value. `/qfai-sdd` Phase 0
  skips the DESIGN.md freeze for a cli-only project, and
  `validators/designContractReadiness.ts` skips `QFAI-DCON-030`/`-031` for it.
- No design direction either: nothing downstream reads a theme for a surface that renders
  no tokens.
- Conditions 2, 3, 4, 6 and 7 apply unchanged: all three canonical `uiux/` sidecars, the
  full screen-contract schema, unranked exploration directions, no forbidden legacy
  sidecar, and zero open OQs.
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
