# qfai-prototyping in a workflow run

Run the entry check in `.qfai/assistant/constitution/shared-skill-operating-baseline.md#workflow-run-entry-check-mandatory` first. This file applies only to the `worker` state: the skill holds a QFAI work order that matches an issued one.

## Operations

| Operation                   | What the work order asks                                          |
| --------------------------- | ----------------------------------------------------------------- |
| `existing-runtime-contract` | Prototype against the runtime contract the bound spec already has |

The skill serves exactly these operations. A work order naming any other is refused.

## Work order scope

- The skill works only on the spec the work order's `target` names. It settles
  the one visual decision the plan needs within the existing `DESIGN.md` and
  contracts, and creates no contract.
- When the target spec is not UI-bearing, the skill writes no `DESIGN.md`, no
  UI contract and no surface declaration. It returns outcome `needs_repair`, listing
  the cause in `debts` with `resolvingOwner` `operator`.
- A standalone invocation still resolves every UI-bearing spec.
