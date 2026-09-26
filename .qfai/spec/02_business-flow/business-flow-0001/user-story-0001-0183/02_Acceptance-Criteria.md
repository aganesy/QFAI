# Acceptance Criteria

## Criteria

```gherkin
Feature: Standard Research Pipeline Execution

# AC-0001-0183-01
# Parent: US-0001-0183
Scenario: Standard research pipeline execution
  Given a CLI agent with configured MCP servers
  When the agent receives a task requiring web research
  Then the agent executes pipeline stages in order: search, rank, fetch, extract, sanitize, cache, verify, cite
  And each stage produces defined outputs
  And a research session log is generated with all mandatory fields

# AC-0001-0183-02
# Parent: US-0001-0183
Scenario: Search returns zero results
  Given a CLI agent with configured MCP servers
  When a search query returns zero results
  Then the agent reports "no web sources found" with searched queries
  And the agent does not hallucinate citations

# AC-0001-0183-03
# Parent: US-0001-0183
Scenario: All fetches fail after search succeeds
  Given a search that returns valid results
  When all fetch attempts fail (timeout/403/500)
  Then the agent reports partial results with failure reasons per URL
  And the agent does not proceed with unverified content
```
