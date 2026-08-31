# 06 Test Cases

## TC-0008-0001: Volume Estimate Produces Signal Table

- EX-Ref: EX-0008-0001
- AC-Refs: AC-0008-0001
- Verify that TestVolumeEstimator produces a table with E2E/API/Integration rows containing Raw count, Signal, Evidence, and Notes columns.

## TC-0008-0002: E2E Tests Cover All Required US

- EX-Ref: EX-0008-0002
- AC-Refs: AC-0008-0002
- Verify that every required US declared in the spec has a corresponding E2E test with the correct annotation.

## TC-0008-0003: API Tests Cover All Required CON-API

- EX-Ref: EX-0008-0004
- AC-Refs: AC-0008-0003
- Verify that every required CON-API has a corresponding API test with annotation and zero TC references.

## TC-0008-0004: Integration Tests Cover All Required TC

- EX-Ref: EX-0008-0002
- AC-Refs: AC-0008-0004
- Verify that every required TC has a corresponding Integration test with the correct annotation.

## TC-0008-0005: Forbidden TC Annotations Detected

- EX-Ref: EX-0008-0003
- AC-Refs: AC-0008-0005
- Verify that TC annotations in E2E and API test files are detected and reported as errors.

## TC-0008-0006: Stage Gates Not Skipped

- EX-Ref: EX-0008-0005
- AC-Refs: AC-0008-0006
- Verify that all stage gates P0-P8 are evaluated in order and produce evidence.

## TC-0008-0007: Evidence File Contains Required Sections

- EX-Ref: EX-0008-0001
- AC-Refs: AC-0008-0007
- Verify that the evidence file includes all mandatory sections.

## TC-0008-0008: Reviewer Independence Enforced

- EX-Ref: EX-0008-0005
- AC-Refs: AC-0008-0008
- Verify that the Reviewer is a separate agent from implementers and returns only PASS or REVISE.

## TC-0008-0009: Coverage Placeholder for EX-0008-0006

- EX-Ref: EX-0008-0006
- AC-Refs: AC-0008-0001
- Verify that migrated example EX-0008-0006 is covered by at least one test case.

## TC-0008-0010: Coverage Placeholder for EX-0008-0007

- EX-Ref: EX-0008-0007
- AC-Refs: AC-0008-0001
- Verify that migrated example EX-0008-0007 is covered by at least one test case.

## TC-0008-0011: Coverage Depth Matrix Produced and Verified

- EX-Ref: EX-0008-0008
- AC-Refs: AC-0008-0009
- Type: normal
- Verify that the test-design-analyst produces a Coverage Depth Matrix with columns for normal/error/boundary/special/state-transition/combinatorial per US/TC.

## TC-0008-0012: Normal-Path-Only Flagged as Incomplete

- EX-Ref: EX-0008-0008
- AC-Refs: AC-0008-0009
- Type: error
- Verify that a US/TC with only normal-path test cases is flagged as incomplete in the Coverage Depth Matrix and triggers REVISE.

## TC-0008-0013: Scaffold Emits Per-TC Skeleton with TODO and Refs

- EX-Ref: EX-0008-0009
- AC-Refs: AC-0008-0010
- Type: normal
- Verify that `qfai atdd scaffold --spec spec-NNNN` against an empty target dir emits `tests/atdd/spec-NNNN/<TC-ID>.test.*` per TC, each importing the test framework, containing `// TODO: implement assertion for <TC-ID>`, and referencing related `US-*` / `CON-API-*` in comments; and that `qfai validate` emits `D-SCAFFOLD-PLACEHOLDER` (warning) for each unfilled file.

## TC-0008-0014: Scaffold Idempotency and 3-Cycle Escalation

- EX-Ref: EX-0008-0010
- AC-Refs: AC-0008-0011
- Type: error
- Verify that re-running scaffold does NOT overwrite a skeleton whose TODO was replaced with a real assertion (idempotent boundary), and that a skeleton retaining its `// TODO: implement assertion for <TC-ID>` marker across 3 `qfai validate` cycles (default `atdd.scaffoldEscalateCycles: 3` per DR-0272) escalates `D-SCAFFOLD-PLACEHOLDER` from warning to error on the 3rd cycle.

## TC-0008-0015: Seven Rules and Companion Rule Stated and Linked

- EX-Ref: EX-0008-0011
- AC-Refs: AC-0008-0012
- Type: normal
- Level: integration
- Verify that the `/qfai-atdd` credential-reuse guidance artifact states all seven session-reuse rules as distinct statements plus the companion caller-injected-environment rule, and that the skill entry point cross-links the artifact.

## TC-0008-0016: Guidance Names No Browser Backend

- EX-Ref: EX-0008-0012
- AC-Refs: AC-0008-0013
- Type: error
- Level: integration
- Verify that a deny-list scan of the guidance artifact for browser-backend names, install commands and version pins returns zero matches, and that the same scan reports a non-zero count against a fixture with a planted backend name — so a green result is a checked result rather than a vacuous one.

## TC-0008-0017: Guidance Adds No Layer, Token, Finding Code or Validator

- EX-Ref: EX-0008-0012
- AC-Refs: AC-0008-0013
- Type: boundary
- Level: integration
- Verify that with the guidance artifact present the layer token set, the allowed annotation forms and the ATDD finding-code set are unchanged from baseline, and that the artifact itself contains no `QFAI:`-form annotation token, no finding code and no new layer heading.

## TC-0008-0018: Script-Naming Rule Is Adopter-Only and Excludes Unit/Component

- EX-Ref: EX-0008-0013
- AC-Refs: AC-0008-0014
- Type: boundary
- Level: integration
- Verify that the guidance records the credential-class script-naming rule as adopter guidance, states that QFAI keeps its own script names and that its own suite has zero credentials, and that its scope statement obliges E2E / API / Integration only with no unit or component obligation.
