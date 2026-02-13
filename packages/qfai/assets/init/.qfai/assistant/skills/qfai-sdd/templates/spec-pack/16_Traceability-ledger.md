# 16 Traceability Ledger (SSOT)

## Full Chain

| trace_id | obj_id   | init_id   | cap_id   | flow_id   | us_id   | ac_id   | ex_ids          | tc_ids          | con_ids                              | notes  |
| -------- | -------- | --------- | -------- | --------- | ------- | ------- | --------------- | --------------- | ------------------------------------ | ------ |
| TR-0001  | OBJ-0001 | INIT-0001 | CAP-0001 | FLOW-0001 | US-0001 | AC-0001 | EX-0001;EX-0002 | TC-0001;TC-0002 | CON-UI-0001;CON-API-0001;CON-DB-0001 | <note> |

## Completeness Rules

- `ex_ids` and `tc_ids` are required and must not be empty.
- Multi-value columns use `;` as delimiter.
- Each row must remain traceable from `OBJ` to `AC`.

## Reference Rule

- This is a lower layer and may reference all upper layers.
- Upper layers must not depend on this file for authoring decisions.
