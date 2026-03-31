# 05 Examples

## EX-0008-0001: Volume Estimate Table Output

- BR-Ref: BR-0008-0003
- Given a spec with 5 US, 3 CON-API, and 10 TC
- When TestVolumeEstimator runs
- Then the table shows: E2E Raw=5 Signal=E2E_s, API Raw=3 Signal=API_s, Integration Raw=10 Signal=INT_s

## EX-0008-0002: E2E Annotation Presence

- BR-Ref: BR-0008-0001
- Given spec-0001 with US-0001-0001
- When E2E test is generated at `tests/e2e/spec0001.test.ts`
- Then the file contains `QFAI:SPEC-0001:US-0001-0001`

## EX-0008-0003: Forbidden TC in E2E

- BR-Ref: BR-0008-0002
- Given an E2E test file `tests/e2e/spec0001.test.ts`
- When it contains `QFAI:SPEC-0001:TC-0001-0001`
- Then validation reports an error (forbidden reference)

## EX-0008-0004: API Annotation Without TC

- BR-Ref: BR-0008-0001, BR-0008-0002
- Given spec-0001 with CON-API-0001
- When API test is generated at `tests/api/spec0001.test.ts`
- Then the file contains `QFAI:CON-API-0001` and does NOT contain any `TC-` annotation

## EX-0008-0005: Reviewer Returning REVISE

- BR-Ref: BR-0008-0004
- Given ATDD output with US-0001-0002 uncovered
- When the independent Reviewer evaluates coverage
- Then the Reviewer returns REVISE with finding "US-0001-0002 missing E2E coverage"
