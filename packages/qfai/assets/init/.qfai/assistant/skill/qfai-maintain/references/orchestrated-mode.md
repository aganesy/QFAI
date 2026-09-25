# qfai-maintain in a workflow run

Run the entry check in `.qfai/assistant/rule/shared-skill-operating-baseline.md#workflow-run-entry-check-mandatory` first. This file applies only to the `worker` state: the skill holds a QFAI work order that matches an issued one.

## Operations

| Operation            | What the work order asks                                                   |
| -------------------- | -------------------------------------------------------------------------- |
| `non-normative-edit` | Edit wording and comments inside the write scope, with no behaviour change |

The skill serves exactly these operations. A work order naming any other is refused.

## A semantic effect

A file `SKILL.md` lists as never a maintenance edit, or a planned edit with a
semantic effect, is returned this way, with nothing edited:

- The outcome is `needs_repair`, and `changedFiles` is empty.
- `debts` holds the finding. Its `resolvingOwner` is the skill that owns that
  kind of change, never one the `direct` plan names: `qfai-implement` for a
  code or configuration change, `qfai-sdd` for a story or contract.
