# 10 Plan

- Objective: keep discussion authoring aligned with the exploration-first harness.

## Implementation approach

- Replace old design-evaluation sidecar family references with exploration-first sidecar references.
- Keep `04_Sources.md` as the reference-research registry.
- Ensure discussion artifacts stop before winner selection and design-system finalization.
- The alternative considered was letting discussion carry the winner and the design system through to finalization. It was rejected because it collapses exploration and decision into one pass, and the pack then has no state in which options are still open.

### Story-tree layout

- At P6, with the assistant-tree rename, `research-first-protocol.md` moves
  from `constitution/` to `rule/`. The discussion skill's `project_memory`
  list and every path this spec cites follow it to `rule/` and to
  `skill/qfai-discussion/`. The change is text only and adds no case.
- Two source files name the old path and move in the same change:
  - `packages/qfai/src/core/validators/researchSummary.ts`, whose remediation
    message cites the protocol;
  - `packages/qfai/src/core/governedAssistantManifest.ts`, which is
    regenerated rather than edited.
- Keeping a link at the old path is rejected: no window accepts both
  assistant-tree layouts.

## Test approach

Acceptance is checked against the shipped artifacts rather than against prose,
so each item below names something a reader can diff:

- Sidecar family names match the shipped templates.
- Required headings match the current validators.
- No active prose requires legacy single-winner selection, legacy evaluation contract, or discussion-time design-system generation.
- `QFAI-MOCK-010` covers the mock href form; the template and the validator are an SSOT-sync pair, so a case is needed on each side rather than one shared case.

### Story-tree layout

- The asset tests that read the protocol by path are repointed in the same
  change: `researchFirstOwner.test.ts`, `researchFirstProtocolWiring.test.ts`,
  `discussionGrilling.test.ts` and `assets.test.ts` under
  `packages/qfai/tests/assets/`. Their assertions stay; only the path changes.
- Each reads the new path alone. A test that accepted either path would pass
  over a move that left a copy behind.

## NFR approach

- **NFR-0001, UI-bearing sidecars only when classification requires them.**
  The skill classifies the target with `references/ui-bearing-playbook.md`
  before it takes any UI-bearing branch, and a UI-bearing pack gets the
  canonical family only: `uiux/00_index.md`, `uiux/40_screen_contracts.md`
  and `uiux/50_review_input_bundle.md`. Breach measurement: TC-0010-0001
  finds a UI-bearing pack without one of the two screen-level sidecars, or
  TC-0010-0008 lists a legacy sidecar among the emitted files.
- **NFR-0002, planner artifacts concrete enough for downstream
  normalization.** The review bundle states its best-of-history handling
  (AC-0010-0005), and root `DESIGN.md` carries the four token tables
  downstream skills parse (AC-0010-0007). Breach measurement: TC-0010-0005
  finds the bundle without the best-of-history statement, or TC-0010-0007
  finds `DESIGN.md` missing one of the color, typography, radius and shadow
  tables.
- **NFR-0003, no pre-empted winner selection.** Discussion artifacts stop
  before winner selection and design-system finalization (AC-0010-0006).
  Breach measurement: TC-0010-0006 raises the planner-first violation on a
  pack that declares a final winner direction or a finalized design system.

## Second-Wave (v1.9.2) — How

- Mock template (REQ-0154 / DR-0265): emit anchor-form `<a href="#<name>">` links in the discussion mock template; update SKILL.md authoring guidance to instruct anchor-form. Keep `QFAI-MOCK-010` strict (PASS `#name` + `http(s)://`). Treat template ↔ validator as an SSOT-sync pair guarded by `R-MOCK-HREF-DRIFT`.
- Active session pointer writer (REQ-0155 / DR-0266): on pack finalization, `/qfai-discussion` writes `.qfai/state.json#discussion.currentId` with the authored pack ID. `qfai discussion list --active` reads the pointer; resolution rejects absent/missing/duplicate with an error naming candidate dirs and `qfai discussion use <id>`. No mtime inference; no committed-config storage.

## Risk mitigation

| Risk                                                                                                                                  | Likelihood / impact | Mitigation                                                                                                                                 | Trigger to act                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| The mock template and `QFAI-MOCK-010` drift, so the shipped template emits a form its own validator rejects                           | med / high          | The pair is guarded by `R-MOCK-HREF-DRIFT`; the validator stays strict rather than being widened to accept whatever the template emits     | An href form is added to the template without a validator case                   |
| The active-session pointer is inferred from directory mtime when the pointer is missing, making the answer depend on filesystem noise | low / high          | Resolution rejects absent / missing / duplicate with an error naming the candidate dirs and `qfai discussion use <id>`; no mtime inference | Any mtime-ordering appears on the resolution path                                |
| Discussion is asked to produce a winner or a design system, re-collapsing exploration into decision                                   | med / med           | The artifacts stop before winner selection by construction, and the prose that required it has been removed rather than deprecated         | A template or SKILL.md change reintroduces a single-winner or design-system step |

### Story-tree layout

| Risk                                                                                                                 | Likelihood / impact | Mitigation                                                                                 | Trigger to act                                                                                      |
| -------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| A citation of `constitution/research-first-protocol.md` survives the move in a skill, a template or a source message | med / low           | The move, the citations, the two source readers and the repointed tests land in one change | `skillDocReferences.ts` reports a stale `constitution/` pattern, or a test still reads the old path |
