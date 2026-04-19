# 07 Non-Functional Requirements

## NFR Table

| NFR-ID   | Category        | Title                                                         | Target                                                                                              | Measurement                                                              | Source   | Priority |
|----------|-----------------|---------------------------------------------------------------|-----------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------|----------|----------|
| NFR-0001 | Maintainability | 100% line coverage for `pathUtils.ts` helpers                 | Zero uncovered branches in `pathUtils.ts`; `toRepoRelativeArtifactRef`, `assertConcreteArtifactRef`, `isConcreteArtifactRef` each fully covered | `pnpm vitest run --project core --coverage`; verify no uncovered lines in `pathUtils.ts` | SRC-0001 | must     |
| NFR-0002 | Reliability     | Validator rejects ALL malformed ref forms with zero false-negatives | 0 false-negatives in `isConcreteArtifactRef` check; all 5 malformed forms (absolute path, self-ref, synthetic token, directory, empty string) rejected | Dedicated negative test suite in `prototypingEvidence.test.ts` and `specCoverage.test.ts` | SRC-0001 | must     |
| NFR-0003 | Maintainability | No duplicate ref grammar implementation                       | 0 parallel implementations of concrete-ref grammar check; builder and validator share same helpers  | Code grep for independent regex/pattern definitions outside `pathUtils.ts` in `packages/qfai/src` | SRC-0001 | must     |
| NFR-0004 | Reliability     | Execution → validate closure test in production path test file | 1 positive closure test + at least 1 negative injection test in `prototypingExecution.productionPath.test.ts` | Test file existence + `pnpm vitest run --project core` pass               | SRC-0001 | must     |
