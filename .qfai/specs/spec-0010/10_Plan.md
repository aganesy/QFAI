# 10 Plan

- Objective: keep discussion authoring aligned with the exploration-first harness.

## Implementation approach

- Replace old design-evaluation sidecar family references with exploration-first sidecar references.
- Keep `04_Sources.md` as the reference-research registry.
- Ensure discussion artifacts carry the screen explorations unranked and stop before design-system finalization.
- Record the brand direction the user chooses in `01_Context.md#Design Direction`; `/qfai-sdd` Phase 0 authors root `DESIGN.md` from it, so discussion writes no `DESIGN.md`.
- The alternative considered was letting discussion carry the winner and the design system through to finalization. It was rejected because it collapses exploration and decision into one pass, and the pack then has no state in which options are still open.

### Intent-driven entry (CAP-0018)

This change introduces no architectural element. It writes `qfai-discussion`'s
own `references/orchestrated-mode.md` in the table format CLI-WFFILE owns.

Units and work. The order across the batch is spec-0018 `10_Plan.md` `### Implementation order`. Everything here is **U2**:

- `qfai-discussion/references/orchestrated-mode.md`, holding:
  - the entry check (BR-0010-0014);
  - the Operations table, `resolve-unsettled-product-scope` (BR-0010-0015);
  - reading the work order's `settled` field and asking nothing it answers
    (BR-0010-0013).
- One citation line in `qfai-discussion/SKILL.md`.

Left out: the core's refusals (spec-0018); the tracked records the stage writes,
which `qfai-run`'s proposal names (spec-0018).

## Test approach

Acceptance is checked against the shipped artifacts rather than against prose,
so each item below names something a reader can diff:

- Sidecar family names match the shipped templates.
- Required headings match the current validators.
- No active prose requires legacy single-winner selection, legacy evaluation contract, or discussion-time design-system generation.
- `QFAI-MOCK-010` covers the mock href form; the template and the validator are an SSOT-sync pair, so a case is needed on each side rather than one shared case.

### Intent-driven entry (CAP-0018)

Every case this change adds reads a shipped file, so it is `L3`, under
`packages/qfai/tests/integration/`. One module holds the cases of one business
rule.

| Layer | What it proves                                                                                                                                        | Module                                                      | Cases                   |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------- |
| `L3`  | The reference takes what the work order's `settled` field records as settled, and covers only the scope it leaves unresolved                          | `discussionSettledInputsSpec0010.test.ts`                   | TC-0010-0014            |
| `L3`  | `SKILL.md` cites `references/orchestrated-mode.md` with one line, and the reference cites the shared entry check                                      | `discussionEntryCheckSpec0010.test.ts`                      | TC-0010-0015            |
| `L3`  | The Operations table lists exactly `resolve-unsettled-product-scope`                                                                                  | `discussionOperationsSpec0010.test.ts`                      | TC-0010-0016            |
| E2E   | The discussion stage of a run, through the discussion variant that spec-0018 `10_Plan.md` `### Which journey discharges which stage story` maps to it | The spec-0018 journey's module, annotated with US-0010-0013 | US-0010-0013 (TDD-0033) |

**Cases that stand alone, and kept failures.** No case is matrix-shaped, and
none is a kept failure. The refusal of a mismatched work order is stated once in
the shared operating baseline and tested there.

**Held elsewhere, so no case is written for it.**

- How the stage ends, returning the run to routing: a plan rule, checked when
  spec-0018 loads the plans.
- Whether the Operations table satisfies the plan's pairs: the same plan load.
- The 800-line `SKILL.md` ceiling: the doctor line budget.

**Order.** The three `L3` rows are tier 2 of spec-0018 `10_Plan.md`
`### Order in which the rows go green`. The discussion variant of the journey
waits on them, and the E2E row closes at tier 5.

**Findings carried on purpose.** Pushes follow spec-0018 `10_Plan.md`
`### Findings carried on purpose`.

| Finding                                                | Why it is expected                                                | Until                                                                                                               |
| ------------------------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `QFAI-ATDD-111` for US-0010-0013                       | Its journey variant does not exist yet                            | The spec-0018 discussion variant lands                                                                              |
| `QFAI-ATDD-112` for TC-0010-0014..0016                 | Their integration tests do not exist yet                          | ATDD writes them                                                                                                    |
| The `tdd` errors of `tdd/test-list.md`                 | Pinned rows this change does not repair; the new rows add to none | A later change                                                                                                      |
| `QFAI-ATDD-131` on this spec, pinned at 1 under `full` | The spec has no Coverage Depth Matrix                             | ATDD writes the first one, and that push re-pins with `node scripts/check-dogfood-backlog.mjs --profile full --pin` |

## Second-Wave (v1.9.2) — How

- Mock template (REQ-0154 / DR-0265): emit anchor-form `<a href="#<name>">` links in the discussion mock template; update SKILL.md authoring guidance to instruct anchor-form. Keep `QFAI-MOCK-010` strict (PASS `#name` + `http(s)://`). Treat template ↔ validator as an SSOT-sync pair guarded by `R-MOCK-HREF-DRIFT`.
- Active session pointer writer (REQ-0155 / DR-0266): on pack finalization, `/qfai-discussion` writes `.qfai/state.json#discussion.currentId` with the authored pack ID. `qfai discussion list --active` reads the pointer; resolution rejects absent/missing/duplicate with an error naming candidate dirs and `qfai discussion use <id>`. No mtime inference; no committed-config storage.

## NFR approach

- NFR-0001..0003 are unchanged by this entry.

### Intent-driven entry (CAP-0018)

- `discussion-20260923171450572#NFR-0002` (asset ceiling): the new `qfai-discussion/references/orchestrated-mode.md` and the one citation line (`SKILL.md` 240 → 241) stay within 800 lines and 400 characters per line. A breach shows in the `assets.lineBudget` doctor check and `packages/qfai/src/core/doctor/assetLineBudget.ts`.
- `discussion-20260923171450572#NFR-0015` (distributed surface): the new reference carries no internal identifier. A breach shows in the pre-build shipping lint, the post-build leakage guard or the init smoke test (`.agents/rules/distributed-surface.local.md` `## Four guards`).

## Risk mitigation

| Risk                                                                                                                                  | Likelihood / impact | Mitigation                                                                                                                                 | Trigger to act                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| The mock template and `QFAI-MOCK-010` drift, so the shipped template emits a form its own validator rejects                           | med / high          | The pair is guarded by `R-MOCK-HREF-DRIFT`; the validator stays strict rather than being widened to accept whatever the template emits     | An href form is added to the template without a validator case                   |
| The active-session pointer is inferred from directory mtime when the pointer is missing, making the answer depend on filesystem noise | low / high          | Resolution rejects absent / missing / duplicate with an error naming the candidate dirs and `qfai discussion use <id>`; no mtime inference | Any mtime-ordering appears on the resolution path                                |
| Discussion is asked to produce a winner or a design system, re-collapsing exploration into decision                                   | med / med           | The artifacts stop before winner selection by construction, and the prose that required it has been removed rather than deprecated         | A template or SKILL.md change reintroduces a single-winner or design-system step |

### Intent-driven entry (CAP-0018)

| Risk                                                                                                                  | Likelihood / impact | Mitigation                                                                          | Trigger to act                                                             |
| --------------------------------------------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| The work order's `settled` field arrives empty, so the discussion stage asks again what the operator already answered | low / med           | The core fills `settled` (CLI-WF `### Work order`); the skill reads only that field | A discussion-stage question whose ID is among the run's answered questions |
