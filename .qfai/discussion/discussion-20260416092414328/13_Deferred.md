# 13 Deferred Items

Deferred items register for discussion-20260416092414328 (rev9).

**Deferred count: 1** — one carry-forward item from rev7.

| OQ-ID   | Title              | Gate | Deferred-Reason                                                                                                | Deferred-Until                                              | Owner | Due        | Severity | Impact                                                           | Mitigation                                                                                                 | Evidence                                                                                               |
|---------|--------------------|------|----------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------|-------|------------|----------|------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------|
| OQ-D001 | packHash integrity check | sdd  | `packHash` was deferred in rev7 (discussion-20260415203030886 OQ-0001) as out-of-scope for the traceability closure cycles. Rev8 and rev9 do not re-open this item. It remains deferred until the full-harness pack integrity feature is scoped. | A dedicated post-v1.7.15 issue or future cycle explicitly scoping full-harness pack integrity validation | user  | TBD        | low      | spec: none; tests: none; implementation: future feature work required; operations: none currently | Full-harness traceability closure (rev7–rev9) does not depend on `packHash`. The audit trail through `prototyping.json` is sufficient for current v1.7.15 scope. | discussion-20260415203030886 (rev7 OQ-0001: original deferral); design doc rev9 §4-2 (non-scope confirmation) |

## Notes

- `packHash` integrity check was first deferred in rev7 (discussion-20260415203030886 OQ-0001) and remains deferred. It is not re-opened in rev9. This is a carry-forward deferral, not a new deferral item.
- Rev9 is scoped to exactly the leaf-field traceability closure identified in the v1.7.15-09 audit. No new items were deferred during this discussion.
