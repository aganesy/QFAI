# 10 Plan

- Objective: keep discussion authoring aligned with the exploration-first harness.

## Implementation approach

- Replace old design-evaluation sidecar family references with exploration-first sidecar references.
- Keep `04_Sources.md` as the reference-research registry.
- Ensure discussion artifacts stop before winner selection and design-system finalization.
- The alternative considered was letting discussion carry the winner and the design system through to finalization. It was rejected because it collapses exploration and decision into one pass, and the pack then has no state in which options are still open.

## Test approach

Acceptance is checked against the shipped artifacts rather than against prose,
so each item below names something a reader can diff:

- Sidecar family names match the shipped templates.
- Required headings match the current validators.
- No active prose requires legacy single-winner selection, legacy evaluation contract, or discussion-time design-system generation.
- `QFAI-MOCK-010` covers the mock href form; the template and the validator are an SSOT-sync pair, so a case is needed on each side rather than one shared case.

## Second-Wave (v1.9.2) — How

- Mock template (REQ-0154 / DR-0265): emit anchor-form `<a href="#<name>">` links in the discussion mock template; update SKILL.md authoring guidance to instruct anchor-form. Keep `QFAI-MOCK-010` strict (PASS `#name` + `http(s)://`). Treat template ↔ validator as an SSOT-sync pair guarded by `R-MOCK-HREF-DRIFT`.
- Active session pointer writer (REQ-0155 / DR-0266): on pack finalization, `/qfai-discussion` writes `.qfai/state.json#discussion.currentId` with the authored pack ID. `qfai discussion list --active` reads the pointer; resolution rejects absent/missing/duplicate with an error naming candidate dirs and `qfai discussion use <id>`. No mtime inference; no committed-config storage.

## Risk mitigation

| Risk                                                                                                                                  | Likelihood / impact | Mitigation                                                                                                                                 | Trigger to act                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| The mock template and `QFAI-MOCK-010` drift, so the shipped template emits a form its own validator rejects                           | med / high          | The pair is guarded by `R-MOCK-HREF-DRIFT`; the validator stays strict rather than being widened to accept whatever the template emits     | An href form is added to the template without a validator case                   |
| The active-session pointer is inferred from directory mtime when the pointer is missing, making the answer depend on filesystem noise | low / high          | Resolution rejects absent / missing / duplicate with an error naming the candidate dirs and `qfai discussion use <id>`; no mtime inference | Any mtime-ordering appears on the resolution path                                |
| Discussion is asked to produce a winner or a design system, re-collapsing exploration into decision                                   | med / med           | The artifacts stop before winner selection by construction, and the prose that required it has been removed rather than deprecated         | A template or SKILL.md change reintroduces a single-winner or design-system step |
