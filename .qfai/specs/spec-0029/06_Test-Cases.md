# 06 Test Cases

## Purpose

- Verify examples and acceptance criteria with explicit refs.
- Include both `AC-Refs` and `EX-Ref` whenever possible.

## Test Case Table (required)

| TC-ID        | Level | AC-Refs                    | EX-Ref       | Steps                                                                | Expected                                                | Notes              |
| ------------ | ----- | -------------------------- | ------------ | -------------------------------------------------------------------- | ------------------------------------------------------- | ------------------ |
| TC-0029-0001 | L3    | AC-0029-0001               | EX-0029-0001 | Create mock provider, call request(), validate response structure    | Response matches CritiqueResponse schema                | Interface contract |
| TC-0029-0002 | L3    | AC-0029-0001, AC-0029-0005 | EX-0029-0002 | Create provider returning invalid response, call request()           | Schema validation fails, fail-open returned             | Validation path    |
| TC-0029-0003 | L3    | AC-0029-0002, AC-0029-0003 | EX-0029-0003 | Configure generic command provider, send request with metacharacters | Arguments sanitized, command executed safely            | Security test      |
| TC-0029-0004 | L3    | AC-0029-0004               | EX-0029-0004 | Create provider that throws network error, call request()            | Fail-open response, warning logged                      | Error handling     |
| TC-0029-0005 | L3    | AC-0029-0006               | EX-0029-0005 | Configure 30s timeout, create slow provider (45s), call request()    | Request aborted at 30s, fail-open triggered             | Timeout test       |
| TC-0029-0006 | L3    | AC-0029-0007               | EX-0029-0006 | List example providers from distribution                             | At least 2 providers available and conform to interface | Distribution check |
| TC-0029-0007 | L3    | AC-0029-0008               | EX-0029-0007 | Simulate provider state change across iterations                     | Fail-open at failure point, recovery when available     | State transition   |
| TC-0029-0008 | L3    | AC-0029-0004, AC-0029-0006 | EX-0029-0008 | Trigger fail-open events and verify log entries                      | Log contains provider name, reason, iteration number    | Observability      |
| TC-0029-0009 | L3    | AC-0029-0009               | EX-0029-0009 | Configure critique adapter with 3-layer model; evaluate sample input; inspect response keys      | Response contains invariant, trendDerived, productSpecific; no legacy axis keys present         | 3-layer output verification  |
| TC-0029-0010 | L3    | AC-0029-0010               | EX-0029-0010 | Provide calibration pack referencing undeclared axis "delight"; run validation                  | Validation fails with error naming the undeclared axis; evaluation does not proceed              | Undeclared axis rejection    |
| TC-0029-0011 | L3    | AC-0029-0011               | EX-0029-0011 | Set score exactly equal to layer boundary threshold; run layer assignment twice                   | Both runs return identical layer assignment; boundary rule documented and consistent             | Boundary determinism         |
| TC-0029-0012 | L3    | AC-0029-0012               | EX-0029-0012 | Supply legacy 4-axis scores; run migration to 3-layer; verify output and count                   | All input values mapped to 3-layer output; no score data dropped; migration log confirms count  | Migration without data loss  |
| TC-0029-0013 | L3    | AC-0029-0013               | EX-0029-0013 | Evaluate the same input twice with identical 3-layer configuration                               | Both results have identical layer assignments and score values; no variance between runs        | Idempotent evaluation        |
| TC-0029-0014 | L3    | AC-0029-0009               | EX-0029-0014 | Update scoring rubric without spec delta or DR reference; attempt to deploy                      | Deployment gate rejects change; error references missing traceability entry                     | Rubric change traceability   |
