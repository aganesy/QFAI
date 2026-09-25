# 05 Scope

## In Scope

- Capability 1: `qfai init` stops creating `.qfai/steering/` and stops shipping
  `catalog/worklog-entry.schema.md` (REQ-0001, REQ-0006).
- Capability 2: `qfai validate` stops reading `.qfai/steering/`. The five
  work-log findings, `QFAI-TDDLIST-015` and `QFAI-TDDLIST-016` are no longer
  emitted, and `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` leave the reviewer
  justification set (REQ-0002 to REQ-0005).
- Capability 3: the qfai-implement and qfai-sdd skill text names the home each
  kind of record already has, and the approval stop writes nothing new
  (REQ-0007, REQ-0008, REQ-0009).
- Capability 4: adopters' existing `.qfai/steering/` is left untouched, and the
  CHANGELOG says so (REQ-0010, REQ-0011).
- Capability 5: documents that describe the surface stop describing it (REQ-0012).
- Capability 6: this repository's seven entries are migrated, the directory is
  deleted, and every pointer into it is rewritten (REQ-0013, REQ-0014).
- Capability 7: all of the above lands in one change with the ledger-row removals
  REQ-0016 authorises and the dogfood re-pin (REQ-0015).
- Capability 8: the upstream conflicts are recorded as the Change Request
  `/qfai-sdd` raises (REQ-0016).
- Capability 9: tests that pinned the surface go, and none is added in their
  place (REQ-0017).

## Out of Scope

- Item 1: A, the legacy `.qfai/assistant/steering/` layout, its constants and its
  migration code (`01_Context.md#Background`, SRC-0003, SRC-0004).
- Item 2: B, the catalog steering files and the Stage 0 steering refresh (SRC-0027).
- Item 3: `.qfai/handoff.yaml`, `handoffUpgrade.ts` and `R-HANDOFF-SCHEMA-DRIFT`,
  which share only the word "handoff" (AP-0001).
- Item 4: `R-REJECTED-READOPT`, which concerns a rejected option in
  `07_Decisions.md` and reads no work-log entry (AP-0002).
- Item 5: any finding about a leftover `.qfai/steering/` (OQ-0005, AP-0005).
- Item 6: a replacement for the handoff brief (OQ-0003) or for the approval-stop
  entry (OQ-0007).
- Item 7: correcting the claim that `.qfai/steering/` is gitignored by default
  (OQ-0012).
- Item 8: editing specs, `_policies` or contracts in this stage. `/qfai-sdd` does
  that through the Change Request (REQ-0016).
- Item 9: choosing the release version (OQ-0011).

## Constraints

- Technical constraints: remove by symbol (DTC-1); edit the package tree, then
  sync (DTC-2); regenerate the governed manifest (DTC-3). See `09_Constraints.md`.
- Operational constraints: one change (OC-1); no version edit on this unpinned
  branch (OC-2); upstream edits go through a Change Request (OC-3).
- Legal / compliance constraints: none apply (`09_Constraints.md#Legal / Compliance Constraints`).

## Success Criteria

> IDs use the `DSC-` prefix. Bare `SC-NNNN-NNNN` is reserved for the traceability
> scenario tag (`QFAI:SC-...`) and must not be used for a success criterion.

| Criterion | Measurement                                                                                        | Target               | Priority |
| --------- | -------------------------------------------------------------------------------------------------- | -------------------- | -------- |
| DSC-001   | Paths under `.qfai/steering/` that `qfai init` creates in an empty directory                       | 0                    | must     |
| DSC-002   | Removed codes emitted by `qfai validate --profile full` on a tree that holds `.qfai/steering/*.md` | 0                    | must     |
| DSC-003   | Files under an adopter's `.qfai/steering/` whose bytes change after `qfai init --force`            | 0                    | must     |
| DSC-004   | Matches for the removed symbols in `packages/qfai/src/**` and `packages/qfai/assets/**` (NFR-0006) | 0                    | must     |
| DSC-005   | Tracked paths under `.qfai/steering/` in this repository                                           | 0                    | must     |
| DSC-006   | CI result of the one change, including `check-dogfood-backlog.mjs` for tdd, sdd and full           | pass                 | must     |
| DSC-007   | Unique content items from the disposition table (SRC-0024) found in their target file              | all                  | must     |
| DSC-008   | Diff to A's and B's code, assets and tests (NFR-0001, NFR-0002)                                    | none beyond comments | should   |

## Assumptions

- Assumption 1: nothing outside QFAI reads an adopter's `.qfai/steering/`. The
  change does not depend on it, because those files are left in place (REQ-0010).
- Assumption 2: the target evidence files for the migrated content are tracked in
  this repository. Checked: `git ls-files .qfai/evidence` lists
  `implement-spec-0003.md`, `implement-spec-0006.md`, `implement-spec-0017.md`,
  `sdd-spec-0017.md` and `coverage-depth-spec-0002.md`.
