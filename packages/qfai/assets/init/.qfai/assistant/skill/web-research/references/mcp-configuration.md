# MCP server configuration

How each MCP server this skill uses is started or reached, which credentials it
needs, and where the data goes. Read it before you configure, start or connect
one of them. The configuration templates sit under
`.qfai/assistant/skill/web-research/mcp-templates/`.

## Brave Search MCP

Brave publishes no hosted MCP endpoint. For **HTTP transport** (streamable HTTP),
start Brave's server in HTTP mode yourself, then point the agent at its URL:
with `BRAVE_API_KEY` set in your shell's environment,
`npx -y @brave/brave-search-mcp-server@2.2.0 --transport http` serves
`http://127.0.0.1:8080/mcp`. The server holds the key, and the endpoint
accepts requests without credentials, so keep it bound to loopback.

## Firecrawl MCP

Two separate settings decide where the work happens:

- **Where the MCP server runs.** Local: `npx` launches `firecrawl-mcp` on this
  machine over stdio transport; the `firecrawl/` templates do this. Hosted: the
  agent connects over HTTP transport to Firecrawl's remote MCP server at
  `https://mcp.firecrawl.dev/v2/mcp`; the `firecrawl-hosted/` templates do
  this. They send `Authorization: Bearer <FIRECRAWL_API_KEY>`; never put the key
  in the URL.
- **Where the pages are scraped.** The MCP server sends each URL to the
  Firecrawl API at `FIRECRAWL_API_URL`, and that API fetches the page and
  returns its content. The `firecrawl/` templates set `https://api.firecrawl.dev`,
  Firecrawl's cloud API, which `firecrawl-mcp` 3.11.0, the version they pin,
  also uses when the variable is unset.

Launching the server locally does not keep the data local. Every URL the fetch
stage requests, and the page content returned for it, passes through
Firecrawl's service when either of these holds:

- the agent uses Firecrawl's remote MCP server;
- `FIRECRAWL_API_URL` is unset or points at Firecrawl's cloud API.

For a sensitive environment, keep the local launch and point
`FIRECRAWL_API_URL` at a Firecrawl instance you run yourself:

1. Run Firecrawl by its self-hosting guide; its API listens on port `3002` by
   default.
2. Set `FIRECRAWL_API_URL` in the template to that instance, for example
   `http://localhost:3002`.
3. Add the instance's host to `webResearch.allowlist` in `qfai.config.yaml`.
   The skill's default-deny policy (its Section 3.2) and the shipped sandbox
   template allow network access only to the domains that list names, so an
   unlisted instance is blocked like any other domain.
4. `FIRECRAWL_API_KEY` is optional against a self-hosted instance. Keep it when
   the instance requires authentication; otherwise remove its entry from the
   template.

The hosted templates read `FIRECRAWL_API_KEY` from the environment, so export
it in the shell that starts the agent. When it is unset, Claude Code still
loads the server, sends the unexpanded text `${FIRECRAWL_API_KEY}` and shows a
warning. Copilot CLI documents variable expansion in headers but not what an
unset variable becomes. Firecrawl's hosted server has a rate-limited keyless
tier for `scrape`, `search` and `parse`; whether a request with a missing or
unexpanded key is served by that tier or rejected is not confirmed.
