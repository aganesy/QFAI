# qfai-prototyping in a workflow run

Run the entry check in `.qfai/assistant/rule/shared-skill-operating-baseline.md#workflow-run-entry-check-mandatory` first. This file applies only to the `worker` state: the skill holds a QFAI work order that matches an issued one.

## Operations

| Operation                   | What the work order asks                                             |
| --------------------------- | -------------------------------------------------------------------- |
| `existing-runtime-contract` | Prototype against the UI contracts that already serve the bound flow |

The skill serves exactly these operations. A work order naming any other is refused.

## Work order scope

- The skill works only on the UI-bearing UI contracts that serve the business
  flow the work order's `target` binds. A contract serves a flow when one of
  its rules cites an example of one of that flow's stories.
- It settles the one visual decision the plan needs within the existing root
  `DESIGN.md` and those contracts. It changes no UI contract that serves only
  another flow, and creates no contract.
- When no UI-bearing contract serves the bound flow, the skill writes no
  `DESIGN.md`, no UI contract and no surface declaration. It returns outcome
  `blocked` with one `debts` entry naming the missing UI surface, with
  `owningFlow` the bound flow and `resolvingOwner` `operator`.
- A standalone invocation still resolves every UI-bearing UI contract.
