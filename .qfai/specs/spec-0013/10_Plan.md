# 10 Plan

## Implementation Strategy

1. Discussion-pack preflight: validate latest pack readiness
2. Contract-first phase: create/update `.qfai/contracts/(api|db|ui)/**`
3. Outline phase: generate `_policies/01..10` layered artifacts
4. Slice phase: generate `spec-XXXX/01..08` with slice gate enforcement
5. Plan phase: finalize `spec-XXXX/10_Plan.md` after slice gate pass
6. Delta phase: update `spec-XXXX/09_delta.md` with rejected guardrails
7. Validate gate: run `qfai validate --fail-on error` until error=0
8. Density review: triage `QFAI-COV-207` warnings

## Test Strategy

- Unit tests: reference direction enforcement, required edge detection, contract index alignment
- Integration tests: phase order enforcement, slice gate validation, validate gate
- E2E tests: full SDD workflow from discussion pack to validate pass

## Dependencies

- Requires: discussion pack from `/qfai-discussion`
- Consumed by: `/qfai-prototyping` or `/qfai-atdd` as next steps

## Risk

- Large batch mode may exceed context limits for multi-spec projects
- Mitigation: parallel delegation per spec with shared gate at batch tail

## v1.8.1 Implementation Notes

- Discussion readiness gate: `packages/qfai/src/core/preflight/sddPreflight.ts` — blockers are derived from required markdown readiness and blocking OQ state
- Optional side artifacts: `packages/qfai/src/core/discussionPack.ts` retains `missingSideArtifacts` only as a compatibility-shaped empty array
- Current sync reflects the removal of required prototyping side artifacts from preflight.
