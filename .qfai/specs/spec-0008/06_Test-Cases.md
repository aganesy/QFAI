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
