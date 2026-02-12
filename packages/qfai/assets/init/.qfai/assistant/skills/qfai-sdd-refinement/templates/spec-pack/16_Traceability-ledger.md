# 16 Traceability Ledger (SSOT)

## Full Chain

| OBJ      | INIT      | CAP      | FLOW      | US      | AC      | BR      | EX      | TC      | Contracts                  | Notes  |
| -------- | --------- | -------- | --------- | ------- | ------- | ------- | ------- | ------- | -------------------------- | ------ |
| OBJ-0001 | INIT-0001 | CAP-0001 | FLOW-0001 | US-0001 | AC-0001 | BR-0001 | EX-0001 | TC-0001 | UI-0001, API-0001, DB-0001 | <note> |

## Completeness Rules

- Each AC row should map to at least one EX and one TC.
- Each row should be traceable back to objective intent.
- Missing links must be recorded with explicit rationale.

## Reference Rule

- This is a lower layer and may reference all upper layers.
- Upper layers must not depend on this file for authoring decisions.
