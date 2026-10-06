# CLI-0017: Research Protocol

## Ownership boundary

This contract decides the behaviour of the `web-research` skill's source and
citation pipeline that can be checked without a particular search provider:
the order of its stages, what each stage hands on, how fetched content is
sanitized, which network access is allowed, what the session log holds, how
results are cached, and where a person approves a step.

The skill owns its tool-specific instructions and its cache format. It adds no
`qfai` command; the commands QFAI ships are decided by their own contracts.

## Business rules

| BR-ID | Statement | Examples |
| --- | --- | --- |
| BR-0017-0001 | Pipeline MUST execute stages in order: search→rank→fetch→extract→sanitize→cache→verify→cite. Skipping stages is not allowed. | EX-0001-0176-01 |
| BR-0017-0002 | Each pipeline stage MUST produce a defined output or an explicit failure. Failure in one stage MUST NOT silently propagate. | EX-0001-0176-02 |
| BR-0017-0003 | When search returns zero results, the agent MUST report the searched queries and MUST NOT generate fictional citations. | EX-0001-0176-03 |
| BR-0017-0004 | MCP configuration MUST support both stdio and HTTP transport modes. SSE transport is deprecated and MUST NOT be used. | EX-0001-0177-01, EX-0001-0177-02, EX-0001-0177-07 |
| BR-0017-0005 | Agent MUST detect MCP server crash within 10 seconds and initiate fallback to built-in tools. | EX-0001-0177-03 |
| BR-0017-0006 | Agent MUST respect retry-after header values. Agent MUST NOT exceed API provider rate limits after initial 429 detection. | EX-0001-0177-04 |
| BR-0017-0007 | SKILL.md MUST be loaded metadata-first (YAML frontmatter only). Full body MUST be deferred until task execution begins. Invalid YAML frontmatter reports a parse error and activates the documented default research behavior until corrected. | EX-0001-0178-01, EX-0001-0178-02 |
| BR-0017-0008 | Sanitizer MUST remove: (a) control characters, (b) aria-hidden elements, (c) display:none elements. MUST NOT use ML-based detection. | EX-0001-0179-01, EX-0001-0179-02, EX-0001-0179-03, EX-0001-0179-05 |
| BR-0017-0009 | Sanitizer MUST be stateless. Same input MUST produce identical output on repeated invocations. | EX-0001-0179-04 |
| BR-0017-0010 | All network access MUST be denied by default. Only explicitly allowlisted domains are permitted. | EX-0001-0180-01, EX-0001-0180-03, EX-0001-0180-04 |
| BR-0017-0011 | Redirect targets MUST be validated against the allowlist at each redirect hop. Non-allowlisted redirect target MUST be blocked. | EX-0001-0180-02, EX-0001-0180-05 |
| BR-0017-0012 | Research logs MUST NOT contain API keys, credentials, or other secrets, even if present in raw fetched content. | EX-0001-0181-01 |
| BR-0017-0013 | Research session log MUST contain: search queries, fetched URLs, content hashes, sanitization events, verification results, final citations. | EX-0001-0181-02 |
| BR-0017-0014 | Evaluation framework MUST define metrics (citation precision, coverage, freshness, security hygiene) without mandating a specific evaluation tool. | EX-0001-0182-01 |
| BR-0017-0015 | HITL gates MUST use risk-based granularity: auto-approve low-risk, gate high-risk only. Per-fetch approval is prohibited. | EX-0001-0183-01, EX-0001-0183-02 |
| BR-0017-0016 | Security-critical HITL gates MUST NOT be bypassable by --yolo or similar flags. | EX-0001-0183-03 |
| BR-0017-0017 | Cache key MUST be hash(URL+etag). Both raw and cleaned content MUST be stored. Default staleness threshold is 24 hours, configurable. | EX-0001-0176-04, EX-0001-0176-05, EX-0001-0176-07 |
| BR-0017-0018 | Research sub-agents MUST use conservative defaults: max_threads=2, max_depth=2. Explicit opt-in required for higher values. | EX-0001-0176-06 |
| BR-0017-0019 | MCP configuration templates MUST be valid for at least 2 of 3 major CLI agents without modification. | EX-0001-0177-05 |
| BR-0017-0020 | Configuration MUST document both hosted URL and local npx deployment modes. Local deployment MUST be recommended for sensitive environments. | EX-0001-0177-06 |
