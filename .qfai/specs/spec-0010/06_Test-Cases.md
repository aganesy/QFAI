# 06 Test Cases

| TC-ID        | AC-Refs      | EX-Ref       | Steps                                                             | Expected                                                                     |
| ------------ | ------------ | ------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| TC-0010-0001 | AC-0010-0001 | EX-0010-0001 | generate UI-bearing discussion sidecars                           | new sidecar family exists                                                    |
| TC-0010-0002 | AC-0010-0002 | EX-0010-0002 | validate exploration brief headings                               | required heading error                                                       |
| TC-0010-0003 | AC-0010-0003 | EX-0010-0003 | validate exploration rubric headings                              | rubric passes                                                                |
| TC-0010-0004 | AC-0010-0004 | EX-0010-0004 | validate evaluator calibration headings                           | calibration passes                                                           |
| TC-0010-0005 | AC-0010-0005 | EX-0010-0005 | validate review bundle best-of-history wording                    | review bundle passes                                                         |
| TC-0010-0006 | AC-0010-0006 | EX-0010-0006 | inspect discussion artifact for final winner text                 | planner-first violation fires                                                |
| TC-0010-0007 | AC-0010-0007 | EX-0010-0007 | run UI-bearing discussion and inspect root DESIGN.md token tables | DESIGN.md exists with required token tables                                  |
| TC-0010-0008 | AC-0010-0008 | EX-0010-0008 | run UI-bearing discussion and list emitted sidecars               | none of the legacy sidecars appear; regression validator surfaces if they do |

## Second-Wave (v1.9.2) Test Cases — Type-classified

| TC-ID        | AC-Refs      | EX-Ref       | Type     | Steps                                                                       | Expected                                                                    |
| ------------ | ------------ | ------------ | -------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| TC-0010-0009 | AC-0010-0009 | EX-0010-0009 | normal   | author mock with `#anchor` href and with external `http(s)://` href         | both PASS `QFAI-MOCK-010`; SKILL.md instructs anchor-form                   |
| TC-0010-0010 | AC-0010-0009 | EX-0010-0010 | error    | author mock with same-origin absolute `/path/` href                         | `QFAI-MOCK-010` FAILS; validator not broadened to accept `/path/`           |
| TC-0010-0011 | AC-0010-0010 | EX-0010-0011 | error    | edit template to `/path/` form leaving validator strict (asymmetric)        | Reviewer-Gate `R-MOCK-HREF-DRIFT` (severity error) fires                    |
| TC-0010-0012 | AC-0010-0011 | EX-0010-0012 | normal   | finalize `/qfai-discussion` pack; read `state.json#discussion.currentId`    | `currentId` equals authored pack ID; `discussion list --active` reads it    |
| TC-0010-0013 | AC-0010-0012 | EX-0010-0013 | boundary | resolve active pointer when `currentId` absent with multiple candidate dirs | error names candidate dirs + `qfai discussion use <id>`; no mtime inference |
