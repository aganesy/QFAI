# qfai-discussion in a workflow run

Run the entry check in `.qfai/assistant/constitution/shared-skill-operating-baseline.md` first. This file applies only to the `worker` state: the skill holds a QFAI work order that matches an issued one.

## Operations

| Operation                         | What the work order asks                                      |
| --------------------------------- | ------------------------------------------------------------- |
| `resolve-unsettled-product-scope` | Settle the product scope the routing left open, and only that |

The skill serves exactly these operations. A work order naming any other is refused.

## What is already settled

- What the work order's `settled` field records, the checked proposal's routing
  result and every answered question with its chosen answer, is taken as
  settled and not asked again.
- The discussion covers only the scope `settled` leaves unresolved.
