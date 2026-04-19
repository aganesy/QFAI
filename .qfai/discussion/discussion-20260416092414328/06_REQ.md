# 06 Requirements

## Functional Requirements

| REQ-ID   | Title                                                                                   | Description                                                                                                                                                                                                                                                                                                 | Source        | Priority | Status |
|----------|-----------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------|----------|--------|
| REQ-0001 | `runtimeGate.ui[].declaredRef` is required                                              | `validatePrototypingEvidence()` must produce an error if any `runtimeGate.ui[]` row is missing `declaredRef`. Absence of the field is not silently skipped; it is a required leaf field.                                                                                                                    | SRC-0001 §5-1 | must     | draft  |
| REQ-0002 | `runtimeGate.ui[].declaredRef` must be a concrete artifact ref                         | `validatePrototypingEvidence()` must apply `isConcreteArtifactRef()` to `declaredRef` on each `runtimeGate.ui[]` row. Absolute path, self-ref (pointing to `prototyping.json`), synthetic token, bare filename, directory path, and Windows `\\` separator must each produce a validator error.              | SRC-0001 §5-1 | must     | draft  |
| REQ-0003 | `runtimeGate.ui[].renderEvidenceRefs[]` is required and non-empty                      | `validatePrototypingEvidence()` must produce an error if `renderEvidenceRefs[]` is absent or empty on any `runtimeGate.ui[]` row.                                                                                                                                                                           | SRC-0001 §5-1 | must     | draft  |
| REQ-0004 | Each `runtimeGate.ui[].renderEvidenceRefs[i]` must be a concrete artifact ref          | `validatePrototypingEvidence()` must apply `isConcreteArtifactRef()` to each entry in `renderEvidenceRefs[]`. Any malformed entry (absolute path, synthetic token, directory path, Windows separator) is a validator error.                                                                                  | SRC-0001 §5-1 | must     | draft  |
| REQ-0005 | `runtimeGate.ui[].browserQaEvidenceRefs[]` is required and non-empty                   | `validatePrototypingEvidence()` must produce an error if `browserQaEvidenceRefs[]` is absent or empty on any `runtimeGate.ui[]` row.                                                                                                                                                                        | SRC-0001 §5-1 | must     | draft  |
| REQ-0006 | Each `runtimeGate.ui[].browserQaEvidenceRefs[i]` must be a concrete artifact ref       | `validatePrototypingEvidence()` must apply `isConcreteArtifactRef()` to each entry in `browserQaEvidenceRefs[]`. Any malformed entry is a validator error.                                                                                                                                                  | SRC-0001 §5-1 | must     | draft  |
| REQ-0007 | `fullHarness.iterations[].l1.axes[].evidenceRefs[]` is required and non-empty          | For each axis in `l1.axes[]`, `evidenceRefs[]` must be present and non-empty. Absence or empty array on any axis is a validator error.                                                                                                                                                                      | SRC-0001 §5-2 | must     | draft  |
| REQ-0008 | Each `fullHarness.iterations[].l1.axes[].evidenceRefs[i]` must be a concrete artifact ref | `validatePrototypingEvidence()` must apply `isConcreteArtifactRef()` to every entry in `l1.axes[].evidenceRefs[]`. Synthetic tokens (`"a"`, `"b"`), absolute paths, self-refs, and empty strings are each validator errors.                                                                                  | SRC-0001 §5-2 | must     | draft  |
| REQ-0009 | `fullHarness.iterations[].l2.axes[].evidenceRefs[]` is required and non-empty          | For each axis in `l2.axes[]`, `evidenceRefs[]` must be present and non-empty. Absence or empty array on any axis is a validator error.                                                                                                                                                                      | SRC-0001 §5-2 | must     | draft  |
| REQ-0010 | Each `fullHarness.iterations[].l2.axes[].evidenceRefs[i]` must be a concrete artifact ref | `validatePrototypingEvidence()` must apply `isConcreteArtifactRef()` to every entry in `l2.axes[].evidenceRefs[]`. Same grammar as REQ-0008.                                                                                                                                                                 | SRC-0001 §5-2 | must     | draft  |
| REQ-0011 | `fullHarness.reviewerLogs[].evidenceRefs[]` is required and non-empty                  | For each entry in `reviewerLogs[]`, `evidenceRefs[]` must be present and non-empty. Absence or empty array for any reviewer log entry is a validator error.                                                                                                                                                  | SRC-0001 §5-3 | must     | draft  |
| REQ-0012 | Each `fullHarness.reviewerLogs[].evidenceRefs[i]` must be a concrete artifact ref      | `validatePrototypingEvidence()` must apply `isConcreteArtifactRef()` to every entry in `reviewerLogs[].evidenceRefs[]`. Synthetic tokens (`"reviewer:1"`), absolute paths, and self-refs are each validator errors.                                                                                          | SRC-0001 §5-3 | must     | draft  |
| REQ-0013 | Leaf validation reuses `isConcreteArtifactRef()` from `pathUtils.ts`                   | All new leaf-field validation introduced in REQ-0001 through REQ-0012 must use `isConcreteArtifactRef()` from `packages/qfai/src/core/prototyping/pathUtils.ts`. No parallel concrete-ref grammar implementation may be introduced in `prototypingEvidence.ts`.                                              | SRC-0001 §3-4 | must     | draft  |
| REQ-0014 | `bundleWriter.ts` marks `runtimeGate.ui[].declaredRef` as required                     | The TypeScript type in `bundleWriter.ts` (or the shared type it uses) must mark `declaredRef` as required (not `declaredRef?: string`). Any code that omits `declaredRef` when building a `ui[]` row must be a TypeScript type error.                                                                        | SRC-0001 §5-4 | must     | draft  |
| REQ-0015 | `bundleWriter.ts` prohibits null or omit for all leaf array fields                     | `renderEvidenceRefs[]`, `browserQaEvidenceRefs[]`, `l1.axes[].evidenceRefs[]`, `l2.axes[].evidenceRefs[]`, and `reviewerLogs[].evidenceRefs[]` must be typed as required non-nullable arrays (not `undefined | null`). Runtime builders must not be able to omit these fields without a compile error.        | SRC-0001 §5-4 | must     | draft  |
| REQ-0016 | Runtime builders produce concrete leaf refs                                             | If `runtimeObservation.ts` or `runtimeGateBuilder.ts` currently can emit null, undefined, or omitted values for any leaf array field, they must be updated so that such emission is prevented (either by throwing early or by constructing the concrete ref before bundle write). Validator cannot compensate for missing builder output. | SRC-0001 §6-2-3 | must  | draft  |
| REQ-0017 | `prototypingEvidence.test.ts` includes all required leaf-field negative cases           | The test file must include: (a) all 7 `runtimeGate.ui[]` negative cases from design doc §6-3-1; (b) all 5 axis-level `evidenceRefs` negative cases from §6-3-2; (c) all 3 reviewer-level `evidenceRefs` negative cases from §6-3-3.                                                                         | SRC-0001 §5-5 | must     | draft  |
| REQ-0018 | Existing `tests/core/` fixtures replace all synthetic token evidenceRefs               | All fixtures in `packages/qfai/tests/core/` that use synthetic tokens (`"a"`, `"b"`, `"reviewer:1"`, or similar non-path strings) as `evidenceRefs` values must be replaced with repo-root relative concrete artifact refs.                                                                                  | SRC-0001 §5-5 | must     | draft  |
| REQ-0019 | Production closure test asserts leaf field concreteness                                 | `prototypingExecution.productionPath.test.ts` must include assertions verifying that the execution output's leaf fields (`runtimeGate.ui[].declaredRef`, `runtimeGate.ui[].renderEvidenceRefs[]`, `runtimeGate.ui[].browserQaEvidenceRefs[]`, `reviewerLogs[].evidenceRefs[]`, `l1/l2.axes[].evidenceRefs[]`) contain only concrete artifact refs. At least one negative injection test (inject malformed ref into leaf field → validation failure) must also be present. | SRC-0001 §5-5 | must | draft |
| REQ-0020 | README enumerates all concrete-ref leaf fields                                          | `packages/qfai/README.md` must list all fields that are under the concrete artifact ref contract, including the leaf fields added in rev9: `runtimeGate.ui[].declaredRef`, `runtimeGate.ui[].renderEvidenceRefs[]`, `runtimeGate.ui[].browserQaEvidenceRefs[]`, `l1/l2.axes[].evidenceRefs[]`, `reviewerLogs[].evidenceRefs[]`. The description must not imply that only top-level fields are validated. | SRC-0001 §5-6 | must | draft |

## Requirement Dependency Map

| REQ-ID   | Depends On                    | Notes                                                                              |
|----------|-------------------------------|------------------------------------------------------------------------------------|
| REQ-0001 | —                             | Independent; validator extension for missing declaredRef                           |
| REQ-0002 | REQ-0001, REQ-0013            | Concrete-ref check after required-check passes                                     |
| REQ-0003 | —                             | Independent; non-empty check for renderEvidenceRefs                               |
| REQ-0004 | REQ-0003, REQ-0013            | Per-entry concrete-ref check; depends on non-empty                                 |
| REQ-0005 | —                             | Independent; non-empty check for browserQaEvidenceRefs                            |
| REQ-0006 | REQ-0005, REQ-0013            | Per-entry concrete-ref check; depends on non-empty                                 |
| REQ-0007 | —                             | Independent; axis l1 non-empty check                                              |
| REQ-0008 | REQ-0007, REQ-0013            | Per-entry concrete-ref check; depends on non-empty                                 |
| REQ-0009 | —                             | Independent; axis l2 non-empty check                                              |
| REQ-0010 | REQ-0009, REQ-0013            | Per-entry concrete-ref check; depends on non-empty                                 |
| REQ-0011 | —                             | Independent; reviewerLogs non-empty check                                         |
| REQ-0012 | REQ-0011, REQ-0013            | Per-entry concrete-ref check; depends on non-empty                                 |
| REQ-0013 | —                             | Independent; reuse constraint for pathUtils.ts helpers                            |
| REQ-0014 | —                             | Independent; schema change in bundleWriter.ts                                     |
| REQ-0015 | REQ-0014                      | Leaf arrays strict schema depends on declaredRef being required first              |
| REQ-0016 | REQ-0014, REQ-0015            | Runtime builders cannot emit null/omit; schema must be strict first                |
| REQ-0017 | REQ-0001..REQ-0012            | Tests cover all validator behaviors defined in WS-1                                |
| REQ-0018 | REQ-0017                      | Fixture cleanup enables correct test execution                                     |
| REQ-0019 | REQ-0001..REQ-0016            | Closure test requires all WS-1 and WS-2 changes complete                           |
| REQ-0020 | REQ-0001..REQ-0016            | README can only be finalized after all validator/schema fields are stable          |

## Traceability: REQ → US

| REQ-ID   | User Story |
|----------|------------|
| REQ-0001 | US-001     |
| REQ-0002 | US-001     |
| REQ-0003 | US-001     |
| REQ-0004 | US-001     |
| REQ-0005 | US-001     |
| REQ-0006 | US-001     |
| REQ-0007 | US-002     |
| REQ-0008 | US-002     |
| REQ-0009 | US-002     |
| REQ-0010 | US-002     |
| REQ-0011 | US-003     |
| REQ-0012 | US-003     |
| REQ-0013 | US-001, US-002, US-003 |
| REQ-0014 | US-004     |
| REQ-0015 | US-004     |
| REQ-0016 | US-004     |
| REQ-0017 | US-005     |
| REQ-0018 | US-005     |
| REQ-0019 | US-005     |
| REQ-0020 | US-005     |
