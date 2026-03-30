# 06 Test Cases

## Purpose

- Verify examples and acceptance criteria with explicit refs.
- Include both `AC-Refs` and `EX-Ref` whenever possible.

## Test Case Table (required)

| TC-ID        | Level | AC-Refs                    | EX-Ref       | Steps                                                                           | Expected                                                                                                | Notes                          |
| ------------ | ----- | -------------------------- | ------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------ |
| TC-0036-0001 | L3    | AC-0036-0001               | EX-0036-0004 | Inspect prototyping.ts render evidence path; invoke CLI render evidence command | No "not implemented in this slice" text in source or output; capture logic executes                     | Placeholder removal            |
| TC-0036-0002 | L3    | AC-0036-0002               | EX-0036-0001 | Mock capture environment as available; invoke render evidence                   | Result has status "captured" and contains evidence data                                                 | Capture mock: happy path       |
| TC-0036-0003 | L3    | AC-0036-0003               | EX-0036-0002 | Mock capture environment as unavailable; invoke render evidence                 | Result has status "skipped", non-empty reason string, and non-empty alternative string                  | Skip reason test               |
| TC-0036-0004 | L3    | AC-0036-0004               | EX-0036-0003 | Mock 3 capture targets: 2 succeed, 1 times out; invoke render evidence          | Result has status `failed` and contains capturedItems (length 2) and failedItems (length 1) with reason | Mixed capture failure test     |
| TC-0036-0005 | L3    | AC-0036-0005, AC-0036-0008 | EX-0036-0005 | Provide valid URL; execute browser QA smoke phase                               | Findings array is non-empty; each finding has selector, issue, severity, suggestion fields              | Smoke findings test            |
| TC-0036-0006 | L3    | AC-0036-0007               | EX-0036-0006 | Invoke browser QA runner with undefined URL                                     | Structured error returned with type "error" and message indicating URL required                         | No-URL error test              |
| TC-0036-0007 | L3    | AC-0036-0006               | EX-0036-0007 | Provide valid URL; execute browser QA visual phase                              | Visual findings array is non-empty; each finding has selector, issue, severity, suggestion fields       | Visual findings test (should)  |
| TC-0036-0008 | L3    | AC-0036-0003               | EX-0036-0009 | Mock headless environment; invoke render evidence                               | Result includes alternative suggestion string that is actionable                                        | Alternative suggestion fixture |
| TC-0036-0009 | L3    | AC-0036-0005               | EX-0036-0008 | Invoke browser QA for non-web project without applicable URL                    | Structured error indicating n/a skip; not an empty findings array                                       | Non-web project fixture        |
| TC-0036-0010 | L3    | AC-0036-0006               | EX-0036-0010 | Provide valid URL; execute browser QA visual phase; inspect finding structure   | Each visual finding contains selector, issue, severity, suggestion fields matching BR-0036-0007         | Visual finding structure test  |

## Fixture Summary

- Render evidence: 4 test cases (TC-0036-0001 to TC-0036-0004) covering placeholder removal, capture success, skip with reason, mixed capture failure detail
- Browser QA: 5 test cases (TC-0036-0005 to TC-0036-0009) covering smoke findings, no-URL error, visual findings, alternative suggestion, non-web skip
- Minimum 3 fixtures per functional path satisfied: render evidence (4), browser QA smoke (3), browser QA visual (2)
