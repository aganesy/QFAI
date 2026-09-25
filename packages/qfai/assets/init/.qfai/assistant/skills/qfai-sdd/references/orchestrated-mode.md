# qfai-sdd in a workflow run

Run the entry check in `.qfai/assistant/constitution/shared-skill-operating-baseline.md#workflow-run-entry-check-mandatory` first. This file applies only to the `worker` state: the skill holds a QFAI work order that matches an issued one.

## Operations

| Operation                      | What the work order asks                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| `defect-row-seeding`           | Seed the ledger row a diagnosed defect needs, with its test case, in the bound spec  |
| `new-capability`               | Create the spec for the new-capability slot the work order binds                     |
| `delta-or-applicability-check` | Record the delta the change makes to the bound spec, or that the spec does not apply |

The skill serves exactly these operations. A work order naming any other is refused.
