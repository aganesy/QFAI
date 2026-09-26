# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                    | Expected                                                                                                    |
| --------------- | --------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| EX-0001-0188-01 | AC-0001-0188-01 | Research fetches page containing "API-KEY: sk-abc123def456" in body text | Session log records content hash but NOT the literal API key; sanitized log has `[REDACTED]`                |
| EX-0001-0188-02 | AC-0001-0188-01 | Research session completes with 3 searches, 5 fetches, 2 verifications   | Log contains: queries[3], urls[5], hashes[5], sanitization_events[5], verification_results[2], citations[N] |
