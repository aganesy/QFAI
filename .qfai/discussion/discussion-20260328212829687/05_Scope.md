# 05_Scope

## In Scope

### Core Pipeline
- SCO-001: Define standard research pipeline stages (search→rank→fetch→extract→sanitize→cache→verify→cite)
- SCO-002: Implement pipeline as QFAI skill definitions with progressive disclosure
- SCO-003: Define pipeline stage interfaces for MCP tool interchangeability

### MCP Integration
- SCO-004: Brave Search MCP integration template (.mcp.json / config.toml / mcp-config.json)
- SCO-005: Firecrawl MCP integration template (local npx and hosted URL)
- SCO-006: Playwright MCP integration template (multi-CLI support)
- SCO-007: MCP failure handling (crash detection, rate limit backoff, auth error reporting)

### Security Hardening
- SCO-008: Content sanitization layer (hidden character removal, control character stripping)
- SCO-009: Domain/URL allowlist and denylist configuration schema
- SCO-010: Prompt injection defense guidelines (web content = data, not instructions)
- SCO-011: Sandbox configuration templates (FS/network restrictions per CLI agent)

### Skills & Reproducibility
- SCO-012: Web research SKILL.md template with YAML frontmatter
- SCO-013: AGENTS.md web research section template (permitted sources, verification rules)
- SCO-014: Sub-agent architecture for research/implementation separation

### Observability & Evaluation
- SCO-015: Structured research log schema (queries, URLs, hashes, verification, citations)
- SCO-016: Evaluation metrics definition (citation precision, coverage, freshness, security hygiene)
- SCO-017: Golden task structure for regression testing

### HITL
- SCO-018: Review gate definitions (pre-code-change, pre-domain-access, pre-large-crawl)
- SCO-019: HITL gate bypass prevention (security-critical gates immune to --yolo)

## Out of Scope

- OOS-001: Custom MCP server development (use existing open-source/vendor servers)
- OOS-002: LLM model selection, fine-tuning, or model-specific prompt engineering
- OOS-003: GUI/IDE-specific implementations (CLI-only focus for v1.8.0)
- OOS-004: RAG infrastructure (vector databases, embedding stores, retrieval systems)
- OOS-005: Organizational IAM/SSO integration
- OOS-006: Billing/cost management for external API services
- OOS-007: Apify MCP deep integration (SSE deprecation risk, defer to post-v1.8.0)

## Success Criteria

- SUC-001: All 8 user stories (US-WR-001 through US-WR-008) have acceptance criteria and test cases
- SUC-002: MCP integration templates validated against at least 2 of 3 major CLI agents
- SUC-003: Sanitization layer blocks 100% of known prompt injection test vectors
- SUC-004: Evaluation harness runs with at least 5 golden tasks
- SUC-005: Zero open OQs at discussion exit
