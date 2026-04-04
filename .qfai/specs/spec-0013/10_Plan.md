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

## v1.7.13 Implementation Notes

- Preflight prototyping.yaml gate: `packages/qfai/src/core/preflight/sddPreflight.ts` — missingSideArtifacts propagation
- Recommendation schema gate: `packages/qfai/src/core/preflight/sddPreflight.ts` — resolveRecommendationBlockers()
- Status: implemented (v1.7.13-20)
