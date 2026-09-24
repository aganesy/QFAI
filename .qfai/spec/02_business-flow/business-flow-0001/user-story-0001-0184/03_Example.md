# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                   | Expected                                                                                                      |
| --------------- | --------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| EX-0001-0184-01 | AC-0001-0184-01 | Brave Search MCP configured with stdio transport in .mcp.json                           | MCP server starts via stdio, responds to search queries, results flow into pipeline                           |
| EX-0001-0184-02 | AC-0001-0184-01 | Brave Search MCP configured with HTTP transport with URL endpoint                       | MCP server connected via HTTP, responds to search queries, results flow into pipeline                         |
| EX-0001-0184-03 | AC-0001-0184-02 | MCP server process crashes (exit code 1) during a search request                        | Agent detects crash within 10s, logs "MCP server crashed (exit 1)", switches to built-in web_search           |
| EX-0001-0184-04 | AC-0001-0184-03 | MCP server returns HTTP 429 with Retry-After: 30                                        | Agent waits 30 seconds, retries the request, logs "Rate limited, retrying after 30s"                          |
| EX-0001-0184-05 | AC-0001-0184-04 | MCP template for Brave Search tested against Claude (.mcp.json) and Codex (config.toml) | Both configs parse successfully; MCP server starts and responds in both environments                          |
| EX-0001-0184-06 | AC-0001-0184-01 | Developer in enterprise environment with sensitive data                                 | Documentation shows both hosted URL and npx modes; recommendation: "Use local npx for sensitive environments" |
