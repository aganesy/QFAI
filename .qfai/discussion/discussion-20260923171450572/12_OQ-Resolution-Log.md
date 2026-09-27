# 12 OQ Resolution Log

<!-- UX-INTENT: If UI-bearing, log design critique resolutions from uiux/50_review_input_bundle.md -->

## Resolution Timeline

| Date       | OQ-ID   | Action   | Summary                                                                                                   | Evidence                 |
| ---------- | ------- | -------- | --------------------------------------------------------------------------------------------------------- | ------------------------ |
| 2026-09-23 | OQ-0001 | created  | Which operation carries the route proposal, left open by D9                                               | D9; REQ-0011             |
| 2026-09-23 | OQ-0001 | deferred | CLI contract detail; recommendation B (routing as a stage result through `accept`)                        | `13_Deferred.md` OQ-0001 |
| 2026-09-23 | OQ-0002 | created  | How a JSON payload reaches the CLI                                                                        | REQ-0023                 |
| 2026-09-23 | OQ-0002 | deferred | Argv detail; recommendation A (`--input <path>`, `-` for stdin)                                           | `13_Deferred.md` OQ-0002 |
| 2026-09-23 | OQ-0003 | created  | Exit codes for `awaiting_input`, `blocked` and an unmet `finish`                                          | REQ-0022                 |
| 2026-09-23 | OQ-0003 | deferred | Contract detail; recommendation A (existing codes, no new number)                                         | `13_Deferred.md` OQ-0003 |
| 2026-09-23 | OQ-0004 | created  | Journal layout, hash algorithm and run ID format                                                          | REQ-0026                 |
| 2026-09-23 | OQ-0004 | deferred | Implementation detail; recommendation A (one file per event, rename publish, SHA-256)                     | `13_Deferred.md` OQ-0004 |
| 2026-09-23 | OQ-0005 | created  | Inputs of the obligation and receipt fingerprints                                                         | REQ-0029; REQ-0042       |
| 2026-09-23 | OQ-0005 | deferred | Design detail; recommendation A (normative closure only)                                                  | `13_Deferred.md` OQ-0005 |
| 2026-09-23 | OQ-0006 | created  | Where a triage row cites its workflow authorization                                                       | D5; REQ-0043             |
| 2026-09-23 | OQ-0006 | deferred | Triage template detail; recommendation A (new optional column)                                            | `13_Deferred.md` OQ-0006 |
| 2026-09-23 | OQ-0007 | created  | When a routing-time CREATE approval is stale                                                              | D5; REQ-0042             |
| 2026-09-23 | OQ-0007 | deferred | Binding rule; recommendation A (scope digest or capability change, no clock expiry)                       | `13_Deferred.md` OQ-0007 |
| 2026-09-23 | OQ-0008 | created  | Relation of route authority to the Default Autopilot Policy buckets                                       | REQ-0057                 |
| 2026-09-23 | OQ-0008 | deferred | Belongs to the CR to spec-0015; recommendation A (map onto the buckets)                                   | `13_Deferred.md` OQ-0008 |
| 2026-09-23 | OQ-0009 | created  | Name of the SDD row-append operation                                                                      | D13; REQ-0047            |
| 2026-09-23 | OQ-0009 | deferred | Belongs to the CR to spec-0013; recommendation A ("defect row seeding")                                   | `13_Deferred.md` OQ-0009 |
| 2026-09-23 | OQ-0010 | created  | Name and shape of the mode setting                                                                        | D7; REQ-0059             |
| 2026-09-23 | OQ-0010 | deferred | Config schema detail; recommendation A (`workflow.mode`)                                                  | `13_Deferred.md` OQ-0010 |
| 2026-09-23 | OQ-0011 | created  | What a run does when it fails closed                                                                      | D7; REQ-0059             |
| 2026-09-23 | OQ-0011 | deferred | Control-core detail; recommendation A (`blocked` with the standalone next step)                           | `13_Deferred.md` OQ-0011 |
| 2026-09-23 | OQ-0012 | created  | How Windows parity is verified                                                                            | NFR-0011                 |
| 2026-09-23 | OQ-0012 | deferred | Test-plan detail; recommendation A (scoped `windows-latest` job)                                          | `13_Deferred.md` OQ-0012 |
| 2026-09-23 | OQ-0013 | created  | What an adapter test is                                                                                   | D3; REQ-0058             |
| 2026-09-23 | OQ-0013 | deferred | Test-plan detail; recommendation A (contract tests plus recorded host run)                                | `13_Deferred.md` OQ-0013 |
| 2026-09-23 | OQ-0014 | created  | Routing-eval runner and pass bar beyond safety                                                            | D8; REQ-0066             |
| 2026-09-23 | OQ-0014 | deferred | Release-gate detail; recommendation A (per-case scoring, user accepts at release)                         | `13_Deferred.md` OQ-0014 |
| 2026-09-23 | OQ-0015 | created  | Which skills get `references/orchestrated-mode.md`                                                        | D12; REQ-0052            |
| 2026-09-23 | OQ-0015 | deferred | Skill-change plan detail; recommendation A (every skill a plan dispatches)                                | `13_Deferred.md` OQ-0015 |
| 2026-09-23 | OQ-0016 | created  | Which skills are "stage skills" for the description rewrite                                               | D15; REQ-0050            |
| 2026-09-23 | OQ-0016 | deferred | Skill-change plan detail; recommendation A (dispatched skills plus `qfai-maintain`)                       | `13_Deferred.md` OQ-0016 |
| 2026-09-23 | OQ-0017 | created  | How the entry instruction reaches each host                                                               | REQ-0064                 |
| 2026-09-23 | OQ-0017 | deferred | Belongs to the CR to spec-0003; recommendation A (managed section of the entry files)                     | `13_Deferred.md` OQ-0017 |
| 2026-09-23 | OQ-0018 | created  | Fields of the tracked run summary                                                                         | D11; NFR-0014            |
| 2026-09-23 | OQ-0018 | deferred | Evidence schema detail; recommendation A (digests and records, request by hash)                           | `13_Deferred.md` OQ-0018 |
| 2026-09-23 | OQ-0019 | created  | Where token counts come from on each host                                                                 | NFR-0004                 |
| 2026-09-23 | OQ-0019 | deferred | Found only by trying each host; recommendation A (host usage record, `null` where absent)                 | `13_Deferred.md` OQ-0019 |
| 2026-09-23 | OQ-0020 | created  | Whether spec-0008, spec-0010 and spec-0012 also receive Change Requests beyond D4's seven                 | D4; REQ-0052; REQ-0055   |
| 2026-09-23 | OQ-0020 | deferred | The user's decision at `/qfai-sdd` triage; recommendation A (a row only where a skill's contract changes) | `13_Deferred.md` OQ-0020 |

## Rules

- Append-only: never edit or delete previous entries.
- Every disposition change must be logged here.
- Actions: `created`, `resolved`, `deferred`, `rejected`, `reopened`.
