# Acceptance Criteria

## Criteria

```gherkin
Feature: MCP Server Integration for Web Research

# AC-0001-0184-01
# Parent: US-0001-0184
Scenario: Brave Search MCP integration
  Given a QFAI MCP template for Brave Search
  When the developer configures the template with a valid API key
  Then the MCP server responds to search queries
  And results flow into the research pipeline

# AC-0001-0184-02
# Parent: US-0001-0184
Scenario: MCP server crashes mid-operation
  Given a configured MCP server processing a request
  When the MCP server process crashes
  Then the agent detects the failure within 10 seconds
  And the agent falls back to built-in search tools
  And the agent reports MCP unavailability to the user

# AC-0001-0184-03
# Parent: US-0001-0184
Scenario: MCP returns rate limit response
  Given an MCP server processing search requests
  When the server returns HTTP 429 with retry-after header
  Then the agent respects the backoff delay
  And the agent retries after the specified delay
  And the rate limit event is logged

# AC-0001-0184-04
# Parent: US-0001-0184
Scenario: MCP template works for multiple CLI agents
  Given MCP configuration templates for search/extract/browser
  When templates are validated against Claude Code, Codex CLI, and Copilot CLI formats
  Then at least 2 of 3 agent formats are valid without modification
```
