# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0027-0001: Pipeline completes all stages successfully
Scenario: Standard research pipeline execution
  Given a CLI agent with configured MCP servers
  When the agent receives a task requiring web research
  Then the agent executes pipeline stages in order: search, rank, fetch, extract, sanitize, cache, verify, cite
  And each stage produces defined outputs
  And a research session log is generated with all mandatory fields

# AC-0027-0002: Pipeline handles search failure gracefully
Scenario: Search returns zero results
  Given a CLI agent with configured MCP servers
  When a search query returns zero results
  Then the agent reports "no web sources found" with searched queries
  And the agent does not hallucinate citations

# AC-0027-0003: Pipeline handles fetch failure gracefully
Scenario: All fetches fail after search succeeds
  Given a search that returns valid results
  When all fetch attempts fail (timeout/403/500)
  Then the agent reports partial results with failure reasons per URL
  And the agent does not proceed with unverified content

# AC-0027-0004: MCP server integration via templates
Scenario: Brave Search MCP integration
  Given a QFAI MCP template for Brave Search
  When the developer configures the template with a valid API key
  Then the MCP server responds to search queries
  And results flow into the research pipeline

# AC-0027-0005: MCP server crash detection and fallback
Scenario: MCP server crashes mid-operation
  Given a configured MCP server processing a request
  When the MCP server process crashes
  Then the agent detects the failure within 10 seconds
  And the agent falls back to built-in search tools
  And the agent reports MCP unavailability to the user

# AC-0027-0006: MCP rate limit handling
Scenario: MCP returns rate limit response
  Given an MCP server processing search requests
  When the server returns HTTP 429 with retry-after header
  Then the agent respects the backoff delay
  And the agent retries after the specified delay
  And the rate limit event is logged

# AC-0027-0007: Research skill progressive disclosure
Scenario: SKILL.md loading with progressive disclosure
  Given a valid SKILL.md with YAML frontmatter
  When the agent loads the skill
  Then only metadata (name, description, allowed-tools) is read initially
  And the full body is loaded only when the research task begins

# AC-0027-0008: Invalid SKILL.md handling
Scenario: SKILL.md with invalid frontmatter
  Given a SKILL.md with malformed YAML frontmatter
  When the agent attempts to load the skill
  Then the agent reports a parse error with details
  And the agent falls back to default research behavior

# AC-0027-0009: Content sanitization blocks injection
Scenario: Prompt injection in fetched web content
  Given a fetched web page containing hidden text with injection instructions
  When the content passes through the sanitization stage
  Then hidden text (aria-hidden, display:none) is stripped
  And control characters are removed
  And the sanitized content is safe for LLM processing

# AC-0027-0010: Legitimate content passes sanitization
Scenario: Normal documentation passes sanitization
  Given a fetched web page containing standard documentation text
  When the content passes through the sanitization stage
  Then the documentation content passes through cleanly
  And no legitimate content is lost

# AC-0027-0011: Domain allowlist enforcement
Scenario: Fetch from allowlisted domain succeeds
  Given a domain allowlist containing "docs.python.org"
  When the agent attempts to fetch from docs.python.org
  Then the fetch succeeds

# AC-0027-0012: Domain denylist enforcement
Scenario: Fetch from non-allowlisted domain is blocked
  Given a domain allowlist that does not contain "malicious-site.com"
  When the agent attempts to fetch from malicious-site.com
  Then the fetch is blocked
  And the blocked attempt is logged

# AC-0027-0013: Redirect to non-allowlisted domain is blocked
Scenario: Redirect chain crosses allowlist boundary
  Given a fetch from an allowlisted domain
  When the response redirects to a non-allowlisted domain
  Then the fetch is blocked at the redirect target
  And the redirect chain is logged

# AC-0027-0014: Structured research log completeness
Scenario: Research session produces complete structured log
  Given a completed research session
  When the session log is generated
  Then it contains: search queries, fetched URLs, content hashes, sanitization events, verification results, and citations
  And no API keys or credentials appear in the log

# AC-0027-0015: Evaluation golden task execution
Scenario: Golden task evaluation with expected outcome
  Given a golden task with expected sources and citations
  When the evaluation harness runs the task
  Then citation precision, coverage, freshness, and security hygiene are scored
  And results are compared against expected grading criteria

# AC-0027-0016: HITL gate triggers on high-risk conclusion
Scenario: High-risk research triggers human review
  Given a research conclusion flagged as high-risk
  When the HITL gate evaluates the risk level
  Then the gate blocks application until human review
  And the developer sees diff + citations for review

# AC-0027-0017: HITL gate approval flow
Scenario: Developer approves research at HITL gate
  Given a HITL gate blocking a research conclusion
  When the developer reviews and approves
  Then the research result is applied to code
  And the approval is logged

# AC-0027-0018: HITL gate rejection flow
Scenario: Developer rejects research at HITL gate
  Given a HITL gate blocking a research conclusion
  When the developer reviews and rejects
  Then the research result is NOT applied
  And the rejection reason is logged

# AC-0027-0019: Cross-agent configuration compatibility
Scenario: MCP template works for multiple CLI agents
  Given MCP configuration templates for search/extract/browser
  When templates are validated against Claude Code, Codex CLI, and Copilot CLI formats
  Then at least 2 of 3 agent formats are valid without modification

# AC-0027-0020: Sandbox default-deny configuration
Scenario: Sandbox restricts unauthorized access
  Given a sandbox configuration with default-deny network policy
  When the agent attempts to access a domain not in the allowlist
  Then the access is denied
  And the denial event is logged
```

## AC Catalog (optional)

| AC-ID        | Title                            | Notes                          | Priority |
| ------------ | -------------------------------- | ------------------------------ | -------- |
| AC-0027-0001 | Pipeline completes all stages    | Happy path, US-0027-0001       | Must     |
| AC-0027-0002 | Pipeline handles search failure  | Negative path, US-0027-0001    | Must     |
| AC-0027-0003 | Pipeline handles fetch failure   | Edge case, US-0027-0001        | Must     |
| AC-0027-0004 | MCP server integration           | Happy path, US-0027-0002       | Must     |
| AC-0027-0005 | MCP crash detection and fallback | Negative path, US-0027-0002    | Must     |
| AC-0027-0006 | MCP rate limit handling          | Edge case, US-0027-0002        | Must     |
| AC-0027-0007 | Skill progressive disclosure     | Happy path, US-0027-0003       | Must     |
| AC-0027-0008 | Invalid SKILL.md handling        | Negative path, US-0027-0003    | Should   |
| AC-0027-0009 | Sanitization blocks injection    | Happy path, US-0027-0004       | Must     |
| AC-0027-0010 | Legitimate content passes        | Negative path, US-0027-0004    | Must     |
| AC-0027-0011 | Allowlisted domain succeeds      | Happy path, US-0027-0005       | Must     |
| AC-0027-0012 | Non-allowlisted domain blocked   | Negative path, US-0027-0005    | Must     |
| AC-0027-0013 | Redirect crosses allowlist       | Edge case, US-0027-0005        | Must     |
| AC-0027-0014 | Structured log completeness      | Happy path, US-0027-0006       | Must     |
| AC-0027-0015 | Golden task evaluation           | Happy path, US-0027-0007       | Should   |
| AC-0027-0016 | HITL gate triggers on high-risk  | Happy path, US-0027-0008       | Must     |
| AC-0027-0017 | HITL gate approval               | State transition, US-0027-0008 | Must     |
| AC-0027-0018 | HITL gate rejection              | Negative path, US-0027-0008    | Must     |
| AC-0027-0019 | Cross-agent config compatibility | Happy path, US-0027-0002       | Must     |
| AC-0027-0020 | Sandbox default-deny             | Happy path, US-0027-0005       | Must     |
