# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                    | Expected                                                                                                                                                             |
| --------------- | --------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0181-01 | AC-0001-0181-01 | Research fetches page containing "API-KEY: sk-abc123def456" in body text | Session log records content hash but NOT the literal API key; sanitized log has `[REDACTED]`                                                                         |
| EX-0001-0181-02 | AC-0001-0181-01 | Research session completes with 3 searches, 5 fetches, 2 verifications   | Log contains: `query` with 3 search queries, `sources` with 5 URLs and 5 content hashes, `stages` with 5 sanitization events and 2 verification results, `citations` |
