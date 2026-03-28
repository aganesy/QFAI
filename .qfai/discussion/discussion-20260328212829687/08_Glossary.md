# 08_Glossary

## Domain Terms

| Term | Definition | Context |
|------|-----------|---------|
| MCP (Model Context Protocol) | A protocol that enables AI agents to discover and invoke external tools (servers) in a standardized way. MCP servers expose capabilities (search, fetch, browse) that agents consume via stdio or HTTP transport. | Core integration mechanism for extending CLI agent capabilities |
| MCP Server | A process that implements the MCP protocol and exposes one or more tools. Examples: Brave Search MCP (search), Firecrawl MCP (extract), Playwright MCP (browser). | Each research pipeline stage maps to one or more MCP servers |
| Research Pipeline | The standardized sequence of stages for web research: search → rank → fetch → extract → sanitize → cache → verify → cite. | Central concept of v1.8.0; all requirements reference this pipeline |
| Progressive Disclosure | A skill loading strategy where only metadata (name, description) is loaded initially; the full skill body is loaded only when the skill is activated. Reduces context window consumption. | Applied to SKILL.md loading in Codex CLI and Copilot CLI |
| SKILL.md | A markdown file with YAML frontmatter defining a reusable agent procedure. Contains name, description, allowed-tools, and step-by-step instructions. | Format for packaging research procedures |
| AGENTS.md | A project-level markdown file providing agent-specific instructions (setup, testing, conventions, boundaries). Standardized by Linux Foundation AAIF (donated by OpenAI). | Used to declare web research policies per project |
| Prompt Injection (Indirect) | An attack where malicious instructions are embedded in external data (web pages, documents) that an LLM processes, causing unintended behavior. OWASP Top 10 for LLM 2025 high-priority category. | Primary security threat for web research features |
| Sanitization | The process of removing potentially malicious content from fetched web data: hidden characters, control characters, DOM-hidden elements, and embedded instructions. | Mandatory pipeline stage between fetch/extract and LLM processing |
| Content Hash | A cryptographic hash of fetched content (typically hash(URL + etag)) used as a cache key and audit identifier. | Used for caching and reproducibility |
| Golden Task | A predefined research task with known-correct expected outcomes (sources, citations, conclusions) used for regression testing of research quality. | Core evaluation mechanism |
| HITL (Human-in-the-Loop) | A workflow pattern where the agent pauses execution at defined gates to request human review and approval before proceeding. | Applied at high-risk research conclusions and domain access decisions |
| Domain Allowlist | A configuration specifying which internet domains the agent is permitted to access. All other domains are denied by default (default-deny posture). | Security control for web research |
| Rate Limit Backoff | A retry strategy where the agent detects rate limiting (HTTP 429 or rate-limit headers) and waits before retrying, typically with exponential delay. | Reliability mechanism for API-dependent research |
| filterMapping | A Copilot CLI MCP output filter configuration. The `hidden_characters` filter removes hidden and control characters from MCP tool output by default. | Reference implementation for sanitization |
| Sandbox | An isolation mechanism restricting agent access to filesystem paths, network domains, and system resources. Configured per CLI agent (Claude Code sandbox, Codex sandbox_mode, Copilot trusted_folders). | Security boundary for agent execution |
| OTel (OpenTelemetry) | An open standard for distributed tracing, metrics, and logging. Copilot CLI supports OTel export natively; other CLIs can integrate via custom hooks. | Observability foundation for research audit |
| Eval Harness | A testing framework that runs agent tasks against expected outcomes and produces quality scores. Examples: promptfoo, OpenAI Agent Evals, Phoenix. | Quality assurance for research pipeline |
