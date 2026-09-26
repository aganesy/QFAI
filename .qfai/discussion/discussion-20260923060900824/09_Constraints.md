# 09 Constraints

## Technical Constraints

> IDs use the `DTC-` prefix. Bare `TC-NNNN` is the spec-layer Test Case ID and must not
> be used for a technical constraint.

| ID    | Constraint                                                                                                      | Rationale                                                                             | Impact                                                               |
| ----- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| DTC-1 | Remove by symbol: `PROJECT_STEERING_*`, `WORKLOG_*`, `HANDOFF_REQUIRED_SECTIONS`, the named functions and codes | "steering" also names A and B, and "handoff" names a live feature (AP-0001, SRC-0003) | A token sweep is not an acceptable way to find what to delete        |
| DTC-2 | Edit `packages/qfai/assets/init/.qfai/**`, then run `pnpm sync:ssot`; delete the tracked symlink separately     | `.qfai/assistant/**` is generated, and a direct edit is reverted (SRC-0023, BP-0007)  | Skill text changes land in the package tree                          |
| DTC-3 | Regenerate `governedAssistantManifest.ts` with `npm run generate:governed-manifest`                             | The file is generated, and the retire pass reads it (SRC-0006, BP-0001)               | Needed for REQ-0006                                                  |
| DTC-4 | Shipped text carries no internal ID or private version marker                                                   | `.agents/rules/distributed-surface.md` (SRC-0018)                                     | The CHANGELOG may name ids; skill text and README may not (NFR-0004) |
| DTC-5 | No new finding code, migration step or replacement record                                                       | OQ-0003, OQ-0005, OQ-0007; minimal-implementation rung 1 (SRC-0019)                   | The change is deletions plus skill text                              |

## Operational Constraints

| ID   | Constraint                                                                                                                               | Rationale                                                                                                                                                  | Impact                                            |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| OC-1 | The check removal, skill text, directory deletion, test removals, ledger-row removals with tombstones, and dogfood re-pin are one change | OQ-0009; removing a test without its ledger rows, or the rows without the test, raises ledger errors, and the ratchet fails on a rise (SRC-0016, SRC-0025) | REQ-0015                                          |
| OC-2 | No `package.json#version` edit, release heading or `chore(release)` commit on the current branch                                         | The branch name carries no version pin, so each needs an explicit instruction (SRC-0020)                                                                   | The CHANGELOG entry stays under `## [Unreleased]` |
| OC-3 | Specs, `_policies` and contracts change only through the Change Request `/qfai-sdd` raises                                               | The removal contradicts settled rows; changing settled input is a Change Request the user approves                                                         | REQ-0016; this pack edits none of them            |
| OC-4 | Content moved from an entry is appended under its own date; existing dated text in the target is not rewritten                           | AP-0006                                                                                                                                                    | REQ-0013                                          |

## Legal / Compliance Constraints

| ID   | Constraint                                            | Regulation / Standard | Impact                                                            |
| ---- | ----------------------------------------------------- | --------------------- | ----------------------------------------------------------------- |
| LC-1 | None applies: no personal data, licence or regulation | None                  | Nothing to satisfy beyond keeping adopter files intact (NFR-0003) |

## Budget Constraints

- Budget range: none. The change spends nothing.
- Cost drivers: CI minutes for the one change.

## Timeline Constraints

- Hard deadlines: none set.
- Milestones: the Change Request is approved (REQ-0016) before the removal change
  merges.
