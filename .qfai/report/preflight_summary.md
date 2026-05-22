# Preflight Summary — SDD Run (assistant-layer recut, 2026-05-22)

## Status: PASS

## Input Selection

| Priority | Source                                                              | Selected | Notes                                                                                                          |
| -------- | ------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| P1       | `.qfai/assistant/instructions/*`                                    | ✅       | Read                                                                                                           |
| P2       | `.qfai/assistant/steering/*`                                        | ✅       | Read                                                                                                           |
| P3       | `.qfai/specs/_policies/03_Capabilities.md` + all active spec heads  | ✅       | Stage 1 Triage input (16 active specs)                                                                         |
| P4       | `.qfai/specs/spec-0003..0016/**`                                    | ✅       | Multiple target specs (append-first fan-out)                                                                   |
| P5       | `.qfai/discussion/discussion-20260522081618995/**`                  | ✅       | Latest pack (15 files, `Disposition: open` count = 0, Reviewer Result `PASS`)                                  |

## Discussion Pack Readiness

| Check                              | Status  | Notes                                                                                                    |
| ---------------------------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| All 15 required files present      | ✅ PASS | `01_Context.md` through `99_delta.md`                                                                    |
| No blocking OQ (open=0)            | ✅ PASS | `11_OQ-Register.md` open=0; 2 deferred entries (OQ-0007 AGENTS.md, OQ-0008 auto-archival) in `13_Deferred.md` |
| Surface classification             | ✅ PASS | `ui_bearing: false`; UI sidecar family intentionally absent                                              |
| `prototyping.yaml` requiredness    | ✅ PASS | non-UI pack — not required                                                                               |
| Reviewer gate                      | ✅ PASS | `requirements-reviewer` = PASS (cycle 2; recorded in `14_Review-Request.md`)                             |

## Deferred OQ Handling (SDD-gated)

| OQ-ID   | Title                                                       | Gate    | SDD Action                                                                                                                              |
| ------- | ----------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| OQ-0007 | AGENTS.md alignment / `CLAUDE.md` symlink                   | ops     | Out of scope this pack; logged in target spec open-question file referencing the deferred row in `13_Deferred.md`                       |
| OQ-0008 | Auto-archival of stale work-log entries                     | ops     | Out of scope this pack; logged in target spec open-question file referencing the deferred row in `13_Deferred.md`                       |

## Slice Decision (Stage 1 Triage — preview)

The pack introduces 18 REQs and 10 NFRs distributed across multiple existing
active specs. No new CAP is required; the work-log surface and assistant-tree
re-cut are realized via existing capabilities (init seeds, validate enforces,
skills read/write, agents drift-check).

| Spec      | Action          | Category   | REQs (primary)                                                                                  | Rationale                                                                                                 |
| --------- | --------------- | ---------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| spec-0001 | UPDATE:APPEND   | structural | REQ-0001 (4-layer asset tree definition)                                                        | Asset-tree structural definition lives here; receives the new layer enum                                  |
| spec-0003 | UPDATE:APPEND   | cli        | REQ-0001, REQ-0002, REQ-0008, REQ-0009, REQ-0011, REQ-0012, REQ-0013, REQ-0018                  | `qfai init` seeds the new tree, work-log surface, migration memo, and upgrade flag                        |
| spec-0004 | UPDATE:APPEND   | cli        | REQ-0001, REQ-0003, REQ-0006, REQ-0007, REQ-0008, REQ-0010, REQ-0014, REQ-0015, REQ-0018, NFR-0008 | `qfai validate` enforces the new layout, frontmatter schema, drift/promote/stale/link checks              |
| spec-0008 | UPDATE:APPEND   | skill      | REQ-0004, REQ-0005, REQ-0010, REQ-0016, REQ-0017                                                | `qfai-atdd` reads work-log before authoring; declares `project_memory`                                    |
| spec-0010 | UPDATE:APPEND   | skill      | REQ-0010                                                                                        | `qfai-discussion` declares `project_memory`; not a worklog-writer per REQ-0005 notes                      |
| spec-0011 | UPDATE:APPEND   | skill      | REQ-0004, REQ-0005, REQ-0010, REQ-0016, REQ-0017                                                | `qfai-implement` is a primary worklog-writer/reader                                                       |
| spec-0012 | UPDATE:APPEND   | skill      | REQ-0004, REQ-0005, REQ-0010, REQ-0016, REQ-0017                                                | `qfai-prototyping` reads work-log; declares `project_memory`                                              |
| spec-0013 | UPDATE:APPEND   | skill      | REQ-0005 (Stage 0 read), REQ-0007 (promote-gate surfacing), REQ-0010                            | `qfai-sdd` reads work-log in Stage 0; surfaces promote-gate state                                         |
| spec-0014 | UPDATE:APPEND   | skill      | REQ-0005, REQ-0010, REQ-0014, REQ-0015, REQ-0017                                                | `qfai-verify` surfaces work-log state in verify reports                                                   |
| spec-0015 | UPDATE:APPEND   | agent      | REQ-0006, REQ-0017                                                                              | Reviewer-Gate emits `R-WORKLOG-DRIFT` / `R-REJECTED-READOPT` / `R-HANDOFF-INCOMPLETE`                     |
| spec-0016 | UPDATE:APPEND   | skill      | REQ-0010                                                                                        | `qfai-research` declares `project_memory`                                                                 |
| _policies/03_Capabilities.md | UPDATE:MODIFY | policy | none (no new CAP)                                                                              | Success-metrics tightening for CAP-0001/0003/0004/0015 if needed; otherwise no change                     |
| _policies/05_Contracts.md    | UPDATE:APPEND | policy | REQ-0009 (path SSOT), REQ-0006 (Reviewer Gate inputs)                                          | Contract Index gains CLI contract for `qfai init --upgrade-assistant-tree`                                |
| _policies/10_delta.md        | UPDATE:APPEND | policy | cross-spec append fan-out record                                                               | Records the cross-spec change set                                                                          |

Slice policy per `_policies/11_Slice-Policy.md`: **append-first**. All operations
are UPDATE:APPEND or UPDATE:MODIFY within existing active specs. No CREATE /
DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE rows. No approval-gated
operation → AskUserQuestion not required at triage step.

## Contracts Posture (Phase 0)

- DB Contracts: 0 items (QFAI is CLI, no DB)
- API Contracts: 0 items (QFAI is CLI, no HTTP/gRPC)
- UI Contracts: 0 items (non-UI-bearing pack)
- **CLI Contracts (this delta): 1 update** — `.qfai/contracts/cli/qfai-init.md` MUST document
  `--upgrade-assistant-tree` flag (exit codes `0/2/64/65`, side effects, collision policy).
  `.qfai/contracts/cli/qfai-validate.md` MUST document new finding codes
  (`W-WORKLOG-SCHEMA`, `R-WORKLOG-DRIFT`, `R-REJECTED-READOPT`, `W-PENDING-PROMOTION`,
  `W-WORKLOG-STALE`, `W-WORKLOG-BROKEN-LINK`, `D-DEPRECATED-PATH`,
  `R-HANDOFF-INCOMPLETE`, `W-SKILL-DOC-BROKEN-REF`, `W-USER-EDIT-PRESERVED`,
  `E-WORKLOG-SECRET`).
- DESIGN.md freeze: SKIPPED (non-UI-bearing target)

## Stage 0 Steering Refresh

| File         | Status    | Action                                                                                                  |
| ------------ | --------- | ------------------------------------------------------------------------------------------------------- |
| manifest.md  | No change | Current facts sufficient; assistant-tree recut is the SDD subject, not Stage 0 input                    |
| product.md   | No change | Current                                                                                                 |
| tech.md      | No change | Current                                                                                                 |
| structure.md | No change | Current; new tree structure will be documented in spec artifacts, not in steering during this run       |

## Validate Baseline

- Pre-edit: `pnpm exec qfai validate --profile sdd --fail-on error --format github` →
  will be captured at start of Phase 0; baseline expected error=0 (no spec edits yet)
- Post-edit: same command MUST return error=0 before the quality gate is declared

## Reviewer Routing (this delta)

| Reviewer                 | Routed? | Rationale                                                                                                   |
| ------------------------ | ------- | ----------------------------------------------------------------------------------------------------------- |
| completion-reviewer      | ✅      | Always required                                                                                             |
| architecture-reviewer    | ✅      | Structural / contract / CLI surface changed                                                                 |
| product-surface-reviewer | ❌      | Target is non-UI-bearing                                                                                    |
| qa-gatekeeper            | ✅      | Validator gains new finding codes (`W-WORKLOG-SCHEMA` family + `R-*` reviewer codes) — validate coverage scope |

## Open Gaps

None blocking SDD. Two deferred OQs (`13_Deferred.md`) carry forward to
implementation-time open-question files in the touched specs.

## Next Step

Proceed through Phase 0 → Phase 1 → Phase 2 (parallel slice across the ~10
targeted active specs) → Phase 3 → Phase 4 → quality gate.
