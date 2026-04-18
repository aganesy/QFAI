# 10 Plan

## Implementation Strategy

1. Full-scan verification engine: always run complete verification
2. QFAI gates: `qfai validate --fail-on error` integration
3. Repository gates: format, lint, typecheck, tests, build in stable order
4. Fix loop: root cause identification, fix, re-verify
5. UIX-VAL validators: deterministic async validators for UI/UX artifacts
6. UIX-REV reviewers: semantic review prompt templates
7. Non-UI safety: surface detection and validator skip logic
8. Migration support: stale sidecar detection and canonical upgrade guidance
9. Evidence summary: Change Classification, gate results, commands

## Test Strategy

- Unit tests: UIX-VAL determinism, waiver handling, non-UI skip logic, stale sidecar migration errors
- Integration tests: full verify workflow, fix loop, gate execution order
- E2E tests: end-to-end verification from dirty state to all gates PASS

## Dependencies

- Requires: implemented code from `/qfai-implement`, spec artifacts from `/qfai-sdd`
- Consumed by: PR creation workflow

## Risk

- UIX-VAL/UIX-REV validator additions may affect existing test suites
- Mitigation: NFR-0004 ensures non-UI projects are unaffected; compatibility is checked through canonical surface assertions and stale-artifact migration tests

## v1.7.12 Implementation Strategy

- **Phase**: Evidence/QA convergence
- **Bundle**: C (validator/runtime/browser QA convergence)

### Steps

1. Update evidence state handling to truthfully distinguish captured/skipped/failed/missing/not-applicable
2. Remove placeholder text from evidence outputs
3. Keep minimal truthful browser QA runner (findings not always empty)
4. Align canonical validator set with 3-layer family

### Test Strategy

- Vitest for evidence state handling
- Browser QA runner tests

## v1.7.13 Implementation Notes

- Canonical UIX validators: verify uses runCanonicalUixValidators() (12 validator functions via canonical.ts)
- Compatibility surface: `validators/legacy/` と IssueCategory `compatibility` は package surface から除去済み
- Stale sidecar support: migration guidance は hidden compatibility path ではなく canonical validator errors で提供
- Implemented surface confirmed by semantics audit.
