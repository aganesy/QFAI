# 06 Test Cases

## Purpose

- Verify examples and acceptance criteria with explicit refs.
- Include both `AC-Refs` and `EX-Ref` whenever possible.

## Test Case Table (required)

| TC-ID   | Level | AC-Refs           | EX-Ref  | Steps                                                                  | Expected                                                | Notes              |
| ------- | ----- | ----------------- | ------- | ---------------------------------------------------------------------- | ------------------------------------------------------- | ------------------ |
| TC-0029-0001 | L3    | AC-0029-0001           | EX-0029-0001 | Create mock provider, call request(), validate response structure      | Response matches CritiqueResponse schema                | Interface contract |
| TC-0029-0002 | L3    | AC-0029-0001, AC-0029-0005  | EX-0029-0002 | Create provider returning invalid response, call request()             | Schema validation fails, fail-open returned             | Validation path    |
| TC-0029-0003 | L3    | AC-0029-0002, AC-0029-0003  | EX-0029-0003 | Configure generic command provider, send request with metacharacters   | Arguments sanitized, command executed safely             | Security test      |
| TC-0029-0004 | L3    | AC-0029-0004           | EX-0029-0004 | Create provider that throws network error, call request()              | Fail-open response, warning logged                      | Error handling     |
| TC-0029-0005 | L3    | AC-0029-0006           | EX-0029-0005 | Configure 30s timeout, create slow provider (45s), call request()      | Request aborted at 30s, fail-open triggered             | Timeout test       |
| TC-0029-0006 | L3    | AC-0029-0007           | EX-0029-0006 | List example providers from distribution                               | At least 2 providers available and conform to interface | Distribution check |
| TC-0029-0007 | L3    | AC-0029-0008           | EX-0029-0007 | Simulate provider state change across iterations                       | Fail-open at failure point, recovery when available     | State transition   |
| TC-0029-0008 | L3    | AC-0029-0004, AC-0029-0006  | EX-0029-0008 | Trigger fail-open events and verify log entries                        | Log contains provider name, reason, iteration number   | Observability      |
