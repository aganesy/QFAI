# 10_Policy

## Security Policies

| POL-ID | Policy | Rationale | Enforcement |
|--------|--------|-----------|-------------|
| POL-S001 | Web content is DATA, not INSTRUCTIONS | Prevents indirect prompt injection attacks (OWASP LLM Top 10) | Enforced in AGENTS.md template, SKILL.md pipeline, and sanitization stage |
| POL-S002 | Default-deny for network access | Minimizes attack surface from untrusted web content | Sandbox configuration templates set deny-all as baseline |
| POL-S003 | API keys must not appear in agent output or logs | Prevents credential leakage through research artifacts | Log sanitization filters; environment variable isolation |
| POL-S004 | --yolo / --allow-all is prohibited in production and untrusted repositories | Prevents blanket permission bypass | Documented in AGENTS.md; configurable enforcement via hooks |
| POL-S005 | Redirect following must respect allowlists | Prevents allowlist bypass via open redirects | Fetch stage validates each redirect target against allowlist |

## Operational Policies

| POL-ID | Policy | Rationale | Enforcement |
|--------|--------|-----------|-------------|
| POL-O001 | Cached/indexed results preferred over live access by default | Reduces cost, latency, and exposure to malicious live content | Default configuration sets web_search=cached equivalent |
| POL-O002 | Rate limit headers must be respected without exception | Prevents API provider bans and ensures fair usage | Pipeline rate limit handler parses and obeys all rate limit headers |
| POL-O003 | Every research session must produce an audit log | Enables post-incident investigation and quality improvement | Log schema validation in observability layer |
| POL-O004 | MCP server processes must be monitored for crashes | Prevents silent research failures | Health check interval in MCP integration templates |

## Quality Policies

| POL-ID | Policy | Rationale | Enforcement |
|--------|--------|-----------|-------------|
| POL-Q001 | Research conclusions must cite sources with URLs | Traceability and verifiability of web research | Citation requirement in SKILL.md pipeline and eval metrics |
| POL-Q002 | Cross-verification required for high-impact conclusions | Reduces single-source bias and misinformation risk | Verify stage in pipeline requires 2+ confirming sources for high-risk claims |
| POL-Q003 | Source priority: official docs > standards > reputable blogs | Establishes quality hierarchy for conflicting information | Documented in SKILL.md ranking stage |

## Compliance Policies

| POL-ID | Policy | Rationale | Enforcement |
|--------|--------|-----------|-------------|
| POL-C001 | Prompt injection defenses must address OWASP LLM Top 10 2025 | Industry standard compliance | Documented mitigation mapping in security specification |
| POL-C002 | Fetched content cache must have configurable TTL and purge | Data retention compliance | Cache configuration schema includes TTL and purge settings |
