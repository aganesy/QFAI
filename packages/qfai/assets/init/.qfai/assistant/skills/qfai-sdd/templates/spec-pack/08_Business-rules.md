# 08 Business Rules

## BR Catalog

| BR ID   | Related AC | Title                  |
| ------- | ---------- | ---------------------- |
| BR-0001 | AC-0001    | <short decision title> |

## Rule Definitions

### BR-0001

- Trigger: <event that starts the rule>
- Condition: <precondition / decision condition>
- Outcome: <system response / resulting state>
- Invariants:
  - <invariant 1>
- Edge cases:
  - <boundary case 1>
- Related AC:
  - AC-0001
- Related Contracts:
  - CON-API-0001

## Density Guide

- Target guideline: at least 2 BR entries for 1 AC when decomposition is needed.
- If BR count is lower than AC count, record a reason and a follow-up completion plan.

## Authoring Rules

- Keep one logical rule per BR ID.
- Prefer decision-table style wording for Trigger / Condition / Outcome.
- Split independent logic into separate BR IDs.

## Reference Rule

- May reference AC and upper layers.
- Must not rely on lower layers as sources of truth.
