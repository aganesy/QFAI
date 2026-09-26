# 02 User Stories

## US Catalog

- US-0016-0001: Standard Research Pipeline Execution
- US-0016-0002: MCP Server Integration for Web Research
- US-0016-0003: Research Skill Packaging
- US-0016-0004: Prompt Injection Defense
- US-0016-0005: Domain and URL Allowlisting
- US-0016-0006: Research Observability
- US-0016-0007: Evaluation Harness for Research Quality
- US-0016-0008: Human-in-the-Loop Review Gates

## US-0016-0001: Standard Research Pipeline Execution

- Parent: CAP-0016
- Goal: Developer wants CLI agent to follow standardized research pipeline (search→rank→fetch→extract→sanitize→cache→verify→cite) for reliable, traceable, reproducible web research results
- Non-goals: Custom pipeline stage ordering, non-web research tasks
- Notes: Maps to REQ-0001. Pipeline stages are fixed; MCP tools are interchangeable per stage.

## US-0016-0002: MCP Server Integration for Web Research

- Parent: CAP-0016
- Goal: Developer wants pre-built MCP integration templates for Brave Search, Firecrawl, and Playwright to enable web research with minimal setup
- Non-goals: Custom MCP server development, non-listed MCP servers
- Notes: Maps to REQ-0002, REQ-0003, REQ-0004. Templates for .mcp.json (Claude), config.toml (Codex), mcp-config.json (Copilot).

## US-0016-0003: Research Skill Packaging

- Parent: CAP-0016
- Goal: Developer wants reusable SKILL.md definitions encoding research procedures with progressive disclosure for consistent research steps
- Non-goals: Runtime skill execution engine, IDE-specific skill integration
- Notes: Maps to REQ-0007, REQ-0008. YAML frontmatter with name, description, allowed-tools.

## US-0016-0004: Prompt Injection Defense

- Parent: CAP-0016
- Goal: Security-conscious developer wants automatic sanitization of web content (hidden char removal, control char stripping, untrusted-data labeling)
- Non-goals: ML-based injection detection, real-time model protection
- Notes: Maps to REQ-0005. Moderate scope: basic + aria-hidden/display:none removal (OQ-0004 resolution).

## US-0016-0005: Domain and URL Allowlisting

- Parent: CAP-0016
- Goal: Team lead wants declarative domain/URL allowlists and denylists in config files so agents only access approved sources
- Non-goals: Dynamic runtime allowlist modification, organizational IAM integration
- Notes: Maps to REQ-0006. Default-deny: all domains blocked unless explicitly allowlisted (NFR-0003).

## US-0016-0006: Research Observability

- Parent: CAP-0016
- Goal: Developer debugging a failed research workflow wants structured logs capturing URLs, extraction results, and verification outcomes
- Non-goals: OTel native integration (deferred OQ-0010), real-time monitoring dashboard
- Notes: Maps to REQ-0010. Structured log schema as universal baseline (OQ-0010 resolution).

## US-0016-0007: Evaluation Harness for Research Quality

- Parent: CAP-0016
- Goal: QA engineer wants evaluation framework with golden tasks measuring citation precision, coverage, freshness, and security hygiene
- Non-goals: Mandating specific eval tool, automated model evaluation
- Notes: Maps to REQ-0011, REQ-0012. Tool-agnostic metrics definition (OQ-0005 resolution).

## US-0016-0008: Human-in-the-Loop Review Gates

- Parent: CAP-0016
- Goal: Developer wants review gates before research conclusions are applied to code (diff+citation review) to maintain control
- Non-goals: Per-fetch approval, fully automated research application
- Notes: Maps to REQ-0013. Risk-based granularity: auto-approve low-risk, gate high-risk (OQ-0008 resolution).
