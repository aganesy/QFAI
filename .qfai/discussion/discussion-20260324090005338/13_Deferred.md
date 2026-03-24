# 13_Deferred

| OQ-ID   | Title                                                                                      | Gate       | Deferred-Reason                                                                                                                        | Deferred-Until                   | Owner | Due             | Severity | Impact                            | Mitigation                                                                                                                                     | Evidence |
| ------- | ------------------------------------------------------------------------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----- | --------------- | -------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| OQ-0008 | Full automated VRT/RUM hard gate timing                                                    | ops        | 効果は高いが v1.6.5 discussion の主眼は artifact / downstream contract 定義であり、CI/runtime integration の詳細設計は次フェーズで扱う | `/qfai-sdd` で capability 分割時 | team  | v1.6.6 planning | medium   | specs, implementation, operations | 本フェーズでは scorecard と render critique を mandatory にし、VRT/RUM は source-backed recommendation として保持                              | SRC-0003 |
| OQ-0015 | Phase 3 施策 (visual regression, click path metrics, scorecard 化, multi-proposal scoring) | discussion | ChatGPT レポートの Phase 3 は完成度向上施策であり、v1.6.5 では Phase 1 + Phase 2 に集中し、Phase 3 は設計安定後に着手すべき            | v1.6.6 planning 開始時           | team  | v1.6.6 planning | low      | implementation, operations        | v1.6.5 で Phase 1 + Phase 2 の基盤を整えることで Phase 3 の実装基盤が確立される。Phase 3 不在でも scorecard + render critique で品質判断は可能 | SRC-0008 |

## Work Orders Summary

| Step | Role (sub-agent) | Task title             | Input (refs)     | Output (refs)    | Status (PASS/REVISE) |
| ---- | ---------------- | ---------------------- | ---------------- | ---------------- | -------------------- |
| 1    | orchestrator     | Deferred metadata 完成 | OQ-0008, OQ-0015 | `13_Deferred.md` | PASS                 |
