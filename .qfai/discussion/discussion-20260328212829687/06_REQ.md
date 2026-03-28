# 06_REQ

## Functional Requirements

| REQ-ID | Title | Description | Source | Priority |
|--------|-------|-------------|--------|----------|
| REQ-0001 | Standard Research Pipeline | QFAI shall define a standard research pipeline with stages: search, rank, fetch, extract, sanitize, cache, verify, cite. Each stage shall have defined inputs, outputs, and failure modes. | SRC-0001 | Must |
| REQ-0002 | MCP Search Integration | QFAI shall provide configuration templates for integrating Brave Search MCP as the primary search stage tool, supporting stdio and HTTP transport modes. | SRC-0005 | Must |
| REQ-0003 | MCP Extract Integration | QFAI shall provide configuration templates for integrating Firecrawl MCP as the primary fetch/extract stage tool, supporting local (npx) and hosted deployment modes. | SRC-0006 | Must |
| REQ-0004 | MCP Browser Integration | QFAI shall provide configuration templates for integrating Playwright MCP as the browser automation tool for dynamic/JS-heavy sites. | SRC-0007 | Must |
| REQ-0005 | Content Sanitization | QFAI shall define a sanitization stage that strips hidden characters, control characters, and DOM-hidden elements from fetched web content before passing to the LLM. | SRC-0008, SRC-0009 | Must |
| REQ-0006 | Domain Allowlist Config | QFAI shall define a configuration schema for domain/URL allowlists and denylists, applicable across CLI agent permission systems. | SRC-0002, SRC-0003, SRC-0004 | Must |
| REQ-0007 | Research Skill Definition | QFAI shall provide a web research SKILL.md template with YAML frontmatter (name, description, allowed-tools) following progressive disclosure principles. | SRC-0011, SRC-0012 | Must |
| REQ-0008 | AGENTS.md Research Section | QFAI shall define a standard AGENTS.md section for web research policies (permitted source domains, verification requirements, tool selection guidance). | SRC-0010 | Should |
| REQ-0009 | Sub-agent Research Architecture | QFAI shall define a sub-agent architecture separating Researcher (web tools only), Implementer (code tools only), and Verifier (citation check) roles. | SRC-0001 | Should |
| REQ-0010 | Research Session Logging | QFAI shall define a structured log schema capturing: search queries, fetched URLs, content hashes, sanitization events, verification results, and final citations. | SRC-0001 | Must |
| REQ-0011 | Evaluation Metrics | QFAI shall define evaluation metrics: citation precision, coverage, freshness control, and security hygiene, with scoring rubrics. | SRC-0015, SRC-0016 | Should |
| REQ-0012 | Golden Task Structure | QFAI shall define a golden task format for research quality regression testing, including expected sources, expected citations, and grading criteria. | SRC-0015, SRC-0016 | Should |
| REQ-0013 | HITL Review Gate Definition | QFAI shall define review gate trigger conditions (high-risk conclusion, unknown domain access, large crawl initiation) and gate behavior (block until approved/rejected). | SRC-0001 | Must |
| REQ-0014 | Rate Limit Handling | QFAI shall define rate limit handling behavior: detect 429/rate-limit headers, backoff with configurable delay, and log rate limit events. | SRC-0005, SRC-0013 | Must |
| REQ-0015 | Cache Strategy | QFAI shall define a caching strategy: hash(URL+etag) as cache key, store raw and cleaned content, configurable staleness threshold, explicit live/cached mode selection. | SRC-0003 | Should |
| REQ-0016 | MCP Failure Recovery | QFAI shall define MCP failure handling: crash detection, graceful fallback to built-in tools, and user notification of degraded capability. | SRC-0001 | Must |
| REQ-0017 | Cross-Agent Configuration | QFAI shall provide configuration templates compatible with Claude Code (.mcp.json), Codex CLI (config.toml), and Copilot CLI (mcp-config.json). | SRC-0002, SRC-0003, SRC-0004 | Must |
| REQ-0018 | Sandbox Configuration Templates | QFAI shall provide sandbox/permission configuration templates for each CLI agent covering FS restrictions, network restrictions, and tool allowlists. | SRC-0002, SRC-0003, SRC-0004 | Must |
