# qfai-sdd in a workflow run

What `/qfai-sdd` does when `qfai workflow` hands it a work order. The field
names are those of the work order and the stage result.

## Entry check

The full check is
`.qfai/assistant/constitution/shared-skill-operating-baseline.md#workflow-run-entry-check-mandatory`.
For this skill, in mode `active`:

- A request with no name and no work order is passed to `qfai-run`, and nothing
  is edited.
- A work order that matches no issued one: edit nothing and return the refusal
  to the harness.
- A valid work order is worked, and nothing else.

## Invoked by name

`/qfai-sdd` invoked by name runs standalone, ends at SDD and creates no run. A
request to go to the end is handed to a whole run through `qfai-run`.

## Operations

| Operation                      | What the work order asks                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| `defect-row-seeding`           | Seed the ledger row a diagnosed defect needs, with its test case, in the bound spec  |
| `new-capability`               | Create the spec for the new-capability slot the work order binds                     |
| `delta-or-applicability-check` | Record the delta the change makes to the bound spec, or that the spec does not apply |

The skill serves exactly these operations. A work order naming any other is refused.

- `defect-row-seeding` follows
  `references/sdd-phase-checklists.md#defect-row-seeding-defect-row-seeding`.
- A work order with no target is refused. It never runs the no-argument batch.
- A `new_capability` target's result reports `bindings` for each capability
  created.

## Stage 1 approvals

Stage 1 approvals inside a run follow
`references/sdd-triage.md#inside-a-workflow-run`.

## `--auto` inside a run

Under `--auto` inside a run, an approval-required row with no satisfying
`human_decision` stops Stage 1 with a `consultation-needed` entry. `Approved By`
stays `-`: `--auto` approves nothing.

## Stage 0

- The shared Stage 0 snapshot is reused only after its key is recomputed, as the
  operating baseline states. Only the entries whose inputs changed are
  refreshed.
- The `npx qfai sdd preflight` readiness check runs in every attempt. It is never
  served from the snapshot.
