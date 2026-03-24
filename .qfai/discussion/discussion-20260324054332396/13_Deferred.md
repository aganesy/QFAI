# 13_Deferred

| OQ-ID   | Title                                   | Gate | Deferred-Reason                                                                                                                        | Deferred-Until                   | Owner | Due             | Severity | Impact                            | Mitigation                                                                                                        | Evidence |
| ------- | --------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----- | --------------- | -------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------- |
| OQ-0008 | Full automated VRT/RUM hard gate timing | ops  | 効果は高いが v1.6.5 discussion の主眼は artifact / downstream contract 定義であり、CI/runtime integration の詳細設計は次フェーズで扱う | `/qfai-sdd` で capability 分割時 | team  | v1.6.6 planning | medium   | specs, implementation, operations | 本フェーズでは scorecard と render critique を mandatory にし、VRT/RUM は source-backed recommendation として保持 | SRC-0003 |

## Work Orders Summary

| Step | Role (sub-agent) | Task title                   | Input (refs) | Output (refs)              | Status (PASS/REVISE) |
| ---- | ---------------- | ---------------------------- | ------------ | -------------------------- | -------------------- |
| 1    | orchestrator     | Deferred metadata completion | OQ-0008      | `13_Deferred.md`           | PASS                 |
| 2    | reviewer         | Deferred audit basis         | Deferred row | Reviewable deferred record | PASS                 |
