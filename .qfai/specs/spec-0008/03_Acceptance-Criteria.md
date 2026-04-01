# 03 Acceptance Criteria

## AC-0008-0001: Volume Estimate Table

Given a spec with US/TC/CON-API declarations, when the TestVolumeEstimator runs, then a signal table with Raw count, Signal, Evidence, and Notes columns is produced for E2E/API/Integration layers.

## AC-0008-0002: E2E Coverage Obligation

Given required US declarations in a spec, when ATDD E2E implementer runs, then every required US has a corresponding E2E test file under `tests/e2e/**` with `QFAI:SPEC-XXXX:US-YYYY` annotation.

## AC-0008-0003: API Coverage Obligation

Given required CON-API declarations, when ATDD API implementer runs, then every required CON-API has a corresponding API test file under `tests/api/**` with `QFAI:CON-API-XXXX` annotation and zero TC annotations.

## AC-0008-0004: Integration Coverage Obligation

Given required TC declarations in a spec, when ATDD Integration implementer runs, then every required TC has a corresponding Integration test file under `tests/integration/**` with `QFAI:SPEC-XXXX:TC-YYYY` annotation.

## AC-0008-0005: Forbidden Reference Enforcement

Given generated E2E and API test files, when the Reviewer checks them, then zero `QFAI:SPEC-XXXX:TC-YYYY` annotations exist in `tests/e2e/**` or `tests/api/**`.

## AC-0008-0006: Stage Gate Enforcement

Given the ATDD workflow, when all stage gates P0-P8 are evaluated, then no gate is skipped and each gate produces a PASS/FAIL result with evidence.

## AC-0008-0007: Evidence File Completeness

Given ATDD completion, when the evidence file is checked, then it contains all required sections: Objective, Inputs, Decisions, Work performed, Commands, Volume estimate, Coverage checklist, Work Orders, Execution logs, Gaps, Final status.

## AC-0008-0008: Reviewer Independence

Given the ATDD workflow, when the Reviewer gate runs, then the Reviewer is a different agent than the test implementers and returns only PASS or REVISE.

## AC-0008-0009: Coverage Depth Matrix Verification

Given test cases produced by ATDD, when the test-design-analyst reviews them, then a Coverage Depth Matrix is produced for each spec showing normal/error/boundary/special/state-transition/combinatorial coverage per US/TC, and any US/TC with only normal-path test cases is flagged as incomplete.
