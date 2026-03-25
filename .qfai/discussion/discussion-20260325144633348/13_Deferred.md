# 13_Deferred

| OQ-ID | Title | Gate | Deferred-Reason | Deferred-Until | Owner | Due | Severity | Impact | Mitigation | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OQ-0005 | browser QA / diff / repair の v1.7.1 取り込み | sdd | browser QA、visual diff、repair loop、外部 critique は capture/validation の v1.7.1 目的を超えるため、別設計が必要。 | v1.7.4 scope intake | team | v1.7.4 planning milestone | medium | spec/tests/implementation/operations | v1.7.1 では capture と validation に限定し、review request と delta に明示して再発を防ぐ。 | SRC-0001 sections 2, 10 |

## Work Orders Summary

| Step | Role (sub-agent) | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ---------- | ------------ | ------------- | -------------------- |
| 1 | worker | Deferred first draft | OQ register, design memo | `13_Deferred.md` | PASS |
| 2 | orchestrator | Deferred integration | worker draft, metadata audit | `13_Deferred.md` | PASS |
