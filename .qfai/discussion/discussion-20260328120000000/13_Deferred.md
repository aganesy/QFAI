# 13 Deferred

## Deferred Items

| OQ-ID   | Title                                     | Gate | Deferred-Reason                                                                          | Deferred-Until                   | Owner | Due        | Severity | Impact                                                                          | Mitigation                                                                          | Evidence                          |
| ------- | ----------------------------------------- | ---- | ---------------------------------------------------------------------------------------- | -------------------------------- | ----- | ---------- | -------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------- |
| OQ-0003 | Screen contracts vs contracts/ui bridging | sdd  | Bridging details require CON-UI-\* schema analysis available only at SDD phase           | SDD phase start for v1.7.3 specs | agent | 2026-04-15 | medium   | spec/implementation — screen contracts shape may affect CON-UI cross-references | Screen contracts include placeholder `con_ui_ref` field; bridging logic deferred    | Design spec §9, OQ resolution log |
| OQ-0004 | Reviewer output schema final form         | sdd  | Reviewer implementation is v1.7.4 scope; schema design depends on validator architecture | v1.7.4 implementation kickoff    | agent | 2026-04-30 | low      | implementation — affects uiux/50_review_bundle.md format only                   | review_bundle uses markdown format as interim; machine schema added in v1.7.4       | Design spec §2.3, §9              |

## Rules

- Every deferred item must trace to an OQ-ID in `11_OQ-Register.md`.
- `Deferred-Until` must specify a concrete gate or milestone.
- `Mitigation` must describe the interim approach until the item is resolved.
- Items are promoted back to the OQ register when `Deferred-Until` is reached.
