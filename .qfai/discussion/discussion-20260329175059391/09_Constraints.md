# 09_Constraints

## Technical Constraints

| ID     | Constraint                                                                                      | Impact                                                                |
| ------ | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| TC-001 | Must not modify standard prototyping path behavior                                              | All changes are additive; existing `/qfai-prototyping` remains stable |
| TC-002 | Critique adapter must support multiple provider backends                                        | Interface must be generic; no hard dependency on a single LLM/tool    |
| TC-003 | Calibration assets must be file-based (no external DB dependency)                               | Assets stored in `.qfai/` directory tree; portable across machines    |
| TC-004 | Full-harness mode must be explicitly opted into (not default)                                   | Requires `--mode full-harness` or equivalent explicit flag            |
| TC-005 | Max iteration cap must be configurable but have a sensible default (15)                         | Config key in `qfai.config.yaml`; CLI override via `--max-iterations` |

## Operational Constraints

| ID     | Constraint                                                                                      | Impact                                                                       |
| ------ | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| OC-001 | Premium path cost must be observable before and during execution                                | Cost estimation emitted at plan phase; running total emitted per iteration    |
| OC-002 | Long-running sessions must produce resumable handoff artifacts                                  | Handoff file written at each iteration boundary; resume picks up from last    |
| OC-003 | Display-only and stub-only detection must not produce excessive false positives                 | Heuristic thresholds are configurable; default tuned for precision over recall |

## Legal / Budget / Deadline

| ID     | Constraint                                | Impact                                                          |
| ------ | ----------------------------------------- | --------------------------------------------------------------- |
| CON-L01 | v1.7.6 release scope                     | Development limited to the five feature areas defined in scope  |
| CON-L02 | No external service dependency at runtime | All critique providers invoked via local CLI commands only       |
