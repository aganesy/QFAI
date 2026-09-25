# qfai-implement in a workflow run

Run the entry check in `.qfai/assistant/constitution/shared-skill-operating-baseline.md#workflow-run-entry-check-mandatory` first. This file applies only to the `worker` state: the skill holds a QFAI work order that matches an issued one.

## Operations

| Operation        | What the work order asks                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------- |
| `diagnose-only`  | Reproduce, find the cause, change no code                                                   |
| `test-fix`       | Repair a defective `Unit`, `Component` or `L1`/`L2` `Integration` test the work order names |
| `regression-fix` | Fix the regression under the ledger row that reproduces it                                  |
| `implement`      | The TDD cycle over the bound ledger rows                                                    |
| `seam-only`      | Add the seam an acceptance result asked for, and nothing else                               |

The skill serves exactly these operations. A work order naming any other is refused.
