# 05 Examples

## EX-0008-0001: Volume Estimate Table Output

- BR-Ref: BR-0008-0003
- Given a spec with 5 US, 3 CON-API, and 10 TC
- When TestVolumeEstimator runs
- Then the table shows: E2E Raw=5 Signal=E2E_s, API Raw=3 Signal=API_s, Integration Raw=10 Signal=INT_s

## EX-0008-0002: E2E Annotation Presence

- BR-Ref: BR-0008-0001
- Given 対象 spec with US-0001-0001
- When E2E test is generated at `tests/e2e/spec0001.test.ts`
- Then the file contains `QFAI:SPEC-0001:US-0001-0001`

## EX-0008-0003: Forbidden TC in E2E

- BR-Ref: BR-0008-0002
- Given an E2E test file `tests/e2e/spec0001.test.ts`
- When it contains `QFAI:SPEC-0001:a TC annotation`
- Then validation reports an error (forbidden reference)

## EX-0008-0004: API Annotation Without TC

- BR-Ref: BR-0008-0001, BR-0008-0002
- Given 対象 spec with CON-API-0001
- When API test is generated at `tests/api/spec0001.test.ts`
- Then the file contains `QFAI:CON-API-0001` and does NOT contain any `TC-` annotation

## EX-0008-0005: Reviewer Returning REVISE

- BR-Ref: BR-0008-0004
- Given ATDD output with US-0001-0002 uncovered
- When the independent Reviewer evaluates coverage
- Then the Reviewer returns REVISE with finding "US-0001-0002 missing E2E coverage"

## EX-0008-0006: Coverage Placeholder for BR-0008-0005

- BR-Ref: BR-0008-0005
- Given the consolidated rule BR-0008-0005
- When layer coverage is evaluated
- Then at least one example exists for BR-0008-0005

## EX-0008-0007: Coverage Placeholder for BR-0008-0006

- BR-Ref: BR-0008-0006
- Given the consolidated rule BR-0008-0006
- When layer coverage is evaluated
- Then at least one example exists for BR-0008-0006

## EX-0008-0008: Coverage Depth Matrix Output

- BR-Ref: BR-0008-0007
- Given a spec with US-0001-0001 (normal-path test only) and US-0001-0002 (normal + error tests)
- When the test-design-analyst produces the Coverage Depth Matrix
- Then US-0001-0001 shows ❌ for Error path and the overall Status is incomplete
- And US-0001-0002 shows ✅ for Normal and Error paths
