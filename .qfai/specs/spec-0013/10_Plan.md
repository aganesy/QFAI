# 10 Plan

## Implementation approach

1. Discussion-pack preflight: validate latest pack readiness
2. Contract-first phase: create/update `.qfai/contracts/(api|db|ui)/**`
3. Outline phase: generate `_policies/01..10` layered artifacts
4. Slice phase: generate `spec-XXXX/01..08` with slice gate enforcement
5. Plan phase: finalize `spec-XXXX/10_Plan.md` after slice gate pass
6. Delta phase: update `spec-XXXX/09_delta.md` with rejected guardrails
7. Validate gate: run `qfai validate --fail-on error` until error=0
8. Density review: triage `QFAI-COV-207` warnings

### Intent-driven entry (CAP-0018)

This change introduces no architectural element. It writes `qfai-sdd`'s own
`references/orchestrated-mode.md` in the table format CLI-WFFILE owns, and edits
two existing references.

Units and work. The order across the batch is spec-0018 `10_Plan.md` `### Implementation order`.

- **U2:** `qfai-sdd/references/orchestrated-mode.md`, holding:
  - the entry check and standalone end (BR-0013-0032, 0033);
  - the Operations table, `new-capability`, `delta-or-applicability-check`
    and `defect-row-seeding` (BR-0013-0034);
  - the Stage 1 authorization check (BR-0013-0022, 0023, 0024, 0025);
  - target binding (BR-0013-0031);
  - the preflight check never cached (BR-0013-0035).

  Plus one citation line in `qfai-sdd/SKILL.md`. Stage 1's text is not inlined
  there.

- **U3:**
  - the `Authorization-Ref` column in `references/sdd-triage.md`
    (BR-0013-0026), with spec-0004's validator;
  - defect row seeding in `references/sdd-phase-checklists.md`, including the
    downstream-row carve-out line (BR-0013-0027..0030, BR-0013-0036), with
    spec-0001's and spec-0011's.

Left out: the `Authorization-Ref` validator (spec-0004); the core's
`recordAreas` (spec-0018).

## Test approach

- Unit tests: reference direction enforcement, required edge detection, contract index alignment
- Integration tests: phase order enforcement, slice gate validation, validate gate
- E2E tests: full SDD workflow from discussion pack to validate pass

### Intent-driven entry (CAP-0018)

What each layer proves:

| Layer | What it proves                                                                                                                                                                                                    | Cases                    |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `L3`  | The shipped `qfai-sdd` text: `references/orchestrated-mode.md`, `references/sdd-triage.md`, the Phase 2b defect row seeding text in `references/sdd-phase-checklists.md`, and the one citation line in `SKILL.md` | TC-0013-0038..0051       |
| E2E   | SDD as a stage of a run, the routing-time CREATE approval checked at Stage 1, and defect row seeding                                                                                                              | US-0013-0015, 0016, 0017 |

Test modules, one per BR, all under `packages/qfai/tests/integration/sdd/`:

| BR                         | Module                                 | Cases        |
| -------------------------- | -------------------------------------- | ------------ |
| BR-0013-0022               | `stage1ApprovalCheck.test.ts`          | TC-0013-0038 |
| BR-0013-0023               | `stage1ApprovalStop.test.ts`           | TC-0013-0039 |
| BR-0013-0024               | `stage1OtherApprovals.test.ts`         | TC-0013-0040 |
| BR-0013-0025               | `stage1AutoMode.test.ts`               | TC-0013-0041 |
| BR-0013-0026               | `triageAuthorizationRefColumn.test.ts` | TC-0013-0042 |
| BR-0013-0027               | `defectRowSeeding.test.ts`             | TC-0013-0043 |
| BR-0013-0028, BR-0013-0036 | `defectRowSeedingExistingRows.test.ts` | TC-0013-0044 |
| BR-0013-0029               | `defectRowSeedingLayer.test.ts`        | TC-0013-0045 |
| BR-0013-0030               | `defectRowSeedingDelta.test.ts`        | TC-0013-0046 |
| BR-0013-0031               | `workOrderTarget.test.ts`              | TC-0013-0047 |
| BR-0013-0032               | `standaloneEnd.test.ts`                | TC-0013-0048 |
| BR-0013-0033               | `entryCheck.test.ts`                   | TC-0013-0049 |
| BR-0013-0034               | `operationsTable.test.ts`              | TC-0013-0050 |
| BR-0013-0035               | `stage0Reuse.test.ts`                  | TC-0013-0051 |

These module names replace the two files the `Notes` of `06_Test-Cases.md` name.
TC-0013-0044 sits with its lower BR.

Cases that stand alone:

- Four kept failures, each a case of its own:
  - the failed approval check (TC-0013-0039);
  - `--auto` inside a run (TC-0013-0041);
  - a work order with no target (TC-0013-0047);
  - the entry check (TC-0013-0049).
- The approval check's pass (TC-0013-0038) and its failure (TC-0013-0039) are two
  cases, not one parameterised case.
- The non-CREATE approval inside a run is TC-0013-0040, apart from TC-0013-0038.
  Its row carries no `Authorization-Ref`, and the answerer comes from the
  `decision` question.
- No case is a matrix. Each reads one shipped file, which is one observation, and
  its `Steps` name every clause.

What existing guards already hold, with no new case:

- The legacy `--auto` case: `tests/assets/autoModeApprovalDegrade.test.ts`,
  unchanged. TC-0013-0041 holds only the case inside a run.
- A ledger row added by any stage but `sdd_append`: the core's row-set check,
  spec-0018's fault seed.
- The staleness of a routing-time approval: judged by the core, and tested as
  spec-0018's fault seed.
- The `SKILL.md` line budget: the doctor's asset line budget. The file grows by
  one line.

Order, per spec-0018 `10_Plan.md` `### Order in which the rows go green`:

- The `L3` rows are tier 2. The `Authorization-Ref` column lands with spec-0004's
  validator. The defect row seeding text lands with spec-0001's and spec-0011's
  carve-out lines.
- The E2E rows close at tier 5: US-0013-0015 and 0017 on the US-0018-0001 journey,
  US-0013-0016 on US-0018-0002.

Findings carried on purpose:

- `QFAI-ATDD-111` (US-0013-0015..0017) and `QFAI-ATDD-112` (TC-0013-0038..0051),
  until the annotated tests land. Each push lists them in the batch evidence.
- The ledger's 16 pinned `tdd` errors (8 × `QFAI-TDDLIST-007`, 8 × `-011`) are
  left as they are. No existing row changes.
- This spec already has a Coverage Depth Matrix, so no `full` pin moves when ATDD
  updates it.

## NFR approach

- NFR-0001 to NFR-0003, NFR-0005 and NFR-0006 are unchanged by the
  intent-driven entry, and their existing measurements stand. The floors that
  entry touches are answered below.

### Intent-driven entry (CAP-0018)

- NFR-0004, validate at error 0: the duplicate acceptance criterion IDs are
  resolved. The gate owner refreshes the pinned backlog for the corrected
  criteria before the full release gate.
- `discussion-20260923171450572#NFR-0002`, the shipped asset ceiling:
  `qfai-sdd/SKILL.md` grows by the one citation line, from 518 to 519, and the
  new `references/orchestrated-mode.md` and the two edited references stay
  within 800 lines. Breach: the doctor's asset line budget
  (`ASSISTANT_ASSET_MAX_LINES`) reports one of these files.
- `discussion-20260923171450572#NFR-0015`, no internal identifier in what ships:
  the shipped text names contracts by their files and sections, and cites no
  spec, decision or pack ID of this repository. Breach: `lint:shipping`,
  `check-no-internal-version-leakage.sh` or
  `tests/integration/distributedSurfaceLeakage.test.ts` fails.

## Dependencies

- Requires: discussion pack from `/qfai-discussion`
- Consumed by: `/qfai-prototyping` or `/qfai-atdd` as next steps

## Risk mitigation

- Large batch mode may exceed context limits for multi-spec projects
- Mitigation: parallel delegation per spec with shared gate at batch tail

### Intent-driven entry (CAP-0018)

| Risk                                                                                                                                 | Likelihood / impact | Mitigation                                                                                    | Trigger to act                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| The `--auto` degrade guard is extended to the in-run case, merging the two cases `discussion-20260923171450572#REQ-0044` keeps apart | low / med           | The in-run case is its own `L3` case, TC-0013-0041, and the guard keeps the legacy case alone | A diff to `packages/qfai/tests/assets/autoModeApprovalDegrade.test.ts` |
| Stage 1 persists a `CREATE` row before its authorization check passes                                                                | low / high          | The check runs before any triage row is written (DR-0296, BR-0013-0023)                       | `QFAI-TRIAGE-011` or `QFAI-TRIAGE-005` on a `CREATE` row a run wrote   |

## v1.8.1 Implementation Notes

- Discussion readiness gate: `packages/qfai/src/core/preflight/sddPreflight.ts` — blockers are derived from required markdown readiness and blocking OQ state
- Optional side artifacts: `packages/qfai/src/core/discussionPack.ts` retains `missingSideArtifacts` only as a compatibility-shaped empty array
- Current sync reflects the removal of required prototyping side artifacts from preflight.

## CHG-005 (2026-05-24) — qfai-prototyping defect remediation

- Implement REQ-0013-0018 per AC-0013-0018..0019:
  1. UI spec template `templates/contracts/ui-contract.sample.yaml` gets a `primary_tasks: []` slot per `screens[]` entry.
  2. `requirements-analyst` agent guide instructs authoring ≥ 1 `primary_task` per screen during SDD Phase 2 Slice.
  3. New validate lane (QFAI-AUD-001 aligned) blocks `/qfai-prototyping` from proceeding when any contracted screen has empty `primary_tasks`.
- Cross-spec coupling: validator implementation lives in spec-0004 territory; the template + author guide are spec-0013 territory.

## v1.9.2 Second-Wave — How

- Active pointer reader (REQ-0155 / DR-0266): add a single helper that reads `.qfai/state.json#discussion.currentId` (writer in spec-0010); downstream `/qfai-sdd` skills resolve the active pack through it. Reject absent/missing/duplicate with an error naming candidate `discussion-*` dirs + `qfai discussion use <id>`. No mtime inference.
- `surface_type` auto-population (REQ-0163): add a `/qfai-sdd` SKILL.md step that sets `surface_type: ui-bearing` frontmatter for every spec with a `.qfai/contracts/ui/<spec>-*.yaml` companion; `qfai sdd lint` emits `D-SURFACE-TYPE-MISSING` (warning during the window, sunsets to error). `resolveAllUiBearingSpecs()` keeps requiring the frontmatter as the strict signal.
- `primary_tasks` band + shape (REQ-0164 / DR-0267 / DR-0268): document band 3..7 in `templates/contracts/ui-spec.yaml` comments and `references/ui-contract-guide.md`; `QFAI-AUD-020` warning text names the band; `auditProfile.ts` accepts string-only AND structured `{id,label,acceptance}` (all-required, closed) items during the window. Validator-implementation side is shared with spec-0004 (Source REQ-0164); this slice owns the SDD authoring + doc + template surface.
