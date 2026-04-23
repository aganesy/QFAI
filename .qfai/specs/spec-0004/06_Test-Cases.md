# 06 Test Cases

| TC-ID        | Level       | AC-Refs                    | EX-Ref       | Steps                                                                | Expected                                                        | Notes                     |
| ------------ | ----------- | -------------------------- | ------------ | -------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------- |
| TC-0004-0001 | integration | AC-0004-0001               | EX-0004-0004 | run `qfai validate` on a repo with deterministic validator fixtures  | findings are aggregated through the machine gate                | validate entrypoint       |
| TC-0004-0002 | integration | AC-0004-0002               | EX-0004-0004 | inspect validate pipeline wiring                                     | canonical UIX validator path remains active                     | canonical path            |
| TC-0004-0003 | validators  | AC-0004-0003               | EX-0004-0001 | remove screenshot evidence for a declared screen                     | `QFAI-UIE-001` is emitted                                       | screenshot fail-closed    |
| TC-0004-0004 | validators  | AC-0004-0004               | EX-0004-0002 | remove HTML evidence for a declared screen                           | `QFAI-UIE-002` is emitted                                       | html fail-closed          |
| TC-0004-0005 | validators  | AC-0004-0005               | EX-0004-0003 | run UI evidence validator without canonical screen contracts         | validator skips instead of over-firing                          | safe skip                 |
| TC-0004-0006 | unit        | AC-0004-0006               | EX-0004-0005 | validate current `/qfai-prototyping` skill asset                     | stale runtime / CLI wording is surfaced as a skill finding      | skill contract validator  |
| TC-0004-0007 | validators  | AC-0004-0007               | EX-0004-0006 | exercise a legacy validator slice with its prerequisite artifact set | scoped legacy findings are allowed without reviving old surface | legacy slice containment  |
