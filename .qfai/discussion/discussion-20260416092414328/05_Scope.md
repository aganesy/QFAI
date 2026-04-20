# 05 Scope

## In Scope

### Source Files

| File                                                                          | WS        | Change Type                     |
|-------------------------------------------------------------------------------|-----------|---------------------------------|
| `packages/qfai/src/core/validators/prototypingEvidence.ts`                    | WS-1      | Modified — leaf-field validation extension |
| `packages/qfai/src/core/evidence/bundleWriter.ts`                             | WS-2      | Modified — declaredRef required; leaf arrays required non-nullable |
| `packages/qfai/src/core/prototyping/runtimeObservation.ts`                    | WS-2      | Conditionally modified (if null/omit emission patterns exist) |
| `packages/qfai/src/core/prototyping/runtimeGateBuilder.ts`                    | WS-2      | Conditionally modified (if ui[].declaredRef can be emitted as undefined) |
| `packages/qfai/README.md`                                                     | WS-4      | Modified — enumerate all concrete-ref leaf fields |

### Test Files

| File                                                                                 | WS    | Change Type                |
|--------------------------------------------------------------------------------------|-------|----------------------------|
| `packages/qfai/tests/core/prototypingEvidence.test.ts`                               | WS-3  | Extended — leaf-field negative cases |
| `packages/qfai/tests/core/prototypingExecution.productionPath.test.ts`               | WS-3  | Extended — leaf strictness closure assertions |
| `packages/qfai/tests/core/validate.test.ts`                                          | WS-3  | Extended — synthetic token fixture replacement |
| `packages/qfai/tests/core/specCoverage.test.ts`                                      | WS-3  | Conditionally extended (if synthetic tokens in axis fixtures) |

### Unchanged Files (Reused from rev8)

| File                                                           | Notes                                             |
|----------------------------------------------------------------|---------------------------------------------------|
| `packages/qfai/src/core/prototyping/pathUtils.ts`              | Rev8 helpers reused as-is; no modifications needed |
| `packages/qfai/src/core/prototyping/specCoverage.ts`           | Rev8 changes complete; not modified in rev9       |
| `packages/qfai/src/core/prototyping/execution.ts`              | Rev8 `assertConcreteArtifactRef` gate in place; not modified unless builder changes require it |

## Out of Scope

| Item                                                     | Reason                                                                        |
|----------------------------------------------------------|-------------------------------------------------------------------------------|
| repo root `.qfai/**`                                     | Explicitly excluded (design doc §4-2)                                         |
| Calibration pack redesign                                | Closed in earlier cycles; not re-opened                                        |
| Full-harness scoring logic redesign                      | Out of scope for rev9                                                           |
| Browser QA orchestration redesign                        | Out of scope for rev9                                                           |
| Standard / low-cost / non-UI mode re-introduction        | Removed in earlier cycles                                                       |
| Backward compat / migration tooling                      | 後方互換は完全に捨てる                                                           |
| Existing output migration                                | Not required                                                                    |
| `packHash` integrity check                               | Deferred (carry-forward from rev7 OQ-0001)                                      |
| New external dependencies                                | Not introduced                                                                  |
| `pathUtils.ts` redesign                                  | Rev8 helpers are correct; no modifications needed                               |

## Success Criteria

1. `validatePrototypingEvidence()` rejects all malformed forms in `runtimeGate.ui[].declaredRef` (absent, absolute path, self-ref, synthetic token, bare filename, directory path, Windows separator).
2. `validatePrototypingEvidence()` rejects empty array and malformed entries in `runtimeGate.ui[].renderEvidenceRefs[]` and `browserQaEvidenceRefs[]`.
3. `validatePrototypingEvidence()` rejects empty array and malformed entries in all `l1/l2.axes[].evidenceRefs[]` fields.
4. `validatePrototypingEvidence()` rejects empty array and malformed entries in `reviewerLogs[].evidenceRefs[]` fields.
5. `bundleWriter.ts` schema has no optional or nullable leaf array fields that the validator would reject.
6. All `tests/core/` fixtures with synthetic token `evidenceRefs` are replaced with concrete artifact refs.
7. All vitest test suites pass: `pnpm vitest run --project validators` and `pnpm vitest run --project core`.
