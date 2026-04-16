# 01 Context

## UI-bearing Classification

- ui_bearing: false
- primary_surface: non-ui
- secondary_surfaces: (none)
- classification_rationale: The subject matter is `packages/qfai` internal library code — TypeScript validator (`prototypingEvidence.ts`), bundle writer (`bundleWriter.ts`), optional builders (`runtimeObservation.ts`, `runtimeGateBuilder.ts`), and test files. No user-facing UI screens exist. Changes are purely internal: leaf-field concrete artifact ref validation enforcement across `runtimeGate.ui[]`, axis-level `evidenceRefs[]`, and `reviewerLogs[].evidenceRefs[]`. No screen contracts, wireframes, or visual design artifacts are involved.

## Metadata

| Key                 | Value                                                                          |
| ------------------- | ------------------------------------------------------------------------------ |
| Discussion ID       | discussion-20260416092414328                                                   |
| Date                | 2026-04-16                                                                     |
| Owner               | agent                                                                          |
| Source              | qfai_v1_7_15_packages_qfai_single_pr_completion_design_rev9.md                 |
| Upstream discussion | discussion-20260416023323603 (rev8 — provides baseline; do not duplicate)      |

## Goal and Completion Criteria

- **Goal**: Complete the final leaf-field traceability closure for `packages/qfai` v1.7.15 in a single PR. Rev8 closed top-level summary fields (`specCoverage.evidenceRefs`, `runtimeGate.evidenceRefs`). Rev9 closes the three remaining leaf-field blind spots: (1) `runtimeGate.ui[]` row-level fields (`declaredRef` required + concrete, `renderEvidenceRefs[]` non-empty + concrete, `browserQaEvidenceRefs[]` non-empty + concrete); (2) axis-level `evidenceRefs[]` fields (`fullHarness.iterations[].l1/l2.axes[].evidenceRefs[]`); (3) reviewer-level `evidenceRefs[]` fields (`fullHarness.reviewerLogs[].evidenceRefs[]`).

- **Measurable completion criteria** (DoD conditions from design doc §5):
  1. `runtimeGate.ui[].declaredRef` is required and validated as a concrete artifact ref; its absence or malformed value is a validator error.
  2. `runtimeGate.ui[].renderEvidenceRefs[]` is required, non-empty, and all entries validated as concrete artifact refs.
  3. `runtimeGate.ui[].browserQaEvidenceRefs[]` is required, non-empty, and all entries validated as concrete artifact refs.
  4. `fullHarness.iterations[].l1.axes[].evidenceRefs[]` and `l2.axes[].evidenceRefs[]` are required, non-empty, and fully validated as concrete artifact refs.
  5. `fullHarness.reviewerLogs[].evidenceRefs[]` is required, non-empty, and fully validated as concrete artifact refs.
  6. Bundle schema (`bundleWriter.ts`) reflects required/strict contract for all leaf fields; no optional mismatch with validator.
  7. All leaf-field negative regression tests pass; no synthetic token fixtures remain in `tests/core/`.
  8. README description matches validator implementation (no partial-strictness gap).

## Stakeholders

- **Primary**: QFAI package maintainers; implementors working on the v1.7.15 PR
- **Secondary**: QFAI downstream users (informed via conditional README update)

## Background

- **Audit context**: The v1.7.15-09 audit (`qfai_v1_7_15_09_packages_qfai_audit_report.md`) confirmed that rev8 closed top-level summary fields but leaf fields remain unvalidated. Rev9 targets only the `packages/qfai` leaf-field traceability closure.
- **Technical context**: Rev8 established `pathUtils.ts` helpers (`isConcreteArtifactRef`, `toRepoRelativeArtifactRef`, `assertConcreteArtifactRef`), specCoverage ref normalization, runtimeGate.evidenceRefs top-level validation, and the execution→validate closure test. Rev9 reuses these helpers without modification and extends validator coverage to three previously unchecked leaf field groups.
- **Key principle (from design doc §0/§3-2)**: 後方互換は完全に捨てる。Backward compatibility is explicitly and completely abandoned.

## Inputs

- Existing repository facts: `packages/qfai/src/core/validators/prototypingEvidence.ts`, `packages/qfai/src/core/evidence/bundleWriter.ts`, `packages/qfai/src/core/prototyping/runtimeObservation.ts`, `packages/qfai/src/core/prototyping/runtimeGateBuilder.ts`, `packages/qfai/tests/core/`
- External references: Design document rev9 (SRC-0001), v1.7.15-09 audit report (SRC-0002), canonical unified requirements spec (SRC-0003), upstream rev8 discussion (SRC-0004)
- Assumptions: Backward compatibility is explicitly abandoned. `pathUtils.ts` helpers from rev8 exist and are reused. `runtimeGate.ui[]` structure already parsed by validator; validation only extended, not restructured. Single PR delivery. `packHash` remains deferred (carry-forward from rev7 OQ-0001).

## Key Issues

- **Issue 1 (WS-1 / runtimeGate.ui[])**: The validator currently parses `runtimeGate.ui[]` rows for structure (screen-level ledger entries) but does NOT enforce that `declaredRef` is present and a concrete artifact ref. `renderEvidenceRefs[]` and `browserQaEvidenceRefs[]` are accepted as plain string arrays without concrete-ref checks. This means synthetic tokens, absolute paths, or missing refs pass undetected at screen level.
- **Issue 2 (WS-1 / axis-level)**: `fullHarness.iterations[].l1.axes[].evidenceRefs[]` and `l2.axes[].evidenceRefs[]` are parsed as string arrays but not validated against the concrete-ref grammar. Synthetic tokens such as `"a"` or `"b"` in existing test fixtures pass without error.
- **Issue 3 (WS-1 / reviewerLogs[])**: `fullHarness.reviewerLogs[].evidenceRefs[]` is parsed but not validated against the concrete-ref grammar. Synthetic tokens such as `"reviewer:1"` in existing test fixtures pass without error.
- **Issue 4 (WS-2)**: `bundleWriter.ts` schema marks `runtimeGate.ui[].declaredRef` as optional (`?`) and leaf arrays as loosely typed, diverging from the validator's intended required/strict contract. Runtime builders can emit null or omitted leaf fields that would then fail the validator, introducing a builder/validator contract gap.
- **Issue 5 (WS-3)**: Existing test fixtures in `tests/core/` use synthetic tokens (`"a"`, `"b"`, `"reviewer:1"`) in `evidenceRefs` fields. These must be replaced with concrete artifact refs, and new negative cases must be added for each leaf field malformed form.
- **Issue 6 (WS-4)**: README documentation describing the traceability ref contract is incomplete — it does not enumerate the leaf fields now brought under the concrete-ref contract.
