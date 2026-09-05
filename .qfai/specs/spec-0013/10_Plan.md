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

## Test approach

- Unit tests: reference direction enforcement, required edge detection, contract index alignment
- Integration tests: phase order enforcement, slice gate validation, validate gate
- E2E tests: full SDD workflow from discussion pack to validate pass

## Dependencies

- Requires: discussion pack from `/qfai-discussion`
- Consumed by: `/qfai-prototyping` or `/qfai-atdd` as next steps

## Risk mitigation

- Large batch mode may exceed context limits for multi-spec projects
- Mitigation: parallel delegation per spec with shared gate at batch tail

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
