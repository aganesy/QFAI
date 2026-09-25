# qfai-prototyping in a workflow run

Run the entry check in `.qfai/assistant/constitution/shared-skill-operating-baseline.md#workflow-run-entry-check-mandatory` first. This file applies only to the `worker` state: the skill holds a QFAI work order that matches an issued one.

## Operations

| Operation                   | What the work order asks                                          |
| --------------------------- | ----------------------------------------------------------------- |
| `existing-runtime-contract` | Prototype against the runtime contract the bound spec already has |

The skill serves exactly these operations. A work order naming any other is refused.
