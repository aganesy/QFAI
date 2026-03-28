# 09_Constraints

## Technical Constraints

| CON-ID | Category | Constraint | Impact | Mitigation |
|--------|----------|-----------|--------|------------|
| CON-T001 | Runtime | MCP servers require Node 18+ (some require Node 22+, e.g., Brave Search MCP) | Limits deployment environments | Document Node version requirements; provide Docker alternatives |
| CON-T002 | Runtime | Playwright MCP requires browser binary (Chromium) | Increases setup complexity and disk usage | Provide headless-only configuration; document Docker option |
| CON-T003 | Architecture | Each CLI agent has different MCP configuration format (.mcp.json / config.toml / mcp-config.json) | Configuration templates must be maintained per agent | Abstract common structure; generate agent-specific configs |
| CON-T004 | Architecture | Progressive disclosure is Codex/Copilot-specific; Claude Code loads skills differently | Skill format must accommodate both approaches | Use YAML frontmatter as common denominator |
| CON-T005 | Integration | Firecrawl hosted MCP URL includes API key in URL path | Key exposure risk in logs/config files | Recommend local npx deployment for sensitive environments |
| CON-T006 | Integration | Apify SSE transport deprecated 2026-04-01 | Apify MCP integration unstable during transition | Defer Apify deep integration to post-v1.8.0 (OOS-007) |

## Operational Constraints

| CON-ID | Category | Constraint | Impact | Mitigation |
|--------|----------|-----------|--------|------------|
| CON-O001 | Network | Enterprise environments may use HTTP proxy, custom CA, or mTLS | MCP servers and web fetches may fail without proxy config | Document HTTPS_PROXY, NODE_EXTRA_CA_CERTS, mTLS env vars |
| CON-O002 | Cost | Brave Search API, Firecrawl API have usage-based pricing | Uncontrolled research can generate unexpected costs | Default to cached/offline mode; require explicit opt-in for live search |
| CON-O003 | Cost | Subagent parallelization multiplies API calls and LLM tokens | Cost scaling with research depth | Set max_threads/max_depth limits in sub-agent configuration |
| CON-O004 | Availability | External MCP server dependencies (Brave, Firecrawl) may have downtime | Research pipeline fails if primary MCP is unavailable | Define fallback chain: MCP → built-in tool → manual |

## Legal/Compliance Constraints

| CON-ID | Category | Constraint | Impact | Mitigation |
|--------|----------|-----------|--------|------------|
| CON-L001 | Compliance | OWASP Top 10 for LLM 2025 requires prompt injection mitigation | Must implement and document injection defenses | Sanitization layer + security hygiene metrics |
| CON-L002 | Data | Fetched web content may contain PII or copyrighted material | Data handling must comply with local regulations | Content is ephemeral (not persisted beyond cache TTL); document data flow |
| CON-L003 | API Terms | Google Custom Search JSON API unavailable to new customers (migration by 2027-01-01) | Cannot recommend Google CSE as search backend | Use Brave Search as primary recommendation |

## Deadline Constraints

| CON-ID | Category | Constraint | Impact | Mitigation |
|--------|----------|-----------|--------|------------|
| CON-D001 | Timeline | v1.8.0 delivery within standard QFAI release cycle | Scope must fit single version increment | Phased delivery (pipeline+security → skills+eval → HITL+docs) |
