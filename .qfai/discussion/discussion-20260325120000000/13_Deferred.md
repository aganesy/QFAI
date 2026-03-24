# 13_Deferred

| OQ-ID   | Title                                     | Gate | Deferred-Reason                                                                                                                          | Deferred-Until          | Owner | Due                  | Severity | Impact                                                                                  | Mitigation                                                                                                      | Evidence                                    |
| ------- | ----------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----- | -------------------- | -------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| OQ-0006 | v1.7.2+ slop/aesthetic detection approach | sdd  | Heuristic detection approach requires a separate design phase; v1.7.0 focuses on structural checks only and cannot absorb this scope now | v1.7.2 discussion phase | agent | v1.7.2 release cycle | low      | No impact on v1.7.0 implementation; affects future design audit capabilities in v1.7.2+ | Existing DDP anti-pattern list (ddpBannedPatterns.txt) continues to operate as the active aesthetic safeguard   | User interview 2026-03-25, roadmap section 6 v1.7.2 |

## Work Orders Summary

| Step | Role (sub-agent) | Task title              | Input (refs)    | Output (refs)    | Status (PASS/REVISE) |
| ---- | ---------------- | ----------------------- | --------------- | ---------------- | -------------------- |
| 1    | orchestrator     | Deferred metadata build | OQ-0006 register entry, roadmap §6 | `13_Deferred.md` | PASS                 |
