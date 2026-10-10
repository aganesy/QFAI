# Acceptance Criteria

## Criteria

```gherkin
Feature: MCP Server Integration for Web Research
  # AC-0001-0177-01
  Scenario: Brave Search MCP integration
    Given a QFAI MCP template for Brave Search
    When the developer supplies a valid API key through the BRAVE_API_KEY environment variable
    Then the template starts the Brave Search MCP server with that key
    And the search stage of the research pipeline issues its queries through that server

  # AC-0001-0177-02
  Scenario: MCP server crashes mid-operation
    Given a configured MCP server processing a request
    When the MCP server process crashes
    Then the agent detects the failure within 10 seconds
    And the agent falls back to built-in search tools
    And the agent reports MCP unavailability to the user

  # AC-0001-0177-03
  Scenario: MCP returns rate limit response
    Given an MCP server processing search requests
    When the server returns HTTP 429 with retry-after header
    Then the agent respects the backoff delay
    And the agent retries after the specified delay
    And the rate limit event is logged

  # AC-0001-0177-04
  Scenario: MCP template works for multiple CLI agents
    Given MCP configuration templates for search/extract/browser
    When templates are validated against Claude Code, Codex CLI, and Copilot CLI formats
    Then at least 2 of 3 agent formats are valid without modification
```
