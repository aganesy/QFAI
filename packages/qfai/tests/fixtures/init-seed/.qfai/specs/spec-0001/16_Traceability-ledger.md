# 16 Traceability Ledger (SSOT)

| trace_id | obj_id   | init_id   | cap_id   | flow_id   | us_id   | ac_id   | ex_ids  | tc_ids  | con_ids                              | notes               |
| -------- | -------- | --------- | -------- | --------- | ------- | ------- | ------- | ------- | ------------------------------------ | ------------------- |
| TR-0001  | OBJ-0001 | INIT-0001 | CAP-0001 | FLOW-0001 | US-0001 | AC-0001 | EX-0001 | TC-0001 | CON-UI-0001;CON-API-0001;CON-DB-0001 | create happy path   |
| TR-0002  | OBJ-0001 | INIT-0001 | CAP-0002 | FLOW-0002 | US-0002 | AC-0002 | EX-0002 | TC-0002 | CON-API-0001;CON-DB-0001             | duplicate rejection |
| TR-0003  | OBJ-0001 | INIT-0001 | CAP-0002 | FLOW-0002 | US-0002 | AC-0003 | EX-0003 | TC-0003 | CON-API-0001                         | stable error code   |
