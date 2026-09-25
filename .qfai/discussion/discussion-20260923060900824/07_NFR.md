# 07 NFR (Non-Functional Requirements)

## Requirements Table

| NFR-ID   | Category        | Title                                         | Target                                                                                                                                                                                                                                                                                                                                                               | Measurement                                                                                                                                                                                               | Source                       | Priority |
| -------- | --------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | -------- |
| NFR-0001 | maintainability | No regression to A                            | `LEGACY_ASSISTANT_*`, `joinLegacyAssistant*`, `classifyLegacySteeringEntry`, the `--upgrade-assistant-tree` path and `D-DEPRECATED-PATH` behave as before                                                                                                                                                                                                            | Their code has no diff beyond comments, and their existing tests pass unmodified                                                                                                                          | SRC-0003, SRC-0004           | must     |
| NFR-0002 | maintainability | No regression to B                            | The four catalog steering files, `ADOPTER_OWNED_ASSETS`, the Stage 0 steering refresh and the catalog placeholder check behave as before                                                                                                                                                                                                                             | No diff to `catalog/{manifest,product,structure,tech}.md`, `assistantAssetProvenance.ts` or `constitution/workflow.md` `### Stage 0 — Steering refresh contract (mandatory)`; their tests pass unmodified | SRC-0006, SRC-0027           | must     |
| NFR-0003 | reliability     | No data loss in an adopter's tree             | 0 files deleted or changed under `.qfai/steering/`; an edited `catalog/worklog-entry.schema.md` is kept                                                                                                                                                                                                                                                              | NFR-0006's search finds no `.qfai/steering/` in `packages/qfai/src/**`; the edited schema copy is kept by the generic retire pass (REQ-0006)                                                              | SRC-0004, SRC-0006           | must     |
| NFR-0004 | maintainability | Distributed surface stays clean               | Shipped text the change adds carries no internal spec, decision, OQ or change ID and no private version marker                                                                                                                                                                                                                                                       | `lint:shipping`, `packages/qfai/scripts/check-no-internal-version-leakage.sh` and `distributedSurfaceLeakage.test.ts` pass                                                                                | SRC-0018                     | must     |
| NFR-0005 | operability     | CI green on the one change                    | Every CI job passes; each dogfood profile's pin goes down or stays, never up                                                                                                                                                                                                                                                                                         | The pull request's CI run; `node scripts/check-dogfood-backlog.mjs --profile <p>` exits 0 for tdd, sdd and full; `scripts/dogfood-backlog.json` diff shows only lower numbers or struck files             | SRC-0016                     | must     |
| NFR-0006 | maintainability | Removal is complete by symbol                 | 0 matches in `packages/qfai/src/**` and `packages/qfai/assets/**` for `PROJECT_STEERING_`, `WORKLOG_ENTRY_`, `WORKLOG_STOP_KINDS`, `HANDOFF_REQUIRED_SECTIONS`, `W-WORKLOG-`, `W-PENDING-PROMOTION`, `R-HANDOFF-INCOMPLETE`, `R-WORKLOG-DRIFT`, `QFAI-TDDLIST-015`, `QFAI-TDDLIST-016`, `worklogSurface`, `worklogEntries`, `seedProjectSteering`, `.qfai/steering/` | A search for each token; hits in `CHANGELOG.md` and `.qfai/**` records are outside the count                                                                                                              | SRC-0001, SRC-0003, SRC-0007 | must     |
| NFR-0007 | usability       | Shipped skill text reads as current behaviour | 0 sentences in the changed skill text that describe the removed surface or how the text used to read; all of it in English                                                                                                                                                                                                                                           | Reviewer check against `.agents/rules/documentation-clarity.md` sections 2 and 6 during review of the change                                                                                              | SRC-0022                     | should   |

## Not applicable

- `performance`: the change removes a validator pass and an init step. It adds no
  work, so there is no latency or throughput target to set.
- `scalability`: nothing the change adds grows with project size.
- `security`: no authentication, authorization or secret handling is touched.
  The only data risk is loss of an adopter's files, covered by NFR-0003.

## Categories

- `performance`: Response time, throughput, latency.
- `reliability`: Availability, fault tolerance, recovery.
- `security`: Authentication, authorization, data protection.
- `scalability`: Load handling, horizontal/vertical scaling.
- `usability`: Accessibility, UX standards, i18n.
- `maintainability`: Code quality, documentation, testability.
- `operability`: Monitoring, deployment, logging.

## Rules

- Each NFR must have a measurable target.
- Each NFR must reference at least one Source (SRC-ID).
