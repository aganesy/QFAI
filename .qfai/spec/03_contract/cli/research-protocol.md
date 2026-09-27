# Research Protocol Contract

- Contract scope: the `web-research` skill's source and citation pipeline
- Owning flow: `BF-0001`
- Used-by: `web-research` and research reviewers

## Ownership boundary

The research pipeline searches, ranks, fetches, extracts, sanitizes, caches,
verifies, and cites in that order. Each stage produces a defined output or an
explicit failure; a failed stage does not silently become a citation. A zero
result search reports the attempted queries and produces no invented source.
External content is treated as untrusted input and sanitized before it can be
used as evidence. Transport failure and provider rate limits are handled at
their boundary before fallback or retry.

The skill owns tool-specific instructions and its cache format. This contract
owns the cross-stage behavior that can be checked independently of a search
provider. It does not declare a new `qfai` CLI command.

## Rules

| BR-ID   | Statement                                                                                                                                                                                                                                      | Examples                                                           |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| BR-0363 | Pipeline MUST execute stages in order: search→rank→fetch→extract→sanitize→cache→verify→cite. Skipping stages is not allowed.                                                                                                                   | EX-0001-0183-01                                                    |
| BR-0364 | Each pipeline stage MUST produce a defined output or an explicit failure. Failure in one stage MUST NOT silently propagate.                                                                                                                    | EX-0001-0183-02                                                    |
| BR-0365 | When search returns zero results, the agent MUST report the searched queries and MUST NOT generate fictional citations.                                                                                                                        | EX-0001-0183-03                                                    |
| BR-0366 | MCP configuration MUST support both stdio and HTTP transport modes. SSE transport is deprecated and MUST NOT be used.                                                                                                                          | EX-0001-0184-01, EX-0001-0184-02, EX-0001-0184-07                  |
| BR-0367 | Agent MUST detect MCP server crash within 10 seconds and initiate fallback to built-in tools.                                                                                                                                                  | EX-0001-0184-03                                                    |
| BR-0368 | Agent MUST respect retry-after header values. Agent MUST NOT exceed API provider rate limits after initial 429 detection.                                                                                                                      | EX-0001-0184-04                                                    |
| BR-0369 | SKILL.md MUST be loaded metadata-first (YAML frontmatter only). Full body MUST be deferred until task execution begins. Invalid YAML frontmatter reports a parse error and activates the documented default research behavior until corrected. | EX-0001-0185-01, EX-0001-0185-02                                   |
| BR-0370 | Sanitizer MUST remove: (a) control characters, (b) aria-hidden elements, (c) display:none elements. MUST NOT use ML-based detection.                                                                                                           | EX-0001-0186-01, EX-0001-0186-02, EX-0001-0186-03, EX-0001-0186-05 |
| BR-0371 | Sanitizer MUST be stateless. Same input MUST produce identical output on repeated invocations.                                                                                                                                                 | EX-0001-0186-04                                                    |
| BR-0372 | All network access MUST be denied by default. Only explicitly allowlisted domains are permitted.                                                                                                                                               | EX-0001-0187-01, EX-0001-0187-03, EX-0001-0187-04                  |
| BR-0373 | Redirect targets MUST be validated against the allowlist at each redirect hop. Non-allowlisted redirect target MUST be blocked.                                                                                                                | EX-0001-0187-02, EX-0001-0187-05                                   |
| BR-0374 | Research logs MUST NOT contain API keys, credentials, or other secrets, even if present in raw fetched content.                                                                                                                                | EX-0001-0188-01                                                    |
| BR-0375 | Research session log MUST contain: search queries, fetched URLs, content hashes, sanitization events, verification results, final citations.                                                                                                   | EX-0001-0188-02                                                    |
| BR-0376 | Evaluation framework MUST define metrics (citation precision, coverage, freshness, security hygiene) without mandating a specific evaluation tool.                                                                                             | EX-0001-0189-01                                                    |
| BR-0377 | HITL gates MUST use risk-based granularity: auto-approve low-risk, gate high-risk only. Per-fetch approval is prohibited.                                                                                                                      | EX-0001-0190-01, EX-0001-0190-02                                   |
| BR-0378 | Security-critical HITL gates MUST NOT be bypassable by --yolo or similar flags.                                                                                                                                                                | EX-0001-0190-03                                                    |
| BR-0379 | Cache key MUST be hash(URL+etag). Both raw and cleaned content MUST be stored. Default staleness threshold is 24 hours, configurable.                                                                                                          | EX-0001-0183-04, EX-0001-0183-05, EX-0001-0183-07                  |
| BR-0380 | Research sub-agents MUST use conservative defaults: max_threads=2, max_depth=2. Explicit opt-in required for higher values.                                                                                                                    | EX-0001-0183-06                                                    |
| BR-0381 | MCP configuration templates MUST be valid for at least 2 of 3 major CLI agents without modification.                                                                                                                                           | EX-0001-0184-05                                                    |
| BR-0382 | Configuration MUST document both hosted URL and local npx deployment modes. Local deployment MUST be recommended for sensitive environments.                                                                                                   | EX-0001-0184-06                                                    |
