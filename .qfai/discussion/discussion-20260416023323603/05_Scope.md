# 05 Scope

## In Scope

### Source Files

| File                                                                          | WS        | Change Type         |
|-------------------------------------------------------------------------------|-----------|---------------------|
| `packages/qfai/src/core/prototyping/specCoverage.ts`                          | WS-1, WS-3 | Modified           |
| `packages/qfai/src/core/prototyping/runtimeGateBuilder.ts`                    | WS-2, WS-3 | Modified           |
| `packages/qfai/src/core/prototyping/execution.ts`                             | WS-2, WS-3 | Modified           |
| `packages/qfai/src/core/harness/measurement.ts`                               | WS-3      | Conditionally modified (if absolute path ref output found) |
| `packages/qfai/src/core/validators/prototypingEvidence.ts`                    | WS-2, WS-3 | Modified           |
| `packages/qfai/src/core/prototyping/pathUtils.ts`                             | WS-1, WS-3 | **New file**        |

### Test Files

| File                                                                          | WS    | Change Type         |
|-------------------------------------------------------------------------------|-------|---------------------|
| `packages/qfai/tests/core/specCoverage.test.ts`                               | WS-4  | Extended             |
| `packages/qfai/tests/core/prototypingEvidence.test.ts`                        | WS-4  | Extended             |
| `packages/qfai/tests/core/prototypingExecution.productionPath.test.ts`        | WS-4  | **New file**         |

### Docs (Conditional)

| File                               | Condition                                                                          |
|------------------------------------|------------------------------------------------------------------------------------|
| `packages/qfai/README.md`          | Update only if current description is obsolete or absent for ref grammar / validator contract |

## Out of Scope

| Item                                                     | Reason                                                                       |
|----------------------------------------------------------|------------------------------------------------------------------------------|
| repo root `.qfai/**`                                     | Explicitly excluded (design doc §4-2)                                        |
| Calibration system redesign                              | Closed in rev7; not re-opened                                                |
| Full-harness runtime redesign                            | Closed in rev7; not re-opened                                                |
| uiFidelity / Browser QA / L2 evidence redesign           | Out of scope for rev8                                                        |
| standard / low-cost / non-UI mode re-introduction        | Removed in earlier cycles                                                    |
| Backward compat / migration tooling                      | 後方互換は完全に捨てる                                                         |
| Existing output migration                                | Not required                                                                 |
| `packHash` integrity check                               | Deferred (carried from rev7 OQ-0001)                                        |
| New external dependencies                                | Not introduced                                                               |

## Success Criteria

1. `specCoverage.ts` absolute path output is eliminated; all `evidenceRefs` and `coverageRefs[].declaredRef` values are POSIX repo-relative concrete artifact refs.
2. `prototypingEvidence.ts` parses and validates `runtimeGate.evidenceRefs`; field absence, empty array, absolute path, self-ref, and synthetic token each produce validator errors.
3. All 5 traceability ref sites use the same grammar backed by shared helpers in `pathUtils.ts`; no parallel grammar implementations exist.
4. `prototypingExecution.productionPath.test.ts` exists with at least one positive closure test and at least one negative injection test.
5. All vitest test suites pass: `pnpm vitest run --project validators` and `pnpm vitest run --project core`.
