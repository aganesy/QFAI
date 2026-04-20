# 06 Requirements

## Functional Requirements

| REQ-ID   | Title                                                                      | Description                                                                                                                                                                                                                                                                                      | Source          | Priority | Status |
|----------|----------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------|----------|--------|
| REQ-0001 | `toRepoRelativeArtifactRef()` helper in `pathUtils.ts`                     | A function `toRepoRelativeArtifactRef({ repoRoot, absolutePath, line?, anchor? }): string` must exist in `packages/qfai/src/core/prototyping/pathUtils.ts`. It must: return a POSIX repo-relative path; throw if `absolutePath` is outside `repoRoot`; throw if path is a directory; throw if both `line` and `anchor` are specified. | SRC-0001 WS-1   | must     | draft  |
| REQ-0002 | `parseSpecDeclaration()` and `extractUiRouteDeclarations()` use normalizer | `parseSpecDeclaration()` and `extractUiRouteDeclarations()` in `specCoverage.ts` must not return raw absolute path strings as `declaredRef`. All `declaredRef` values produced by these functions must pass through `toRepoRelativeArtifactRef()`.                                                 | SRC-0001 WS-1   | must     | draft  |
| REQ-0003 | `buildSpecCoverageSummary()` outputs only concrete artifact refs            | `buildSpecCoverageSummary()` must not accept a directory path as a ref source. All `evidenceRefs` in its output must be concrete artifact refs. Directory paths, pack root paths, and bare filenames without extension must not appear in output.                                                   | SRC-0001 WS-1   | must     | draft  |
| REQ-0004 | `buildPerSpecCoverage()` outputs concrete artifact refs in `declaredRef`   | `buildPerSpecCoverage()` must produce `coverageRefs[].declaredRef` values that are concrete artifact refs using the same grammar (and same helper) as summary `evidenceRefs`. Absolute paths must not appear in `declaredRef`.                                                                     | SRC-0001 WS-1   | must     | draft  |
| REQ-0005 | `PrototypingEvidence["runtimeGate"]` type includes `evidenceRefs: string[]` | The TypeScript type for the `runtimeGate` field of `PrototypingEvidence` must include `evidenceRefs: string[]` as a formal, required field. This field must be present in the type definition used by both the parser and the validator.                                                           | SRC-0001 WS-2   | must     | draft  |
| REQ-0006 | `parseEvidence()` reads and type-checks `runtimeGate.evidenceRefs`         | `parseEvidence()` in `prototypingEvidence.ts` must read `runtimeGate.evidenceRefs` from the evidence input. A non-array value for this field must be treated as a parse error. Absence of the field must be detectable for subsequent validation.                                                  | SRC-0001 WS-2   | must     | draft  |
| REQ-0007 | Validator applies `isConcreteArtifactRef` to `runtimeGate.evidenceRefs` entries | `validatePrototypingEvidence()` must apply `isConcreteArtifactRef()` checks to each entry in `runtimeGate.evidenceRefs`. The checks must be the same or stricter than those applied to `iterations[].evidenceRefs.runtimeGate`.                                                                   | SRC-0001 WS-2   | must     | draft  |
| REQ-0008 | `runtimeGate.evidenceRefs` absence is a validator error                    | If `runtimeGate.evidenceRefs` is absent from the evidence, `validatePrototypingEvidence()` must add an error to its issues list. The field must not be silently skipped.                                                                                                                          | SRC-0001 WS-2   | must     | draft  |
| REQ-0009 | `runtimeGate.evidenceRefs` empty array is a validator error                | If `runtimeGate.evidenceRefs` is present but is an empty array, `validatePrototypingEvidence()` must add an error. An empty array is not a valid evidenceRefs value for full-harness UI-only output.                                                                                               | SRC-0001 WS-2   | must     | draft  |
| REQ-0010 | Each malformed form in `runtimeGate.evidenceRefs` is a validator error     | The following forms in `runtimeGate.evidenceRefs` must each individually produce a validator error: (a) absolute path, (b) self-ref (`prototyping.json#/...`), (c) synthetic token, (d) empty string, (e) directory path (no file extension).                                                     | SRC-0001 WS-2   | must     | draft  |
| REQ-0011 | Single shared helpers for ref grammar across all layers                    | `toRepoRelativeArtifactRef`, `assertConcreteArtifactRef`, and `isConcreteArtifactRef` must be the single shared helpers for ref grammar. Validators and builders must not have separate, parallel implementations of the same grammar.                                                             | SRC-0001 WS-3   | must     | draft  |
| REQ-0012 | All 5 traceability ref sites use the same grammar                          | The following 5 ref sites must all use the same grammar: `runtimeGate.evidenceRefs`, `iterations[].evidenceRefs.runtimeGate`, `iterations[].evidenceRefs.specCoverage`, `specCoverage.evidenceRefs`, `specs[].coverageRefs[].declaredRef`. Grammar must be enforced by shared helpers.           | SRC-0001 WS-3   | must     | draft  |
| REQ-0013 | `specCoverage.test.ts` includes negative cases for ref normalization       | `packages/qfai/tests/core/specCoverage.test.ts` must include: (a) test that absolute path input produces repo-relative output; (b) test that repo-outside path throws; (c) test that directory path throws; (d) test that `coverageRefs[].declaredRef` format is verified as concrete artifact ref. | SRC-0001 WS-4   | must     | draft  |
| REQ-0014 | `prototypingEvidence.test.ts` includes `runtimeGate.evidenceRefs` cases   | `packages/qfai/tests/core/prototypingEvidence.test.ts` must include test cases for: `runtimeGate.evidenceRefs` with absolute path → error; self-ref → error; synthetic token → error; field absent → error; empty array → error.                                                                  | SRC-0001 WS-4   | must     | draft  |
| REQ-0015 | `prototypingExecution.productionPath.test.ts` contains closure test        | `packages/qfai/tests/core/prototypingExecution.productionPath.test.ts` (new file) must contain: (a) at least one end-to-end test where `runPrototypingExecution()` output passes `validatePrototypingEvidence()` with zero errors; (b) at least one negative injection test where absolute path in `specCoverage` or `runtimeGate` causes validation failure. | SRC-0001 WS-4   | must     | draft  |

## Requirement Dependency Map

| REQ-ID   | Depends On               | Notes                                                                    |
|----------|--------------------------|--------------------------------------------------------------------------|
| REQ-0001 | —                        | Independent; new file `pathUtils.ts`                                     |
| REQ-0002 | REQ-0001                 | `parseSpecDeclaration()` uses `toRepoRelativeArtifactRef()` from REQ-0001 |
| REQ-0003 | REQ-0001                 | `buildSpecCoverageSummary()` input cleanup depends on helper             |
| REQ-0004 | REQ-0001, REQ-0002       | `buildPerSpecCoverage()` uses same helper as REQ-0002                   |
| REQ-0005 | —                        | Independent; type definition change                                      |
| REQ-0006 | REQ-0005                 | Parser reads the new formal type field                                   |
| REQ-0007 | REQ-0005, REQ-0006, REQ-0011 | Validator checks depend on type, parser, and shared helper           |
| REQ-0008 | REQ-0006                 | Absence detection requires parser to track field presence                |
| REQ-0009 | REQ-0006                 | Empty array detection requires parsed value                              |
| REQ-0010 | REQ-0007                 | Individual malformed form checks extend REQ-0007                         |
| REQ-0011 | REQ-0001                 | Single helper set defined in REQ-0001; REQ-0011 mandates exclusivity     |
| REQ-0012 | REQ-0011                 | Unified grammar depends on single helpers from REQ-0011                  |
| REQ-0013 | REQ-0001, REQ-0002, REQ-0004 | Tests cover helper behavior from REQ-0001..0004                     |
| REQ-0014 | REQ-0007, REQ-0008, REQ-0009, REQ-0010 | Tests cover validator behavior from WS-2 requirements      |
| REQ-0015 | REQ-0001..REQ-0014       | Closure test requires all WS-1/WS-2/WS-3 changes to be complete        |

## Traceability: REQ → US

| REQ-ID   | User Story |
|----------|------------|
| REQ-0001 | US-001     |
| REQ-0002 | US-001     |
| REQ-0003 | US-001     |
| REQ-0004 | US-001     |
| REQ-0005 | US-002     |
| REQ-0006 | US-002     |
| REQ-0007 | US-002     |
| REQ-0008 | US-002     |
| REQ-0009 | US-002     |
| REQ-0010 | US-002     |
| REQ-0011 | US-003     |
| REQ-0012 | US-003     |
| REQ-0013 | US-004     |
| REQ-0014 | US-004     |
| REQ-0015 | US-004     |
