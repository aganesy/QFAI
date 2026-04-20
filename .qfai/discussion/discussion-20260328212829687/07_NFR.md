# 07_NFR

## Non-Functional Requirements

| NFR-ID   | Category        | Title                       | Description                                                                                        | Measurable Target                                      | Source                       |
| -------- | --------------- | --------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------- |
| NFR-0001 | Security        | Prompt Injection Resistance | Sanitization layer must block known prompt injection vectors embedded in web content               | 100% block rate against OWASP LLM injection test suite | SRC-0008                     |
| NFR-0002 | Security        | Secret Non-Exposure         | API keys and credentials must never appear in research logs, citations, or agent output            | Zero credential exposure events in audit               | SRC-0001                     |
| NFR-0003 | Security        | Sandbox Default-Deny        | All network access must be denied by default; only explicitly allowlisted domains permitted        | Zero unauthorized domain access events                 | SRC-0002, SRC-0004           |
| NFR-0004 | Performance     | Search Latency              | Search stage should complete within 5 seconds for standard queries (excluding network variability) | p95 < 5s                                               | SRC-0005                     |
| NFR-0005 | Performance     | Fetch+Extract Latency       | Fetch and extract stages combined should complete within 15 seconds per URL                        | p95 < 15s per URL                                      | SRC-0006                     |
| NFR-0006 | Reliability     | MCP Failure Recovery        | Agent must detect MCP server crash and fall back to built-in tools within 10 seconds               | Recovery time < 10s                                    | SRC-0001                     |
| NFR-0007 | Reliability     | Rate Limit Compliance       | Agent must respect all rate limit headers and never exceed API provider limits                     | Zero rate limit violations after initial 429           | SRC-0005, SRC-0014           |
| NFR-0008 | Maintainability | Configuration Portability   | Configuration templates must be valid for at least 2 of 3 major CLI agents without modification    | 2/3 CLI agent compatibility per template               | SRC-0002, SRC-0003, SRC-0004 |
| NFR-0009 | Observability   | Research Audit Trail        | Every research session must produce a structured log with all mandatory fields populated           | 100% log completeness for completed sessions           | SRC-0001                     |
| NFR-0010 | Usability       | Setup Time                  | Initial MCP setup (search + extract) should complete within 15 minutes following QFAI templates    | Setup time < 15min for experienced developer           | SRC-0001                     |
| NFR-0011 | Compatibility   | Node.js Version             | MCP server configurations must support Node 18+ (minimum) and Node 22+ (recommended)               | Tested on Node 18 LTS and Node 22 LTS                  | SRC-0005                     |
| NFR-0012 | Compliance      | OWASP LLM Top 10            | Security measures must address OWASP Top 10 for LLM Applications 2025 Prompt Injection category    | Documented mitigation for each applicable item         | SRC-0008                     |
