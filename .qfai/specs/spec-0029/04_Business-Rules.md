# 04 Business Rules

## Purpose

- Decompose AC into explicit business rules.
- Every BR must reference one or more AC IDs.

## Rule Table (required)

| BR-ID   | Title                         | AC-Refs           | Rule                                                                                         | Notes                                                     | NFR-Refs |
| ------- | ----------------------------- | ----------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------- |
| BR-0029-0001 | Provider interface schema     | AC-0029-0001           | Provider must implement `request(input: CritiqueInput): Promise<CritiqueResponse>` interface | CritiqueResponse has scores, dimensions, suggestions      |          |
| BR-0029-0002 | Response validation           | AC-0029-0001, AC-0029-0005  | All provider responses must be validated against the structured critique schema before use    | Invalid responses trigger fail-open                       | NFR-0002 |
| BR-0029-0003 | Command argument sanitization | AC-0029-0002, AC-0029-0003  | Generic command provider must escape/sanitize all arguments before shell execution            | Prevent command injection attacks                         | NFR-0006 |
| BR-0029-0004 | Fail-open on provider error   | AC-0029-0004, AC-0029-0005  | Any provider error (network, parse, timeout) must result in fail-open, never hard error      | Log warning, continue without critique                    | NFR-0002 |
| BR-0029-0005 | Timeout enforcement           | AC-0029-0006           | Provider calls must have a configurable timeout (default: 30s); exceeded timeout = unavailable | Prevents indefinite hangs                                |          |
| BR-0029-0006 | Example provider count        | AC-0029-0007           | At least 2 example providers must be included in the distribution                            | Demonstrates interface usage                              |          |
| BR-0029-0007 | Provider state independence   | AC-0029-0008           | Each iteration's critique request is independent; prior provider state does not affect current | Stateless request model                                  |          |
| BR-0029-0008 | Fail-open logging             | AC-0029-0004, AC-0029-0006  | Every fail-open event must be logged with: provider name, failure reason, iteration number   | Observability of failures                                 |          |
