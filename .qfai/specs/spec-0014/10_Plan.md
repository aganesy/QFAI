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

## v1.7.16 Implementation Notes (How-only)

### Validator Files (source)

- `packages/qfai/src/core/validators/trendEvaluationConnection.ts` — implements UIX-VAL-T01 (presence), UIX-VAL-T02 (resolution). Exports `runTrendEvaluationConnection(root, config) => Promise<Issue[]>`.
- `packages/qfai/src/core/validators/trendSourceRefs.ts` — implements UIX-VAL-T03 (TRD source_refs resolution). Exports `runTrendSourceRefs(root, config) => Promise<Issue[]>`.
- `packages/qfai/src/core/validators/trendVisualAxisCoverage.ts` — implements UIX-VAL-T04 (visual trend -> visual axis coverage). Exports `runTrendVisualAxisCoverage(root, config) => Promise<Issue[]>`.
- `packages/qfai/src/core/validators/designSystemPresence.ts` — implements UIX-VAL-DS01 (12_design_system.md presence) and UIX-VAL-DS02 (required-section non-empty). Exports `runDesignSystemPresence(root, config) => Promise<Issue[]>`.
- `packages/qfai/src/core/validators/prototypingEvidenceDs.ts` — implements PROT-DS01 (scoringTrace.designSystemCompliance). Exports `runPrototypingEvidenceDs(root, config) => Promise<Issue[]>`.

### Registration

- Register all five new validators inside the canonical runner at `packages/qfai/src/core/validators/canonical.ts` (extend `runCanonicalUixValidators` — REQ-0013 / BR-0014-0014). Ordering: trend validators before design-system validators before prototyping-evidence validator (shallowest I/O first).
- Severity mapping constants centralized in `packages/qfai/src/core/validators/severity.ts` (or extend existing severity module). PROT-DS01 consults the severity decision via a mode+surface+file-exists predicate instead of a static constant.

### Non-UI Safety Guard

- Each new validator MUST short-circuit at the top of its handler when `config.surface === 'non-ui'`, returning `[]` before performing any `fs` I/O (BR-0014-0024, NFR-0004).

### Test Files (spec -> implementation mapping)

- `packages/qfai/tests/validators/trendEvaluationConnection.test.ts` — TC-0014-0020, TC-0014-0021, TC-0014-0022, TC-0014-0023
- `packages/qfai/tests/validators/trendSourceRefs.test.ts` — TC-0014-0024
- `packages/qfai/tests/validators/trendVisualAxisCoverage.test.ts` — TC-0014-0025
- `packages/qfai/tests/validators/designSystemPresence.test.ts` — TC-0014-0026, TC-0014-0027, TC-0014-0032
- `packages/qfai/tests/validators/prototypingEvidenceDs.test.ts` — TC-0014-0028, TC-0014-0029
- `packages/qfai/tests/integration/v1716NonUiSafety.test.ts` — TC-0014-0030
- `packages/qfai/tests/integration/v1716Idempotency.test.ts` — TC-0014-0031

### Configuration Hooks

- No new `qfai.config.yaml` keys required for v1.7.16 validators themselves. If future ratchets demote T03/T04 WARNING -> ERROR per DR-0014-v1716-02, expose via `qfai.config.yaml > validators.severityOverrides.<ruleId>`; that schema change belongs to the subsequent version and is out of scope for this plan.

### Performance Budget (NFR-0004)

- Combined wall-clock time added by the five new validators must remain within 20% of the v1.7.15 `qfai validate` baseline. Measurement: run the existing perf harness before and after; fail CI if delta exceeds 20%.
- Implementation guidance: (a) read 04_Sources.md and 21_design_eval_trend_derived.md once per invocation and memoize parsed results across T01..T04; (b) stat-check `uiux/12_design_system.md` once and pass result to DS01/DS02/PROT-DS01; (c) skip all I/O on non-ui surface.

### Dependencies

- Requires: no new runtime dependencies. Uses existing markdown frontmatter / heading parser utilities in `packages/qfai/src/core/parse/`.

### Risk

- Parser coupling: changes to 04_Sources.md template structure (REQ-0006) land in the same release; validators must tolerate both pre- and post-template packs for non-UI/non-UI-bearing scenarios. Mitigation: feature-detect `evaluation_connection` by field presence, not by template version.
